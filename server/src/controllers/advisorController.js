const db = require('../config/db');
const geminiService = require('../services/geminiService');

exports.getInsights = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Buscar Meta Financeira
        const userQuery = await db.query('SELECT financial_goal FROM users WHERE id = $1', [userId]);
        const financialGoal = userQuery.rows[0]?.financial_goal || 0;

        // 2. Buscar Resumo (Income vs Expense)
        // CORREÇÃO: Fazemos JOIN com categories para saber o 'type' (income/expense)
        const summaryQuery = await db.query(`
            SELECT 
                COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) as income,
                COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) as expense
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
        `, [userId]);

        const { income, expense } = summaryQuery.rows[0];
        const balance = Number(income) - Number(expense);

        // 3. Buscar Total Investido
        const investQuery = await db.query(`
            SELECT COALESCE(SUM(invested_amount), 0) as total 
            FROM investments 
            WHERE user_id = $1
        `, [userId]);
        
        const totalInvested = investQuery.rows[0].total;

        // 4. Buscar TOP 3 Despesas por Categoria
        // CORREÇÃO: Usamos c.type = 'expense' em vez de t.type
        const topExpensesQuery = await db.query(`
            SELECT c.name as category, SUM(t.amount) as total
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1 AND c.type = 'expense'
            GROUP BY c.name
            ORDER BY total DESC
            LIMIT 3
        `, [userId]);

        const topExpenses = topExpensesQuery.rows.map(row => ({
            category: row.category,
            total: Number(row.total).toFixed(2)
        }));

        // Monta o objeto de dados para a IA
        const financialData = {
            financialGoal: Number(financialGoal).toFixed(2),
            income: Number(income).toFixed(2),
            expense: Number(expense).toFixed(2),
            balance: balance.toFixed(2),
            totalInvested: Number(totalInvested).toFixed(2),
            topExpenses: topExpenses
        };

        // Chama o serviço do Gemini
        const advice = await geminiService.generateFinancialAdvice(financialData);

        res.json({ advice });

    } catch (error) {
        console.error('Erro no Advisor:', error);
        res.status(500).json({ error: 'Falha ao gerar análise inteligente.' });
    }
};