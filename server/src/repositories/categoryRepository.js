const db = require('../config/db');

class CategoryRepository {
    async findAllByUserId(userId) {
        const query = `
            SELECT id, name, type, color 
            FROM categories 
            WHERE user_id = $1 
            ORDER BY type, name ASC
        `;
        const result = await db.query(query, [userId]);
        return result.rows;
    }

    // --- MÉTODOS ADICIONADOS ---
    
    async create({ userId, name, type, color }) {
        const query = `
            INSERT INTO categories (user_id, name, type, color)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const result = await db.query(query, [userId, name, type, color]);
        return result.rows[0];
    }

    async delete(id, userId) {
        // Exclui a categoria. 
        // OBS: Como temos "ON DELETE SET NULL" nas transações (database/init.sql), 
        // as transações antigas ficarão sem categoria, não serão apagadas. Isso é seguro.
        const query = `DELETE FROM categories WHERE id = $1 AND user_id = $2 RETURNING id`;
        const result = await db.query(query, [id, userId]);
        return result.rows[0];
    }

    async createMany(userId, categories) {
        const results = [];
        for (const cat of categories) {
            const query = `
                INSERT INTO categories (user_id, name, type, color)
                VALUES ($1, $2, $3, $4) RETURNING *
            `;
            const res = await db.query(query, [userId, cat.name, cat.type, cat.color]);
            results.push(res.rows[0]);
        }
        return results;
    }
}

module.exports = new CategoryRepository();