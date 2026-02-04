const { query } = require('../config/db');
const { hashPassword } = require('../utils/security'); // Usa o seu utilitário existente

// ==========================================
// 1. CONFIGURAÇÕES DA EMPRESA
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
// 2. GESTÃO DE EQUIPE
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

        // Verifica Limite do Plano
        const tenantCheck = await query('SELECT max_users FROM tenants WHERE id = $1', [tenantId]);
        const countCheck = await query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]);
        
        if (tenantCheck.rows[0].max_users && parseInt(countCheck.rows[0].count) >= tenantCheck.rows[0].max_users) {
            return res.status(403).json({ message: 'Limite de usuários atingido.' });
        }

        // Verifica Email
        const check = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) return res.status(400).json({ message: 'Email já está em uso.' });

        // Hash da Senha
        const hashedPassword = await hashPassword(password);
        
        // Validação de Role Segura
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

// --- NOVA FUNÇÃO: EDITAR MEMBRO ---
const updateMember = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.params.id;
        const { name, email, role, password } = req.body;

        // Verifica se o usuário pertence à empresa
        const userCheck = await query('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, tenantId]);
        if (userCheck.rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado.' });

        // Validação de Role Segura
        const allowedRoles = ['admin', 'vendedor', 'caixa', 'producao', 'financeiro', 'rh', 'suporte'];
        const safeRole = allowedRoles.includes(role) ? role : 'vendedor';

        let sql = `UPDATE users SET name = $1, email = $2, role = $3`;
        const params = [name, email, safeRole];
        let counter = 4;

        // Só atualiza a senha se ela foi enviada e não estiver vazia
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
        console.error('Erro UpdateMember:', error);
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

module.exports = {
    getTenantSettings, updateTenantSettings,
    getTeam, addMember, updateMember, removeMember, // <--- Adicionado updateMember aqui
    getCustomFields, saveCustomField, deleteCustomField,
    // Aliases
    getSettings: getTenantSettings,
    updateSettings: updateTenantSettings,
    getUsers: getTeam,
    createUser: addMember,
    updateUser: updateMember, // <--- Alias para rotas
    deleteUser: removeMember,
    createCustomField: saveCustomField
};