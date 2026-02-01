const { query } = require('../config/db');

// --- CLIENTES ---

// Listar Clientes (Com contagem de projetos ativos)
const listClients = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { status } = req.query;

        let sql = `
            SELECT c.id, c.name, c.email, c.phone, c.document, c.city, c.status, c.source, c.created_at,
            (SELECT COUNT(*) FROM client_projects cp WHERE cp.client_id = c.id AND cp.status != 'completed' AND cp.status != 'lost') as active_projects
            FROM clients c 
            WHERE c.tenant_id = $1
        `;
        const params = [tenantId];

        if (status) {
            sql += ` AND c.status = $2`;
            params.push(status);
        }

        sql += ` ORDER BY c.name ASC`;

        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar clientes.' });
    }
};

// Obter Detalhes Completos do Cliente (CRM View)
const getClientDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const clientId = req.params.id;

        // 1. Dados Cadastrais
        const clientSql = `SELECT * FROM clients WHERE id = $1 AND tenant_id = $2`;
        const clientRes = await query(clientSql, [clientId, tenantId]);
        
        if (clientRes.rows.length === 0) {
            return res.status(404).json({ message: 'Cliente não encontrado.' });
        }

        // 2. Resumo Financeiro (Total Gasto, Total em Aberto)
        const financeSql = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_spent,
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) as total_debt
            FROM transactions 
            WHERE client_id = $1 AND tenant_id = $2
        `;
        const financeRes = await query(financeSql, [clientId, tenantId]);

        // 3. Últimas Interações (Timeline)
        const historySql = `
            SELECT i.*, u.name as user_name 
            FROM client_interactions i
            LEFT JOIN users u ON i.user_id = u.id
            WHERE i.client_id = $1 ORDER BY i.date DESC LIMIT 20
        `;
        const historyRes = await query(historySql, [clientId]);

        // 4. Últimas OS
        const osSql = `SELECT id, equipment, status, created_at, total_amount FROM service_orders WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5`;
        const osRes = await query(osSql, [clientId]);

        return res.json({
            client: clientRes.rows[0],
            financial: financeRes.rows[0],
            history: historyRes.rows,
            last_os: osRes.rows
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao carregar detalhes.' });
    }
};

// Criar Cliente (Atualizado com Endereço Granular)
const createClient = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { 
            name, email, phone, document, 
            zip_code, street, number, complement, neighborhood, city, state, 
            status, source, notes 
        } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        // Monta endereço completo para compatibilidade com legados que usam campo 'address' único
        const fullAddress = `${street || ''}, ${number || ''} - ${neighborhood || ''}`;

        const sql = `
            INSERT INTO clients 
            (tenant_id, name, email, phone, document, address, zip_code, street, number, complement, neighborhood, city, state, status, source, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;
        
        const result = await query(sql, [
            tenantId, name, email, phone, document, 
            fullAddress, zip_code, street, number, complement, neighborhood, city, state,
            status || 'lead', source || 'other', notes
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar cliente.' });
    }
};

// Atualizar Cliente (Atualizado com Endereço Granular)
const updateClient = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const clientId = req.params.id;
        const { 
            name, email, phone, document, 
            zip_code, street, number, complement, neighborhood, city, state,
            status, source, notes 
        } = req.body;

        const fullAddress = `${street || ''}, ${number || ''} - ${neighborhood || ''}`;

        const sql = `
            UPDATE clients 
            SET name=$1, email=$2, phone=$3, document=$4, address=$5, 
                zip_code=$6, street=$7, number=$8, complement=$9, neighborhood=$10, city=$11, state=$12,
                status=$13, source=$14, notes=$15
            WHERE id=$16 AND tenant_id=$17
            RETURNING *
        `;
        
        const result = await query(sql, [
            name, email, phone, document, fullAddress,
            zip_code, street, number, complement, neighborhood, city, state,
            status, source, notes,
            clientId, tenantId
        ]);

        return res.json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar.' });
    }
};

// Deletar Cliente
const deleteClient = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const clientId = req.params.id;
        await query('DELETE FROM clients WHERE id = $1 AND tenant_id = $2', [clientId, tenantId]);
        return res.json({ message: 'Cliente removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao deletar.' });
    }
};

// Adicionar Interação (Timeline)
const addInteraction = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const clientId = req.params.id;
        const userId = req.user.id;
        const { type, description } = req.body;

        const sql = `
            INSERT INTO client_interactions (tenant_id, client_id, user_id, type, description)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        await query(sql, [tenantId, clientId, userId, type, description]);
        return res.status(201).json({ message: 'Interação registrada.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao salvar interação.' });
    }
};

// --- PROJETOS (CRM / KANBAN) ---

const getClientProjects = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params; // ID do Cliente
        const result = await query(
            `SELECT * FROM client_projects WHERE client_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
            [id, tenantId]
        );
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar projetos.' });
    }
};

const createProject = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params; // ID do Cliente
        const { title, description, value, status, due_date } = req.body;

        const result = await query(
            `INSERT INTO client_projects (tenant_id, client_id, title, description, value, status, due_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [tenantId, id, title, description, value || 0, status || 'lead', due_date]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao criar projeto.' });
    }
};

const updateProjectStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { projectId } = req.params;
        const { status } = req.body;

        await query(
            `UPDATE client_projects SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3`,
            [status, projectId, tenantId]
        );
        return res.json({ message: 'Status atualizado.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar projeto.' });
    }
};

const deleteProject = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { projectId } = req.params;
        await query('DELETE FROM client_projects WHERE id = $1 AND tenant_id = $2', [projectId, tenantId]);
        return res.json({ message: 'Projeto removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover projeto.' });
    }
};

module.exports = { 
    listClients, // Padronizei como listClients
    getClientDetails, 
    createClient, 
    updateClient, 
    deleteClient, 
    addInteraction,
    getClientProjects,
    createProject,
    updateProjectStatus,
    deleteProject
};