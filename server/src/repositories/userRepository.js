const db = require('../config/db');

class UserRepository {
    async create({ name, email, passwordHash, cpf, financialGoal }) {
        const query = `
            INSERT INTO users (name, email, password_hash, cpf, financial_goal)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, name, email, cpf, financial_goal, created_at;
        `;
        const values = [name, email, passwordHash, cpf, financialGoal];
        
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async findByEmail(email) {
        const query = `SELECT * FROM users WHERE email = $1`;
        const result = await db.query(query, [email]);
        return result.rows[0];
    }

    async findByCPF(cpf) {
        const query = `SELECT * FROM users WHERE cpf = $1`;
        const result = await db.query(query, [cpf]);
        return result.rows[0];
    }

    async findById(id) {
        const query = `SELECT id, name, email, cpf, financial_goal FROM users WHERE id = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // --- NOVO MÉTODO ---
    async update(id, { name, financialGoal }) {
        const query = `
            UPDATE users 
            SET name = $1, financial_goal = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING id, name, email, cpf, financial_goal;
        `;
        const result = await db.query(query, [name, financialGoal, id]);
        return result.rows[0];
    }
}

module.exports = new UserRepository();