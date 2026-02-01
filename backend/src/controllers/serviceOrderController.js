const { query } = require('../config/db');

// --- LISTAR OS ---
const listOrders = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { status, client_id } = req.query;

        let sql = `
            SELECT so.*, c.name as client_name, u.name as technician_name
            FROM service_orders so
            LEFT JOIN clients c ON so.client_id = c.id
            LEFT JOIN users u ON so.technician_id = u.id
            WHERE so.tenant_id = $1
        `;
        const params = [tenantId];

        if (status && status !== 'all') {
            sql += ` AND so.status = $${params.length + 1}`;
            params.push(status);
        }
        if (client_id) {
            sql += ` AND so.client_id = $${params.length + 1}`;
            params.push(client_id);
        }

        sql += ` ORDER BY so.created_at DESC`;

        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar OS.' });
    }
};

// --- CRIAR OS ---
const createOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { client_id, equipment, description, priority, technician_id } = req.body;

        if (!client_id || !equipment) {
            return res.status(400).json({ message: 'Cliente e Equipamento são obrigatórios.' });
        }

        const clientRes = await query('SELECT name FROM clients WHERE id = $1', [client_id]);
        const clientName = clientRes.rows[0]?.name || 'Cliente';

        const result = await query(
            `INSERT INTO service_orders 
            (tenant_id, client_id, client_name, equipment, description, priority, technician_id, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', NOW()) 
            RETURNING *`,
            [tenantId, client_id, clientName, equipment, description, priority || 'normal', technician_id || null]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar OS.' });
    }
};

// --- DETALHES DA OS (Atualizado para frontend v2) ---
const getOrderDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        // 1. Busca Dados da OS
        const orderRes = await query(
            `SELECT so.*, c.email, c.phone, c.address, c.name as client_name
             FROM service_orders so 
             LEFT JOIN clients c ON so.client_id = c.id
             WHERE so.id = $1 AND so.tenant_id = $2`,
            [id, tenantId]
        );

        if (orderRes.rows.length === 0) return res.status(404).json({ message: 'OS não encontrada.' });

        // 2. Busca Itens
        const itemsRes = await query(
            `SELECT soi.*, p.name as product_name, p.type 
             FROM service_order_items soi
             LEFT JOIN products p ON soi.product_id = p.id
             WHERE soi.service_order_id = $1`,
            [id]
        );

        // 3. Busca Campos Personalizados (Definição + Valor)
        const customFieldsRes = await query(`
            SELECT 
                d.id, d.label, d.type,
                v.value
            FROM custom_field_definitions d
            LEFT JOIN custom_field_values v ON d.id = v.field_definition_id AND v.entity_id = $1
            WHERE d.tenant_id = $2 AND d.module = 'service_order' AND d.active = true
        `, [id, tenantId]);

        // Retorna formato esperado pelo seu JSX: { os, items, custom_fields }
        return res.json({ 
            os: orderRes.rows[0], 
            items: itemsRes.rows,
            custom_fields: customFieldsRes.rows 
        });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao buscar detalhes.' });
    }
};

// --- EDITAR OS (NOVO) ---
const updateOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { equipment, description, priority, customValues } = req.body;

        await query('BEGIN');

        // Atualiza campos principais
        await query(
            `UPDATE service_orders 
             SET equipment = $1, description = $2, priority = $3 
             WHERE id = $4 AND tenant_id = $5`,
            [equipment, description, priority, id, tenantId]
        );

        // Atualiza campos personalizados
        if (customValues && typeof customValues === 'object') {
            for (const [fieldId, value] of Object.entries(customValues)) {
                // Verifica se já existe valor
                const check = await query(
                    `SELECT id FROM custom_field_values WHERE field_definition_id = $1 AND entity_id = $2`,
                    [fieldId, id]
                );

                if (check.rows.length > 0) {
                    await query(`UPDATE custom_field_values SET value = $1 WHERE id = $2`, [value, check.rows[0].id]);
                } else {
                    await query(
                        `INSERT INTO custom_field_values (tenant_id, field_definition_id, entity_id, entity_type, value)
                         VALUES ($1, $2, $3, 'service_order', $4)`,
                        [tenantId, fieldId, id, value]
                    );
                }
            }
        }

        await query('COMMIT');
        return res.json({ message: 'OS atualizada com sucesso.' });
    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao atualizar OS.' });
    }
};

// --- ADICIONAR ITEM ---
const addItem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params; 
        const { product_id, quantity, unit_price, description } = req.body; // Aceita descrição livre

        await query('BEGIN');

        // Validações básicas...
        const osCheck = await query('SELECT status FROM service_orders WHERE id=$1', [id]);
        if (osCheck.rows[0].status === 'completed') return res.status(400).json({message: 'OS fechada.'});

        let prodName = description;
        let prodType = 'service';

        // Se tiver ID de produto, valida estoque e pega nome oficial
        if (product_id) {
            const prodRes = await query('SELECT * FROM products WHERE id=$1', [product_id]);
            const product = prodRes.rows[0];
            prodName = product.name;
            prodType = product.type;

            if (product.type === 'product') {
                if (product.stock < quantity) {
                    await query('ROLLBACK');
                    return res.status(400).json({ message: 'Estoque insuficiente.' });
                }
                // Baixa Estoque
                await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product_id]);
                await query(`INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by) VALUES ($1, $2, 'out', $3, 'sale', $4, $5)`, [tenantId, product_id, quantity, `OS #${id}`, req.user.id]);
            }
        }

        const subtotal = Number(quantity) * Number(unit_price);
        await query(
            `INSERT INTO service_order_items (tenant_id, service_order_id, product_id, description, quantity, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tenantId, id, product_id || null, prodName, quantity, unit_price, subtotal]
        );

        await recalculateOSTotals(id, tenantId);
        await query('COMMIT');
        return res.json({ message: 'Item adicionado.' });

    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao adicionar item.' });
    }
};

// --- REMOVER ITEM ---
const removeItem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id, itemId } = req.params;

        await query('BEGIN');
        const itemRes = await query(`SELECT soi.*, p.type FROM service_order_items soi LEFT JOIN products p ON soi.product_id = p.id WHERE soi.id=$1`, [itemId]);
        const item = itemRes.rows[0];

        // Estorno Estoque
        if (item.product_id && item.type === 'product') {
            await query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
            await query(`INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by) VALUES ($1, $2, 'in', $3, 'adjustment', $4, $5)`, [tenantId, item.product_id, item.quantity, `Estorno OS #${id}`, req.user.id]);
        }

        await query('DELETE FROM service_order_items WHERE id=$1', [itemId]);
        await recalculateOSTotals(id, tenantId);
        await query('COMMIT');
        return res.json({ message: 'Item removido.' });
    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

// --- ATUALIZAR STATUS ---
const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { status } = req.body;

        await query('BEGIN');
        const osRes = await query('SELECT * FROM service_orders WHERE id=$1', [id]);
        const os = osRes.rows[0];

        // Gera Financeiro se concluir
        if (status === 'completed' && os.status !== 'completed' && !os.transaction_id) {
            const total = Number(os.total_amount) - Number(os.discount || 0);
            if (total > 0) {
                const transRes = await query(
                    `INSERT INTO transactions (tenant_id, description, amount, type, status, date, client_id, created_by)
                     VALUES ($1, $2, $3, 'income', 'pending', NOW(), $4, $5) RETURNING id`,
                    [tenantId, `Receita OS #${id} - ${os.client_name}`, total, os.client_id, req.user.id]
                );
                await query('UPDATE service_orders SET transaction_id = $1 WHERE id = $2', [transRes.rows[0].id, id]);
            }
        }

        await query('UPDATE service_orders SET status = $1 WHERE id = $2', [status, id]);
        await query('COMMIT');
        return res.json({ message: 'Status atualizado.' });
    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao atualizar.' });
    }
};

async function recalculateOSTotals(orderId, tenantId) {
    const res = await query(`SELECT SUM(subtotal) as total FROM service_order_items WHERE service_order_id = $1`, [orderId]);
    const total = res.rows[0].total || 0;
    await query(`UPDATE service_orders SET total_amount = $1 WHERE id = $2`, [total, orderId]);
}

module.exports = { listOrders, createOrder, getOrderDetails, updateOrder, addItem, removeItem, updateStatus };