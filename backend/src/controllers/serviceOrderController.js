const { query } = require('../config/db');

// Listar OS
const getServiceOrders = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { status } = req.query;
        
        let sql = `
            SELECT os.*, c.name as client_name, c.phone as client_phone 
            FROM service_orders os
            LEFT JOIN clients c ON os.client_id = c.id
            WHERE os.tenant_id = $1
        `;
        const params = [tenantId];

        if (status) {
            sql += ` AND os.status = $2`;
            params.push(status);
        }

        sql += ` ORDER BY os.created_at DESC`;

        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar OS.' });
    }
};

// Obter Detalhes (OS + Itens + Cliente)
const getServiceOrderDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        // Busca OS
        const osSql = `
            SELECT os.*, c.name as client_name, c.email as client_email, c.address, c.document
            FROM service_orders os
            LEFT JOIN clients c ON os.client_id = c.id
            WHERE os.id = $1 AND os.tenant_id = $2
        `;
        const osRes = await query(osSql, [id, tenantId]);
        if (osRes.rows.length === 0) return res.status(404).json({ message: 'OS não encontrada.' });

        // Busca Itens
        const itemsSql = `
            SELECT * FROM service_order_items WHERE service_order_id = $1 ORDER BY created_at ASC
        `;
        const itemsRes = await query(itemsSql, [id]);

        return res.json({ os: osRes.rows[0], items: itemsRes.rows });

    } catch (error) {
        return res.status(500).json({ message: 'Erro ao carregar detalhes.' });
    }
};

// Criar OS Básica
const createServiceOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { client_id, client_name, equipment, description, priority } = req.body;

        const sql = `
            INSERT INTO service_orders (tenant_id, client_id, client_name, equipment, description, priority, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'open')
            RETURNING *
        `;
        // Se client_id vier nulo, usamos o client_name digitado manualmente
        const result = await query(sql, [
            tenantId, client_id || null, client_name || 'Cliente Avulso', 
            equipment, description, priority || 'normal'
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar OS.' });
    }
};

// Adicionar Item/Produto na OS
const addItem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params; // ID da OS
        const { product_id, description, quantity, unit_price } = req.body;

        const qtd = Number(quantity) || 1;
        const price = Number(unit_price) || 0;
        const subtotal = qtd * price;

        await query('BEGIN');

        // Insere item
        await query(`
            INSERT INTO service_order_items (tenant_id, service_order_id, product_id, description, quantity, unit_price, subtotal)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [tenantId, id, product_id || null, description, qtd, price, subtotal]);

        // Atualiza total da OS
        await updateOSTotal(id, tenantId);

        await query('COMMIT');
        return res.json({ message: 'Item adicionado.' });

    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao adicionar item.' });
    }
};

// Remover Item
const removeItem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id, itemId } = req.params;

        await query('BEGIN');
        await query('DELETE FROM service_order_items WHERE id = $1 AND service_order_id = $2', [itemId, id]);
        await updateOSTotal(id, tenantId);
        await query('COMMIT');

        return res.json({ message: 'Item removido.' });
    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao remover item.' });
    }
};

// Atualizar Status e Finalizar
const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body; // 'open', 'in_progress', 'completed'

        await query('BEGIN');

        let sql = `UPDATE service_orders SET status = $1, updated_at = NOW()`;
        
        // Se estiver finalizando
        if (status === 'completed') {
            sql += `, closed_at = NOW()`;
            
            // 1. Gerar Transação Financeira (Contas a Receber)
            // Busca dados da OS para criar a receita
            const osRes = await query('SELECT * FROM service_orders WHERE id = $1', [id]);
            const os = osRes.rows[0];
            
            if (os && os.total_amount > 0) {
                // Verifica se já não foi gerado financeiro para evitar duplicação
                // (Lógica simples, num sistema real validaríamos mais a fundo)
                await query(`
                    INSERT INTO transactions (tenant_id, description, amount, type, status, date, client_id, category_id, created_by)
                    VALUES ($1, $2, $3, 'income', 'pending', NOW(), $4, null, $5)
                `, [tenantId, `Receita OS #${os.id} - ${os.client_name}`, os.total_amount, os.client_id, userId]);
            }

            // 2. Baixar Estoque dos Produtos Usados
            const itemsRes = await query('SELECT product_id, quantity FROM service_order_items WHERE service_order_id = $1 AND product_id IS NOT NULL', [id]);
            for (const item of itemsRes.rows) {
                await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
                // Registra movimento
                await query(`
                    INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                    VALUES ($1, $2, 'out', $3, 'sale', $4, $5)
                `, [tenantId, item.product_id, item.quantity, `OS #${id}`, userId]);
            }
        }

        sql += ` WHERE id = $2 AND tenant_id = $3`;
        await query(sql, [status, id, tenantId]);

        await query('COMMIT');
        return res.json({ message: `OS atualizada para ${status}` });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};

// Função Auxiliar para recalcular total
async function updateOSTotal(osId, tenantId) {
    const sumRes = await query(`
        SELECT SUM(subtotal) as total FROM service_order_items WHERE service_order_id = $1
    `, [osId]);
    const total = sumRes.rows[0].total || 0;
    
    await query(`
        UPDATE service_orders SET total_amount = $1 WHERE id = $2 AND tenant_id = $3
    `, [total, osId, tenantId]);
}

module.exports = { getServiceOrders, getServiceOrderDetails, createServiceOrder, addItem, removeItem, updateStatus };