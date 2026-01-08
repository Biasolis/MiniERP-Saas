const db = require('../config/db');

class TransactionRepository {
    async create({ userId, categoryId, amount, description, transactionDate }) {
        const query = `
            INSERT INTO transactions (user_id, category_id, amount, description, transaction_date)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [userId, categoryId, amount, description, transactionDate];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async findAllByUserId(userId, limit = 10) {
        const query = `
            SELECT 
                t.id, 
                t.amount, 
                t.description, 
                t.transaction_date,
                c.name as category_name,
                c.color as category_color,
                c.type as type
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
            ORDER BY t.transaction_date DESC
            LIMIT $2
        `;
        const result = await db.query(query, [userId, limit]);
        return result.rows;
    }

    async getDashboardSummary(userId) {
        // Query Agregadora: Calcula Entradas, Saídas e Saldo em uma única ida ao banco
        const query = `
            SELECT 
                COALESCE(SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END), 0) as total_expense
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1
        `;
        const result = await db.query(query, [userId]);
        const { total_income, total_expense } = result.rows[0];
        
        // Conversão de tipos (Postgres retorna SUM como string em alguns drivers, garantimos float)
        const income = parseFloat(total_income);
        const expense = parseFloat(total_expense);
        
        return {
            income,
            expense,
            balance: income - expense
        };
    }

    async getExpensesByCategory(userId) {
        const query = `
            SELECT 
                c.name, 
                c.color, 
                SUM(t.amount) as total
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1 AND c.type = 'expense'
            GROUP BY c.name, c.color
            ORDER BY total DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    async getMonthlyEvolution(userId) {
        // Query complexa para agrupar por mês (YYYY-MM) e pivotar Receita/Despesa
        const query = `
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                SUM(CASE WHEN c.type = 'income' THEN t.amount ELSE 0 END) as income,
                SUM(CASE WHEN c.type = 'expense' THEN t.amount ELSE 0 END) as expense
            FROM transactions t
            JOIN categories c ON t.category_id = c.id
            WHERE t.user_id = $1 
            AND t.transaction_date >= NOW() - INTERVAL '6 months'
            GROUP BY month
            ORDER BY month ASC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }
}

module.exports = new TransactionRepository();