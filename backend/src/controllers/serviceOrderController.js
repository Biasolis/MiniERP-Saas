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

// Obter Detalhes
const getServiceOrderDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const osSql = `
            SELECT os.*, c.name as client_name, c.email as client_email, c.address, c.document as client_document, c.city, c.state, c.zip_code, c.phone as client_phone
            FROM service_orders os
            LEFT JOIN clients c ON os.client_id = c.id
            WHERE os.id = $1 AND os.tenant_id = $2
        `;
        const osRes = await query(osSql, [id, tenantId]);
        if (osRes.rows.length === 0) return res.status(404).json({ message: 'OS não encontrada.' });

        const itemsSql = `SELECT * FROM service_order_items WHERE service_order_id = $1 ORDER BY created_at ASC`;
        const itemsRes = await query(itemsSql, [id]);

        const tenantSql = `SELECT name, address, phone, document, email_contact, footer_message FROM tenants WHERE id = $1`;
        const tenantRes = await query(tenantSql, [tenantId]);

        const customSql = `
            SELECT def.id, def.label, def.type, val.value 
            FROM custom_field_definitions def
            LEFT JOIN custom_field_values val ON def.id = val.field_definition_id AND val.entity_id = $1
            WHERE def.tenant_id = $2 AND def.module = 'service_order'
            ORDER BY def.created_at ASC
        `;
        const customRes = await query(customSql, [id, tenantId]);

        return res.json({ 
            os: osRes.rows[0], 
            items: itemsRes.rows,
            company: tenantRes.rows[0],
            custom_fields: customRes.rows
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao carregar detalhes.' });
    }
};

// Criar OS
const createServiceOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { client_id, client_name, equipment, description, priority, customValues } = req.body;

        await query('BEGIN');

        const sql = `
            INSERT INTO service_orders (tenant_id, client_id, client_name, equipment, description, priority, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'open')
            RETURNING id
        `;
        const result = await query(sql, [tenantId, client_id || null, client_name || 'Cliente Avulso', equipment, description, priority || 'normal']);
        const osId = result.rows[0].id;

        if (customValues && typeof customValues === 'object') {
            for (const [fieldDefId, value] of Object.entries(customValues)) {
                if (value) {
                    await query(
                        `INSERT INTO custom_field_values (tenant_id, field_definition_id, entity_id, entity_type, value) VALUES ($1, $2, $3, 'service_order', $4)`,
                        [tenantId, fieldDefId, osId, value]
                    );
                }
            }
        }

        await query('COMMIT');
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao criar OS.' });
    }
};

// Editar OS
const updateServiceOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { equipment, description, priority, customValues } = req.body;

        await query('BEGIN');

        await query(
            `UPDATE service_orders SET equipment = $1, description = $2, priority = $3, updated_at = NOW() WHERE id = $4 AND tenant_id = $5`,
            [equipment, description, priority, id, tenantId]
        );

        if (customValues && typeof customValues === 'object') {
            await query(`DELETE FROM custom_field_values WHERE entity_id = $1 AND entity_type = 'service_order' AND tenant_id = $2`, [id, tenantId]);
            for (const [fieldDefId, value] of Object.entries(customValues)) {
                if (value && value.trim() !== '') {
                    await query(
                        `INSERT INTO custom_field_values (tenant_id, field_definition_id, entity_id, entity_type, value) VALUES ($1, $2, $3, 'service_order', $4)`,
                        [tenantId, fieldDefId, id, value]
                    );
                }
            }
        }

        await query('COMMIT');
        return res.json({ message: 'Atualizado com sucesso.' });
    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao atualizar OS.' });
    }
};

// --- ADICIONAR ITEM (COM TRAVA DE ESTOQUE) ---
const addItem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { product_id, description, quantity, unit_price } = req.body;

        const qtd = Number(quantity) || 1;
        const price = Number(unit_price) || 0;
        const subtotal = qtd * price;

        await query('BEGIN');

        // 1. Verifica Estoque (Se for produto e não serviço)
        if (product_id) {
            const prodRes = await query('SELECT stock, type, name FROM products WHERE id = $1 AND tenant_id = $2', [product_id, tenantId]);
            if (prodRes.rows.length > 0) {
                const prod = prodRes.rows[0];
                // Se for PRODUTO e estoque for insuficiente, bloqueia
                if (prod.type === 'product' && prod.stock < qtd) {
                    await query('ROLLBACK');
                    return res.status(400).json({ 
                        message: `Estoque insuficiente para "${prod.name}". Disponível: ${prod.stock}` 
                    });
                }
            }
        }

        await query(`
            INSERT INTO service_order_items (tenant_id, service_order_id, product_id, description, quantity, unit_price, subtotal)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [tenantId, id, product_id || null, description, qtd, price, subtotal]);

        await updateOSTotal(id, tenantId);
        await query('COMMIT');
        return res.json({ message: 'Item adicionado.' });
    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
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

// --- ATUALIZAR STATUS (COM ESTORNO AO REABRIR) ---
const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body; // Novo status

        await query('BEGIN');

        // Busca status ATUAL
        const currentOSRes = await query('SELECT status FROM service_orders WHERE id = $1', [id]);
        const currentStatus = currentOSRes.rows[0].status;

        // 1. FINALIZAR OS (Baixa Estoque + Receita)
        if (status === 'completed' && currentStatus !== 'completed') {
            const osRes = await query('SELECT * FROM service_orders WHERE id = $1', [id]);
            const os = osRes.rows[0];
            
            // Gera Transação
            if (os && os.total_amount > 0) {
                await query(`
                    INSERT INTO transactions (tenant_id, description, amount, type, status, date, client_id, category_id, created_by)
                    VALUES ($1, $2, $3, 'income', 'pending', NOW(), $4, null, $5)
                `, [tenantId, `Receita OS #${os.id} - ${os.client_name}`, os.total_amount, os.client_id, userId]);
            }

            // Baixa Estoque
            const itemsRes = await query('SELECT product_id, quantity FROM service_order_items WHERE service_order_id = $1 AND product_id IS NOT NULL', [id]);
            for (const item of itemsRes.rows) {
                // Verifica se é produto
                const checkType = await query('SELECT type FROM products WHERE id = $1', [item.product_id]);
                if (checkType.rows.length > 0 && checkType.rows[0].type === 'product') {
                    const qtyToDeduct = Math.floor(Number(item.quantity));
                    await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [qtyToDeduct, item.product_id]);
                    await query(`
                        INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                        VALUES ($1, $2, 'out', $3, 'sale', $4, $5)
                    `, [tenantId, item.product_id, qtyToDeduct, `OS #${id}`, userId]);
                }
            }
            
            await query('UPDATE service_orders SET closed_at = NOW() WHERE id = $1', [id]);
        }

        // 2. REABRIR OS (Devolve Estoque)
        if (status === 'open' && currentStatus === 'completed') {
            // Devolve Estoque
            const itemsRes = await query('SELECT product_id, quantity FROM service_order_items WHERE service_order_id = $1 AND product_id IS NOT NULL', [id]);
            for (const item of itemsRes.rows) {
                 const checkType = await query('SELECT type FROM products WHERE id = $1', [item.product_id]);
                 if (checkType.rows.length > 0 && checkType.rows[0].type === 'product') {
                    const qtyReturn = Math.floor(Number(item.quantity));
                    await query('UPDATE products SET stock = stock + $1 WHERE id = $2', [qtyReturn, item.product_id]);
                    await query(`
                        INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                        VALUES ($1, $2, 'in', $3, 'correction', $4, $5)
                    `, [tenantId, item.product_id, qtyReturn, `Reabertura OS #${id}`, userId]);
                 }
            }
        }

        // Atualiza Status Final
        await query('UPDATE service_orders SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);

        await query('COMMIT');
        return res.json({ message: `OS atualizada para ${status}` });

    } catch (error) {
        await query('ROLLBACK');
        console.error('Erro updateStatus:', error);
        return res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};

async function updateOSTotal(osId, tenantId) {
    const sumRes = await query(`SELECT SUM(subtotal) as total FROM service_order_items WHERE service_order_id = $1`, [osId]);
    const total = sumRes.rows[0].total || 0;
    await query(`UPDATE service_orders SET total_amount = $1 WHERE id = $2 AND tenant_id = $3`, [total, osId, tenantId]);
}

module.exports = { 
    getServiceOrders, 
    getServiceOrderDetails, 
    createServiceOrder, 
    updateServiceOrder, 
    addItem, 
    removeItem, 
    updateStatus 
};