const { query } = require('../config/db');
const { hashPassword } = require('../utils/security');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. CONFIGURAÇÕES DA EMPRESA (TENANT LOGADO)
// ==========================================
const getTenantSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const sql = `
            SELECT 
                id, name, slug, closing_day, plan_tier, max_users, active,
                primary_color, secondary_color,
                address, phone, document, email_contact, website, footer_message,
                os_observation_message, os_warranty_terms
            FROM tenants 
            WHERE id = $1
        `;
        const result = await query(sql, [tenantId]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Empresa não encontrada.' });
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao carregar configurações.' });
    }
};

const updateTenantSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { 
            name, closing_day, address, phone, document, 
            email_contact, website, footer_message, 
            primary_color, secondary_color,
            os_observation_message, os_warranty_terms 
        } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        const sql = `
            UPDATE tenants 
            SET name=$1, closing_day=$2, address=$3, phone=$4, document=$5, 
                email_contact=$6, website=$7, footer_message=$8, 
                primary_color=$9, secondary_color=$10,
                os_observation_message=$11, os_warranty_terms=$12,
                updated_at=NOW()
            WHERE id=$13
            RETURNING *
        `;
        const result = await query(sql, [
            name, closing_day || 1, address, phone, document, 
            email_contact, website, footer_message, 
            primary_color || '#000000', secondary_color || '#ffffff',
            os_observation_message || '', os_warranty_terms || '',
            tenantId
        ]);
        return res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao salvar.' });
    }
};

// ==========================================
// 2. GESTÃO DE EQUIPE (USUÁRIOS DO TENANT)
// ==========================================
const getTeam = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query(
            'SELECT id, name, email, role, is_super_admin, created_at, avatar_path, active FROM users WHERE tenant_id = $1 ORDER BY created_at DESC', 
            [tenantId]
        );
        return res.json(result.rows);
    } catch (error) {
        console.error("Erro na query de equipe:", error);
        return res.status(500).json({ message: 'Erro ao carregar equipe.' });
    }
};

const addMember = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, email, password, role } = req.body;

        if (!name || !email || !password) return res.status(400).json({ message: 'Dados incompletos.' });

        const tenantCheck = await query('SELECT max_users FROM tenants WHERE id = $1', [tenantId]);
        const countCheck = await query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
        
        if (tenantCheck.rows[0].max_users && parseInt(countCheck.rows[0].count) >= tenantCheck.rows[0].max_users) {
            return res.status(403).json({ message: 'Limite de usuários atingido.' });
        }

        const check = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ message: 'Email já está em uso.' });

        const hashedPassword = await hashPassword(password);
        
        const allowedRoles = ['admin', 'vendedor', 'caixa', 'producao', 'financeiro', 'rh', 'suporte'];
        const safeRole = allowedRoles.includes(role) ? role : 'vendedor';

        const result = await query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, active) 
             VALUES ($1, $2, $3, $4, $5, true) 
             RETURNING id, name, email, role`,
            [tenantId, name, email, hashedPassword, safeRole]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro AddMember:', error);
        return res.status(500).json({ message: 'Erro ao criar usuário.' });
    }
};

const updateMember = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.params.id;
        const { name, email, role, password } = req.body;

        const userCheck = await query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
        if (userCheck.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });

        const allowedRoles = ['admin', 'vendedor', 'caixa', 'producao', 'financeiro', 'rh', 'suporte'];
        const safeRole = allowedRoles.includes(role) ? role : 'vendedor';

        let sql = `UPDATE users SET name = $1, email = $2, role = $3`;
        const params = [name, email, safeRole];
        let counter = 4;

        if (password && password.trim() !== '') {
            const hashedPassword = await hashPassword(password);
            sql += `, password_hash = $${counter}`;
            params.push(hashedPassword);
            counter++;
        }

        sql += ` WHERE id = $${counter} AND tenant_id = $${counter + 1}`;
        params.push(userId, tenantId);

        await query(sql, params);
        return res.json({ message: 'Usuário atualizado com sucesso.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar usuário.' });
    }
};

const removeMember = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userIdToDelete = req.params.id;
        const requestingUserId = req.user.id;

        if (requestingUserId.toString() === userIdToDelete.toString()) return res.status(400).json({ message: 'Não pode remover a si mesmo.' });

        await query('DELETE FROM users WHERE id = $1 AND tenant_id = $2', [userIdToDelete, tenantId]);
        return res.json({ message: 'Usuário removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

// ==========================================
// 3. CAMPOS PERSONALIZADOS
// ==========================================
const getCustomFields = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { module } = req.query; 
        
        let sql = `SELECT * FROM custom_field_definitions WHERE tenant_id = $1`;
        const params = [tenantId];
        
        if (module) {
            sql += ` AND module = $2`;
            params.push(module);
        }
        sql += ` ORDER BY created_at ASC`;
        
        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao buscar campos.' });
    }
};

const saveCustomField = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { label, module, type } = req.body;
        
        if(!label) return res.status(400).json({ message: 'Nome do campo obrigatório.' });

        const result = await query(
            `INSERT INTO custom_field_definitions (tenant_id, label, module, type, active) VALUES ($1, $2, $3, $4, true) RETURNING *`,
            [tenantId, label, module || 'service_order', type || 'text']
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao criar campo.' });
    }
};

const deleteCustomField = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        await query('DELETE FROM custom_field_definitions WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.json({ message: 'Campo removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover campo.' });
    }
};

// ==========================================
// 4. ADMINISTRAÇÃO SAAS (SUPER ADMIN ONLY)
// ==========================================

const listAllTenants = async (req, res) => {
    try {
        const result = await query(`
            SELECT t.*, 
            (SELECT COUNT(*) FROM users WHERE tenant_id = t.id) as users_count
            FROM tenants t 
            ORDER BY t.created_at DESC
        `);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar empresas.' });
    }
};

// --- FUNÇÃO PARA ACESSAR TENANT (IMPERSONATE) ---
const impersonateTenant = async (req, res) => {
    try {
        const { id } = req.params; // ID do Tenant selecionado no painel Admin

        // Busca o admin principal desse tenant
        const userRes = await query(
            'SELECT id, email, tenant_id, role FROM users WHERE tenant_id = $1 AND role = $2 LIMIT 1',
            [id, 'admin']
        );

        if (userRes.rows.length === 0) {
            return res.status(404).json({ message: 'Nenhum administrador encontrado para este tenant.' });
        }

        const user = userRes.rows[0];

        // Gera Token JWT para o Admin do Tenant
        const token = jwt.sign(
            { id: user.id, email: user.email, tenantId: user.tenant_id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        return res.json({ token, user });
    } catch (error) {
        console.error("Erro no Impersonate:", error);
        return res.status(500).json({ message: 'Erro interno ao acessar tenant.' });
    }
};

const deleteTenant = async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM tenants WHERE id = $1', [id]);
        return res.json({ message: 'Empresa removida com sucesso.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover empresa.' });
    }
};

module.exports = {
    // Tenant Settings
    getTenantSettings, updateTenantSettings,
    getSettings: getTenantSettings, updateSettings: updateTenantSettings,

    // Team Management
    getTeam, addMember, updateMember, removeMember,
    getUsers: getTeam, createUser: addMember, updateUser: updateMember, deleteUser: removeMember,

    // Custom Fields
    getCustomFields, saveCustomField, deleteCustomField,
    createCustomField: saveCustomField,

    // SaaS Administration
    listAllTenants,
    impersonateTenant,
    deleteTenant
};