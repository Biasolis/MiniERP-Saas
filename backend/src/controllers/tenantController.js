const { query } = require('../config/db');
const { hashPassword } = require('../utils/security');

// ==========================================
// 1. CONFIGURAÇÕES DA EMPRESA (DADOS & IMPRESSÃO)
// ==========================================
const getTenantSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // Busca dados completos incluindo campos novos de impressão
        const sql = `
            SELECT 
                id, name, slug, closing_day, plan_tier, max_users, active,
                primary_color, secondary_color,
                address, phone, document, email_contact, website, footer_message
            FROM tenants 
            WHERE id = $1
        `;

        const result = await query(sql, [tenantId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Empresa não encontrada.' });
        }

        return res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao buscar configurações:', error);
        return res.status(500).json({ message: 'Erro ao carregar dados da empresa.' });
    }
};

const updateTenantSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { 
            name, closing_day, 
            address, phone, document, email_contact, website, footer_message 
        } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Nome da empresa é obrigatório.' });
        }

        // Atualiza tanto os dados básicos quanto os de impressão
        const sql = `
            UPDATE tenants 
            SET name = $1, closing_day = $2,
                address = $3, phone = $4, document = $5, 
                email_contact = $6, website = $7, footer_message = $8,
                updated_at = NOW()
            WHERE id = $9
            RETURNING *
        `;

        const result = await query(sql, [
            name, closing_day || 1,
            address, phone, document, email_contact, website, footer_message,
            tenantId
        ]);

        return res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao atualizar empresa:', error);
        return res.status(500).json({ message: 'Erro ao salvar alterações.' });
    }
};

// ==========================================
// 2. GESTÃO DE EQUIPE (USUÁRIOS)
// ==========================================
const getTeam = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        // Retorna apenas a lista de usuários
        const result = await query(
            'SELECT id, name, email, role, is_super_admin, created_at, avatar_path FROM users WHERE tenant_id = $1 ORDER BY created_at DESC',
            [tenantId]
        );

        return res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar equipe:', error);
        return res.status(500).json({ message: 'Erro ao carregar equipe.' });
    }
};

const addMember = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Preencha todos os campos obrigatórios.' });
        }

        // 1. VERIFICAR TRAVA DE PLANO (Mantida do seu código original)
        const tenantCheck = await query('SELECT max_users FROM tenants WHERE id = $1', [tenantId]);
        const maxUsers = tenantCheck.rows[0].max_users;

        const countCheck = await query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
        const currentUsers = parseInt(countCheck.rows[0].count);

        if (currentUsers >= maxUsers) {
            return res.status(403).json({ 
                message: `Limite de usuários atingido (${maxUsers}). Faça um upgrade no plano.` 
            });
        }

        // 2. Verifica se email já existe
        const check = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'Este email já está em uso.' });
        }

        const hashedPassword = await hashPassword(password);

        const result = await query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING id, name, email, role`,
            [tenantId, name, email, hashedPassword, role || 'user']
        );

        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao adicionar membro:', error);
        return res.status(500).json({ message: 'Erro ao adicionar usuário.' });
    }
};

const removeMember = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userIdToDelete = req.params.id; // ID vindo da URL
        const requestingUserId = req.user.id; // ID de quem está logado

        // Impede auto-exclusão (Suporta UUID ou Inteiro dependendo do seu banco atual)
        if (requestingUserId.toString() === userIdToDelete.toString()) {
            return res.status(400).json({ message: 'Você não pode excluir sua própria conta.' });
        }

        await query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [userIdToDelete, tenantId]);

        return res.json({ message: 'Usuário removido com sucesso.' });

    } catch (error) {
        console.error('Erro ao remover membro:', error);
        return res.status(500).json({ message: 'Erro ao remover usuário.' });
    }
};

// Exportando com os nomes que as rotas novas esperam
module.exports = {
    getTenantSettings,
    updateTenantSettings,
    getTeam,
    addMember,
    removeMember
};