const { query } = require('../config/db');

const getDashboardStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
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
        // Agrupa por Mês/Ano
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

        // Executa tudo em paralelo
        const [totals, financeChart, osDaily, osStatus, lowStock, recentTrans] = await Promise.all([
            query(totalsQuery, [tenantId, startOfMonth]),
            query(financeChartQuery, [tenantId]),
            query(osDailyQuery, [tenantId]),
            query(osStatusQuery, [tenantId]),
            query(lowStockQuery, [tenantId]),
            query(recentTransQuery, [tenantId])
        ]);

        // Processamento
        const income = parseFloat(totals.rows[0].income);
        const expense = parseFloat(totals.rows[0].expense);

        // Mapeamento de Status OS
        const osStatusMap = {
            'open': 'Abertas',
            'in_progress': 'Em Andamento',
            'completed': 'Finalizadas',
            'waiting': 'Aguardando'
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
        return res.status(500).json({ message: 'Erro ao carregar dados.' });
    }
};

module.exports = { getDashboardStats };