const { query } = require('../config/db');

// Listar Clientes (Com filtros simples)
const getClients = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { status } = req.query;

        let sql = `
            SELECT id, name, email, phone, document, city, status, source, created_at 
            FROM clients 
            WHERE tenant_id = $1
        `;
        const params = [tenantId];

        if (status) {
            sql += ` AND status = $2`;
            params.push(status);
        }

        sql += ` ORDER BY name ASC`;

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
        const osSql = `SELECT id, equipment, status, created_at FROM service_orders WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5`;
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

// Criar Cliente
const createClient = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, email, phone, document, address, city, state, zip_code, status, source, notes } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        const sql = `
            INSERT INTO clients (tenant_id, name, email, phone, document, address, city, state, zip_code, status, source, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        const result = await query(sql, [
            tenantId, name, email, phone, document, 
            address, city, state, zip_code, 
            status || 'lead', source || 'other', notes
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar cliente.' });
    }
};

// Atualizar Cliente
const updateClient = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const clientId = req.params.id;
        const { name, email, phone, document, address, city, state, zip_code, status, source, notes } = req.body;

        const sql = `
            UPDATE clients 
            SET name=$1, email=$2, phone=$3, document=$4, address=$5, city=$6, state=$7, zip_code=$8, status=$9, source=$10, notes=$11
            WHERE id=$12 AND tenant_id=$13
            RETURNING *
        `;
        const result = await query(sql, [
            name, email, phone, document, address, city, state, zip_code, status, source, notes,
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

module.exports = { getClients, getClientDetails, createClient, updateClient, deleteClient, addInteraction };