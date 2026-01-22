// server/src/repositories/categoryRepository.js
const db = require('../config/db');

class CategoryRepository {
    async create({ companyId, name, type, color }) {
        const query = `
            INSERT INTO categories (company_id, name, type, color)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        `;
        const values = [companyId, name, type, color];
        const result = await db.query(query, values);
        return result.rows[0];
    }

    async findAll(companyId) {
        // Busca categorias padrão do sistema (se houver) + categorias da empresa
        const query = `
            SELECT * FROM categories 
            WHERE company_id = $1
            ORDER BY name ASC;
        `;
        const result = await db.query(query, [companyId]);
        return result.rows;
    }

    async findById(id, companyId) {
        const query = `SELECT * FROM categories WHERE id = $1 AND company_id = $2`;
        const result = await db.query(query, [id, companyId]);
        return result.rows[0];
    }

    async delete(id, companyId) {
        const query = `DELETE FROM categories WHERE id = $1 AND company_id = $2 RETURNING id`;
        const result = await db.query(query, [id, companyId]);
        return result.rows[0];
    }
}

module.exports = new CategoryRepository();