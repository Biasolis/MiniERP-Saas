const db = require('../config/db');

class InvestmentRepository {
    async create({ userId, name, type, investedAmount, currentAmount, interestRate, startDate, dueDate }) {
        const query = `
            INSERT INTO investments 
            (user_id, name, type, invested_amount, current_amount, interest_rate, start_date, due_date)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const values = [
            userId, 
            name, 
            type, 
            investedAmount, 
            currentAmount || investedAmount, // Se não passar atual, assume igual ao investido
            interestRate, 
            startDate, 
            dueDate
        ];
        
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async findAllByUserId(userId) {
        const query = `
            SELECT 
                *,
                (current_amount - invested_amount) as profit,
                CASE 
                    WHEN invested_amount > 0 THEN ((current_amount - invested_amount) / invested_amount) * 100 
                    ELSE 0 
                END as profitability_percentage
            FROM investments
            WHERE user_id = $1 AND is_active = TRUE
            ORDER BY current_amount DESC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    async getSummary(userId) {
        const query = `
            SELECT 
                COALESCE(SUM(invested_amount), 0) as total_invested,
                COALESCE(SUM(current_amount), 0) as total_current
            FROM investments
            WHERE user_id = $1 AND is_active = TRUE
        `;
        const result = await db.query(query, [userId]);
        return result.rows[0];
    }

    async updateValue(id, userId, newAmount) {
        const query = `
            UPDATE investments 
            SET current_amount = $1, updated_at = NOW()
            WHERE id = $2 AND user_id = $3
            RETURNING *
        `;
        const result = await db.query(query, [newAmount, id, userId]);
        return result.rows[0];
    }

    async delete(id, userId) {
        const query = `DELETE FROM investments WHERE id = $1 AND user_id = $2 RETURNING id`;
        const result = await db.query(query, [id, userId]);
        return result.rows[0];
    }
}

module.exports = new InvestmentRepository();