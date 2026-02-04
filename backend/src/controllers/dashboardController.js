const { query } = require('../config/db');

// ==========================================
// 1. DASHBOARD COMPLETO (Stats, Gráficos, OS, Vendas, Financeiro)
// ==========================================
const getDashboardStats = async (req, res) => {
    try {
        // --- SEGURANÇA E COMPATIBILIDADE ---
        const tenantId = req.user.tenant_id || req.user.tenantId;

        if (!tenantId) {
            console.error("ERRO CRÍTICO: Tenant ID não encontrado na sessão.");
            return res.status(400).json({ error: "Sessão inválida: Tenant ID ausente." });
        }
        // ------------------------------------------------

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        // --- 1. FINANCEIRO (Mês Atual + Saldo Geral) ---
        const financialQuery = `
            SELECT 
                -- Mês Atual
                COALESCE(SUM(CASE WHEN type = 'income' AND date >= $2 THEN amount ELSE 0 END), 0) as month_income,
                COALESCE(SUM(CASE WHEN type = 'expense' AND date >= $2 THEN amount ELSE 0 END), 0) as month_expense,
                -- Total Histórico (Saldo Geral)
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income_all,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense_all
            FROM transactions 
            WHERE tenant_id = $1 AND status = 'completed'
        `;

        // --- 2. GRÁFICO FINANCEIRO (Últimos 6 meses) ---
        const financeChartQuery = `
            SELECT 
                TO_CHAR(date, 'Mon/YY') as label,
                EXTRACT(YEAR FROM date) as year,
                EXTRACT(MONTH FROM date) as month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
                SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
            FROM transactions
            WHERE tenant_id = $1 
              AND date >= date_trunc('month', CURRENT_DATE - INTERVAL '5 months')
              AND status = 'completed'
            GROUP BY 1, 2, 3
            ORDER BY 2, 3 ASC
        `;

        // --- 3. GRÁFICO OS (Diário - 7 dias) ---
        const osDailyQuery = `
            SELECT TO_CHAR(created_at, 'DD/MM') as label, COUNT(*) as count
            FROM service_orders
            WHERE tenant_id = $1 AND created_at >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY 1, created_at::DATE
            ORDER BY created_at::DATE ASC
        `;

        // --- 4. STATUS DAS OS (Pizza) ---
        const osStatusQuery = `SELECT status, COUNT(*) as count FROM service_orders WHERE tenant_id = $1 GROUP BY status`;

        // --- 5. ALERTA ESTOQUE (Top 5 críticos) ---
        // CORREÇÃO: Alterado para usar apenas 'stock' já que 'stock_quantity' não existe
        const lowStockQuery = `
            SELECT id, name, stock, min_stock 
            FROM products 
            WHERE tenant_id = $1 AND stock <= min_stock
            ORDER BY stock ASC LIMIT 5
        `;

        // --- 6. ÚLTIMAS TRANSAÇÕES ---
        const recentTransQuery = `
            SELECT id, description, amount, type, date, status
            FROM transactions
            WHERE tenant_id = $1
            ORDER BY date DESC LIMIT 5
        `;

        // --- 7. VENDAS (Mês Atual) ---
        const salesQuery = `
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total
            FROM sales 
            WHERE tenant_id = $1 AND created_at >= $2
        `;

        // --- 8. ORÇAMENTOS (Quotes) ---
        const quotesQuery = `SELECT status, COUNT(*) as count FROM quotes WHERE tenant_id = $1 GROUP BY status`;

        // --- 9. TICKETS (Suporte) ---
        const ticketsQuery = `SELECT status, COUNT(*) as count FROM tickets WHERE tenant_id = $1 GROUP BY status`;

        // Execução segura das Promises
        const results = await Promise.allSettled([
            query(financialQuery, [tenantId, startOfMonth]),
            query(financeChartQuery, [tenantId]),
            query(osDailyQuery, [tenantId]),
            query(osStatusQuery, [tenantId]),
            query(lowStockQuery, [tenantId]),
            query(recentTransQuery, [tenantId]),
            query(salesQuery, [tenantId, startOfMonth]),
            query(quotesQuery, [tenantId]),
            query(ticketsQuery, [tenantId])
        ]);

        // Helpers para extrair dados
        const getRows = (index) => results[index].status === 'fulfilled' ? results[index].value.rows : [];
        const getFirstRow = (index) => results[index].status === 'fulfilled' ? (results[index].value.rows[0] || {}) : {};

        // Extração
        const finData = getFirstRow(0);
        const financeChartData = getRows(1);
        const osDailyData = getRows(2);
        const osStatusData = getRows(3);
        const lowStockData = getRows(4); // Agora deve funcionar com 'stock'
        const recentTransData = getRows(5);
        const salesData = getFirstRow(6);
        const quotesData = getRows(7);
        const ticketsData = getRows(8);

        // Processamento Financeiro
        const income = parseFloat(finData.month_income || 0);
        const expense = parseFloat(finData.month_expense || 0);
        const totalIncome = parseFloat(finData.total_income_all || 0);
        const totalExpense = parseFloat(finData.total_expense_all || 0);

        // Mapeamentos
        const osStatusMap = { 'open': 'Abertas', 'in_progress': 'Em Andamento', 'completed': 'Finalizadas', 'waiting': 'Aguardando', 'canceled': 'Canceladas', 'pending': 'Pendente', 'approved': 'Aprovado' };
        const ticketColorMap = { 'open': '#3b82f6', 'pending': '#f59e0b', 'solved': '#10b981', 'closed': '#9ca3af' };

        // Retorno JSON
        return res.json({
            financial: {
                income,
                expense,
                balance: income - expense, 
                totalBalance: totalIncome - totalExpense,
                history: financeChartData.map(r => ({
                    label: r.label,
                    Receitas: parseFloat(r.income),
                    Despesas: parseFloat(r.expense)
                }))
            },
            os: {
                total: osStatusData.reduce((acc, r) => acc + parseInt(r.count), 0),
                statusData: osStatusData.map(r => ({
                    name: osStatusMap[r.status] || r.status,
                    value: parseInt(r.count),
                    statusKey: r.status
                })),
                dailyData: osDailyData.map(r => ({ label: r.label, Qtd: parseInt(r.count) }))
            },
            sales: {
                total: parseFloat(salesData.total || 0),
                count: parseInt(salesData.count || 0)
            },
            quotes: quotesData.map(r => ({
                name: osStatusMap[r.status] || r.status,
                value: parseInt(r.count)
            })),
            tickets: ticketsData.map(r => ({
                name: r.status,
                value: parseInt(r.count),
                color: ticketColorMap[r.status] || '#888'
            })),
            stock: {
                low: lowStockData
            },
            recentTransactions: recentTransData
        });

    } catch (error) {
        console.error('Erro Dashboard Completo:', error);
        return res.status(500).json({ message: 'Erro ao carregar dados do dashboard.' });
    }
};

// ==========================================
// 2. ATIVIDADE RECENTE
// ==========================================
const getRecentActivity = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.tenantId;
        if (!tenantId) return res.status(400).json({ error: "Tenant ID ausente." });

        const result = await query(
            `SELECT 'venda' as type, created_at, total_amount as value, id 
             FROM sales WHERE tenant_id = $1 
             ORDER BY created_at DESC LIMIT 5`,
            [tenantId]
        );
        res.json(result.rows);
    } catch (err) {
        res.json([]);
    }
};

// ==========================================
// 3. STATS SIMPLES
// ==========================================
const getStats = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.tenantId;
        if (!tenantId) return res.status(400).json({ error: "Tenant ID ausente." });

        const results = await Promise.allSettled([
            query('SELECT COUNT(*) FROM clients WHERE tenant_id = $1', [tenantId]),
            query('SELECT COUNT(*) FROM products WHERE tenant_id = $1', [tenantId]),
            query('SELECT SUM(total_amount) FROM sales WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL \'30 days\'', [tenantId])
        ]);

        const getVal = (idx, field = 'count') => results[idx].status === 'fulfilled' ? (results[idx].value.rows[0]?.[field] || 0) : 0;

        res.json({
            totalClients: parseInt(getVal(0)),
            totalProducts: parseInt(getVal(1)),
            monthlyRevenue: parseFloat(getVal(2, 'sum'))
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Erro ao carregar stats simples' });
    }
};

module.exports = { 
    getDashboardStats,
    getRecentActivity,
    getStats 
};