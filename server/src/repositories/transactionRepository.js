// server/src/repositories/transactionRepository.js
const db = require('../config/db');

class TransactionRepository {
    // Agora aceita companyId, accountId e contactId
    async create({ companyId, userId, accountId, categoryId, contactId, amount, description, date, type }) {
        const client = await db.pool.connect();
        
        try {
            await client.query('BEGIN');

            // 1. Cria a Transação
            // Nota: Se for 'expense', o amount deve vir negativo do frontend ou tratado aqui. 
            // Para simplificar, assumimos que o Controller manda negativo para despesa.
            const query = `
                INSERT INTO transactions 
                (company_id, user_id, account_id, category_id, contact_id, amount, description, transaction_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *;
            `;
            const values = [companyId, userId, accountId, categoryId, contactId, amount, description, date];
            const result = await client.query(query, values);
            const transaction = result.rows[0];

            // 2. Atualiza o Saldo da Conta Bancária vinculada
            // Isso garante que o saldo do banco reflita o lançamento
            const updateAccountQuery = `
                UPDATE accounts 
                SET current_balance = current_balance + $1 
                WHERE id = $2 AND company_id = $3;
            `;
            await client.query(updateAccountQuery, [amount, accountId, companyId]);

            await client.query('COMMIT');
            return transaction;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async findAll({ companyId, startDate, endDate, accountId }) {
        let query = `
            SELECT t.*, 
                   c.name as category_name, c.color as category_color,
                   a.name as account_name,
                   ct.name as contact_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN accounts a ON t.account_id = a.id
            LEFT JOIN contacts ct ON t.contact_id = ct.id
            WHERE t.company_id = $1
        `;
        
        const params = [companyId];
        let paramIndex = 2;

        if (startDate && endDate) {
            query += ` AND t.transaction_date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(startDate, endDate);
            paramIndex += 2;
        }

        if (accountId) {
            query += ` AND t.account_id = $${paramIndex}`;
            params.push(accountId);
        }

        query += ` ORDER BY t.transaction_date DESC, t.created_at DESC`;

        const result = await db.query(query, params);
        return result.rows;
    }

    // Dashboard: Saldo consolidado por Conta
    async getBalancesByAccount(companyId) {
        const query = `
            SELECT id, name, type, current_balance 
            FROM accounts 
            WHERE company_id = $1 AND is_active = true
        `;
        const result = await db.query(query, [companyId]);
        return result.rows;
    }

    // Dashboard: Fluxo de Caixa (Entradas vs Saídas)
    async getCashFlow(companyId, startDate, endDate) {
        const query = `
            SELECT 
                SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_expense
            FROM transactions
            WHERE company_id = $1 
            AND transaction_date BETWEEN $2 AND $3
        `;
        const result = await db.query(query, [companyId, startDate, endDate]);
        return result.rows[0];
    }
}

module.exports = new TransactionRepository();