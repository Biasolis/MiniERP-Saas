// server/src/repositories/companyRepository.js
const db = require('../config/db');

class CompanyRepository {
    // --- Métodos Públicos / Criação ---

    async create(client, { tradeName, legalName, document, themeConfig }) {
        const query = `
            INSERT INTO companies (trade_name, legal_name, document, theme_config, plan_tier)
            VALUES ($1, $2, $3, $4, 'FREE')
            RETURNING id, trade_name, plan_tier;
        `;
        const defaultTheme = { primaryColor: '#000000', logoUrl: null };
        const config = themeConfig || defaultTheme;
        const values = [tradeName, legalName, document, JSON.stringify(config)];
        
        const executor = client || db;
        const result = await executor.query(query, values);
        return result.rows[0];
    }

    async findByDocument(document) {
        const query = `SELECT id FROM companies WHERE document = $1`;
        const result = await db.query(query, [document]);
        return result.rows[0];
    }

    async findById(id) {
        const query = `SELECT * FROM companies WHERE id = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    // --- Métodos Exclusivos do SUPER ADMIN ---

    // Lista todas as empresas com contagem de usuários (Dashboard do Admin)
    async findAllWithStats() {
        const query = `
            SELECT 
                c.id, 
                c.trade_name, 
                c.document, 
                c.plan_tier, 
                c.is_active, 
                c.created_at,
                COUNT(u.id) as total_users
            FROM companies c
            LEFT JOIN users u ON c.id = u.company_id
            GROUP BY c.id
            ORDER BY c.created_at DESC
        `;
        const result = await db.query(query);
        return result.rows;
    }

    // Altera o plano (Free, Pro, Enterprise)
    async updatePlan(id, newPlan) {
        const query = `
            UPDATE companies 
            SET plan_tier = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING id, trade_name, plan_tier
        `;
        const result = await db.query(query, [newPlan, id]);
        return result.rows[0];
    }

    // Bloqueia/Desbloqueia acesso da empresa (Inadimplência)
    async toggleActive(id, isActive) {
        const query = `
            UPDATE companies 
            SET is_active = $1, updated_at = NOW() 
            WHERE id = $2 
            RETURNING id, is_active
        `;
        const result = await db.query(query, [isActive, id]);
        return result.rows[0];
    }
}

module.exports = new CompanyRepository();