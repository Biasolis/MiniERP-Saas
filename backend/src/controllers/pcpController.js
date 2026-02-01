const { query } = require('../config/db');

// --- CONFIGURAÇÕES DO PCP (DRIVERS DE CUSTO) ---

const getSettings = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        // Busca Drivers de Custo
        const driversRes = await query('SELECT * FROM pcp_cost_drivers WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId]);
        
        // Busca Campos Personalizados do módulo PCP
        const fieldsRes = await query('SELECT * FROM custom_field_definitions WHERE tenant_id = $1 AND module = $2', [tenantId, 'pcp']);

        return res.json({
            drivers: driversRes.rows,
            customFields: fieldsRes.rows
        });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao carregar configurações PCP.' });
    }
};

const saveDriver = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id, name, unit, default_value, active } = req.body;

        if (id) {
            await query(
                `UPDATE pcp_cost_drivers SET name=$1, unit=$2, default_value=$3, active=$4 WHERE id=$5 AND tenant_id=$6`,
                [name, unit, default_value, active, id, tenantId]
            );
        } else {
            await query(
                `INSERT INTO pcp_cost_drivers (tenant_id, name, unit, default_value) VALUES ($1, $2, $3, $4)`,
                [tenantId, name, unit, default_value]
            );
        }
        return res.json({ message: 'Driver salvo.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao salvar driver.' });
    }
};

const deleteDriver = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        await query('DELETE FROM pcp_cost_drivers WHERE id=$1 AND tenant_id=$2', [req.params.id, tenantId]);
        return res.json({ message: 'Driver removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

// --- ORDENS DE PRODUÇÃO ---

const listOrders = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { status } = req.query;
        
        let sql = `
            SELECT o.*, p.name as product_name 
            FROM pcp_production_orders o
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.tenant_id = $1
        `;
        const params = [tenantId];

        if (status && status !== 'all') {
            sql += ` AND o.status = $${params.length + 1}`;
            params.push(status);
        }

        sql += ` ORDER BY o.created_at DESC`;
        
        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar ordens.' });
    }
};

const getOrderDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const orderRes = await query(`
            SELECT o.*, p.name as product_name 
            FROM pcp_production_orders o
            LEFT JOIN products p ON o.product_id = p.id
            WHERE o.id = $1 AND o.tenant_id = $2
        `, [id, tenantId]);

        if (orderRes.rows.length === 0) return res.status(404).json({ message: 'Ordem não encontrada.' });

        const itemsRes = await query(`
            SELECT i.*, p.name as product_name 
            FROM pcp_order_items i
            LEFT JOIN products p ON i.product_id = p.id
            WHERE i.production_order_id = $1
        `, [id]);

        const costsRes = await query('SELECT * FROM pcp_order_costs WHERE production_order_id = $1', [id]);

        // Campos Personalizados
        const customFieldsRes = await query(`
            SELECT d.id, d.label, d.type, v.value
            FROM custom_field_definitions d
            LEFT JOIN custom_field_values v ON d.id = v.field_definition_id AND v.entity_id = $1
            WHERE d.tenant_id = $2 AND d.module = 'pcp'
        `, [id, tenantId]);

        return res.json({
            order: orderRes.rows[0],
            items: itemsRes.rows,
            costs: costsRes.rows,
            customFields: customFieldsRes.rows
        });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao buscar detalhes.' });
    }
};

const createOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { product_id, quantity, due_date, items, costs, customValues, notes } = req.body;

        await query('BEGIN');

        // Cria Ordem
        const orderRes = await query(
            `INSERT INTO pcp_production_orders 
            (tenant_id, product_id, quantity, due_date, notes, created_by, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'planned') RETURNING id`,
            [tenantId, product_id, quantity, due_date, notes, userId]
        );
        const orderId = orderRes.rows[0].id;

        let totalRawMaterial = 0;
        let totalOpCost = 0;

        // Inserir Itens (Insumos)
        if (items) {
            for (const item of items) {
                const subtotal = Number(item.quantity) * Number(item.unit_cost);
                totalRawMaterial += subtotal;
                await query(
                    `INSERT INTO pcp_order_items (production_order_id, product_id, quantity, unit_cost, subtotal)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [orderId, item.product_id, item.quantity, item.unit_cost, subtotal]
                );
            }
        }

        // Inserir Custos (Drivers)
        if (costs) {
            for (const cost of costs) {
                const val = Number(cost.value);
                totalOpCost += val;
                await query(
                    `INSERT INTO pcp_order_costs (production_order_id, driver_id, name, value)
                     VALUES ($1, $2, $3, $4)`,
                    [orderId, cost.driver_id, cost.name, val]
                );
            }
        }

        // Salvar Campos Personalizados
        if (customValues) {
            for (const [fieldId, value] of Object.entries(customValues)) {
                await query(
                    `INSERT INTO custom_field_values (tenant_id, field_definition_id, entity_id, entity_type, value)
                     VALUES ($1, $2, $3, 'pcp', $4)`,
                    [tenantId, fieldId, orderId, value]
                );
            }
        }

        // Atualizar Totais
        const totalCost = totalRawMaterial + totalOpCost;
        const unitCost = quantity > 0 ? (totalCost / quantity) : 0;

        await query(
            `UPDATE pcp_production_orders 
             SET total_raw_material=$1, total_operation_cost=$2, total_cost=$3, unit_cost=$4 
             WHERE id=$5`,
            [totalRawMaterial, totalOpCost, totalCost, unitCost, orderId]
        );

        await query('COMMIT');
        return res.status(201).json({ id: orderId, message: 'Ordem de Produção criada.' });

    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao criar OP.' });
    }
};

const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { status } = req.body; // planned, in_production, completed

        await query('BEGIN');

        const orderRes = await query('SELECT * FROM pcp_production_orders WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        const order = orderRes.rows[0];

        if (status === 'completed' && order.status !== 'completed') {
            // 1. Baixar Estoque dos Insumos
            const itemsRes = await query('SELECT * FROM pcp_order_items WHERE production_order_id=$1', [id]);
            for (const item of itemsRes.rows) {
                await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
                await query(
                    `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                     VALUES ($1, $2, 'out', $3, 'production', $4, $5)`,
                    [tenantId, item.product_id, item.quantity, `OP #${id} - Consumo`, req.user.id]
                );
            }

            // 2. Adicionar Estoque do Produto Final
            if (order.product_id) {
                await query('UPDATE products SET stock = stock + $1 WHERE id = $2', [order.quantity, order.product_id]);
                // Atualiza preço de custo do produto com base na produção
                await query('UPDATE products SET cost_price = $1 WHERE id = $2', [order.unit_cost, order.product_id]);
                
                await query(
                    `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                     VALUES ($1, $2, 'in', $3, 'production', $4, $5)`,
                    [tenantId, order.product_id, order.quantity, `OP #${id} - Conclusão`, req.user.id]
                );
            }
        }

        await query('UPDATE pcp_production_orders SET status=$1, updated_at=NOW() WHERE id=$2', [status, id]);
        await query('COMMIT');
        return res.json({ message: 'Status atualizado.' });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};

module.exports = { getSettings, saveDriver, deleteDriver, listOrders, getOrderDetails, createOrder, updateStatus };