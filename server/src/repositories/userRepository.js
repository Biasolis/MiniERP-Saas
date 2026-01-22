// server/src/repositories/userRepository.js
const db = require('../config/db');

class UserRepository {
    // Modificado para aceitar 'client' (transação) e novos campos SaaS
    async create(client, { companyId, name, email, passwordHash, cpf, role }) {
        const query = `
            INSERT INTO users (company_id, name, email, password_hash, cpf, role, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, true)
            RETURNING id, company_id, name, email, role, created_at;
        `;
        // Default role é ADMIN para quem cria a conta da empresa
        const userRole = role || 'ADMIN';
        const values = [companyId, name, email, passwordHash, cpf, userRole];
        
        // Usa o client da transação se fornecido, senão usa o pool padrão
        const dbExecutor = client || db;
        const result = await dbExecutor.query(query, values);
        return result.rows[0];
    }

    // Busca global (emails são únicos no sistema)
    async findByEmail(email) {
        const query = `
            SELECT u.*, c.plan_tier, c.is_active as company_active 
            FROM users u
            JOIN companies c ON u.company_id = c.id
            WHERE u.email = $1
        `;
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    async findByCPF(cpf) {
        const query = `SELECT id FROM users WHERE cpf = $1`;
        const result = await db.query(query, [cpf]);
        return result.rows[0];
    }

    // Busca segura por Tenant
    async findById(id, companyId) {
        const query = `
            SELECT id, name, email, role, cpf 
            FROM users 
            WHERE id = $1 AND company_id = $2
        `;
        const result = await db.query(query, [id, companyId]);
        return result.rows[0];
    }
}

module.exports = new UserRepository();