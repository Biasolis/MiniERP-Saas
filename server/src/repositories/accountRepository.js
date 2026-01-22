// server/src/repositories/accountRepository.js
const db = require('../config/db');

class AccountRepository {
    async create({ companyId, name, type, initialBalance }) {
        const query = `
            INSERT INTO accounts (company_id, name, type, initial_balance, current_balance)
            VALUES ($1, $2, $3, $4, $4) -- Saldo atual começa igual ao inicial
            RETURNING *;
        `;
        const values = [companyId, name, type, initialBalance || 0];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async findByCompanyId(companyId) {
        const query = `
            SELECT * FROM accounts 
            WHERE company_id = $1 AND is_active = true
            ORDER BY name ASC;
        `;
        const result = await db.query(query, [companyId]);
        return result.rows;
    }

    async findById(id, companyId) {
        const query = `
            SELECT * FROM accounts 
            WHERE id = $1 AND company_id = $2;
        `;
        const result = await db.query(query, [id, companyId]);
        return result.rows[0];
    }

    // Atualiza saldo (Chamado internamente ao criar/editar transação)
    // Nota: Em um sistema real, isso seria feito via Trigger ou Evento para evitar inconsistência
    async updateBalance(client, id, amount) {
        const query = `
            UPDATE accounts 
            SET current_balance = current_balance + $1 
            WHERE id = $2
            RETURNING current_balance;
        `;
        // Usa o client da transação se fornecido
        const executor = client || db;
        await executor.query(query, [amount, id]);
    }
}

module.exports = new AccountRepository();