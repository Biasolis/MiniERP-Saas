const { query } = require('../config/db');

// ==========================================
// 1. DASHBOARD COMPLETO (Stats, Gráficos, OS)
// ==========================================
const getDashboardStats = async (req, res) => {
    try {
        // --- CORREÇÃO DE SEGURANÇA E COMPATIBILIDADE ---
        // Tenta obter o ID de ambas as formas (snake_case do banco ou camelCase do token novo)
        const tenantId = req.user.tenant_id || req.user.tenantId;

        if (!tenantId) {
            console.error("ERRO CRÍTICO: Tenant ID não encontrado na sessão.");
            return res.status(400).json({ error: "Sessão inválida: Tenant ID ausente." });
        }
        // ------------------------------------------------

        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0,0,0,0);

        // --- QUERY 1: TOTAIS DO MÊS ---
        const totalsQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
            FROM transactions 
            WHERE tenant_id = $1 AND date >= $2 AND status = 'completed'
        `;

        // --- QUERY 2: GRÁFICO FINANCEIRO (Últimos 6 meses) ---
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

        // --- QUERY 3: GRÁFICO OS (Últimos 7 dias) ---
        const osDailyQuery = `
            SELECT 
                TO_CHAR(created_at, 'DD/MM') as label,
                COUNT(*) as count
            FROM service_orders
            WHERE tenant_id = $1 
              AND created_at >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY 1, created_at::DATE
            ORDER BY created_at::DATE ASC
        `;

        // --- QUERY 4: STATUS DAS OS (Pizza) ---
        const osStatusQuery = `
            SELECT status, COUNT(*) as count 
            FROM service_orders 
            WHERE tenant_id = $1 
            GROUP BY status
        `;

        // --- QUERY 5: ALERTA ESTOQUE ---
        const lowStockQuery = `
            SELECT id, name, stock, min_stock 
            FROM products 
            WHERE tenant_id = $1 AND stock <= min_stock
            ORDER BY stock ASC LIMIT 5
        `;

        // --- QUERY 6: ÚLTIMAS TRANSAÇÕES ---
        const recentTransQuery = `
            SELECT id, description, amount, type, date, status
            FROM transactions
            WHERE tenant_id = $1
            ORDER BY date DESC LIMIT 5
        `;

        // Executa todas as queries em paralelo para performance
        const [totals, financeChart, osDaily, osStatus, lowStock, recentTrans] = await Promise.all([
            query(totalsQuery, [tenantId, startOfMonth]),
            query(financeChartQuery, [tenantId]),
            query(osDailyQuery, [tenantId]),
            query(osStatusQuery, [tenantId]),
            query(lowStockQuery, [tenantId]),
            query(recentTransQuery, [tenantId])
        ]);

        // Processamento dos dados para o Frontend
        const income = parseFloat(totals.rows[0]?.income || 0);
        const expense = parseFloat(totals.rows[0]?.expense || 0);

        // Mapeamento de Status OS (Tradução)
        const osStatusMap = {
            'open': 'Abertas',
            'in_progress': 'Em Andamento',
            'completed': 'Finalizadas',
            'waiting': 'Aguardando',
            'canceled': 'Canceladas'
        };

        const osChartData = osStatus.rows.map(r => ({
            name: osStatusMap[r.status] || r.status,
            value: parseInt(r.count),
            statusKey: r.status
        }));

        const totalOS = osStatus.rows.reduce((acc, r) => acc + parseInt(r.count), 0);

        return res.json({
            financial: {
                income,
                expense,
                balance: income - expense,
                history: financeChart.rows.map(r => ({
                    label: r.label,
                    Receitas: parseFloat(r.income),
                    Despesas: parseFloat(r.expense)
                }))
            },
            os: {
                total: totalOS,
                statusData: osChartData,
                dailyData: osDaily.rows.map(r => ({ label: r.label, Qtd: parseInt(r.count) }))
            },
            stock: {
                low: lowStock.rows
            },
            recentTransactions: recentTrans.rows
        });

    } catch (error) {
        console.error('Erro Dashboard Completo:', error);
        return res.status(500).json({ message: 'Erro ao carregar dados do dashboard.' });
    }
};

// ==========================================
// 2. ATIVIDADE RECENTE (Endpoint Leve)
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
        console.error(err);
        res.status(500).json({ error: 'Erro ao carregar atividades' });
    }
};

// ==========================================
// 3. STATS SIMPLES (Topo do Dashboard)
// ==========================================
// Caso você precise de um endpoint rápido apenas para os cards do topo
const getStats = async (req, res) => {
    try {
        const tenantId = req.user.tenant_id || req.user.tenantId;
        
        if (!tenantId) return res.status(400).json({ error: "Tenant ID ausente." });

        const [clients, products, sales] = await Promise.all([
            query('SELECT COUNT(*) FROM clients WHERE tenant_id = $1', [tenantId]),
            query('SELECT COUNT(*) FROM products WHERE tenant_id = $1', [tenantId]),
            query('SELECT SUM(total_amount) FROM sales WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL \'30 days\'', [tenantId])
        ]);

        res.json({
            totalClients: parseInt(clients.rows[0]?.count || 0),
            totalProducts: parseInt(products.rows[0]?.count || 0),
            monthlyRevenue: parseFloat(sales.rows[0]?.sum || 0)
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