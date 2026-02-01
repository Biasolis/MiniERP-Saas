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
        const { client_id, equipment, description, priority, technician_id, customValues } = req.body;

        if (!client_id || !equipment) {
            return res.status(400).json({ message: 'Cliente e Equipamento são obrigatórios.' });
        }

        await query('BEGIN');

        const clientRes = await query('SELECT name FROM clients WHERE id = $1', [client_id]);
        const clientName = clientRes.rows[0]?.name || 'Cliente';

        const result = await query(
            `INSERT INTO service_orders 
            (tenant_id, client_id, client_name, equipment, description, priority, technician_id, status, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', NOW()) 
            RETURNING id`,
            [tenantId, client_id, clientName, equipment, description, priority || 'normal', technician_id || null]
        );
        const osId = result.rows[0].id;

        if (customValues && typeof customValues === 'object') {
            for (const [fieldId, value] of Object.entries(customValues)) {
                if (value) {
                    await query(
                        `INSERT INTO custom_field_values (tenant_id, field_definition_id, entity_id, entity_type, value)
                         VALUES ($1, $2, $3, 'service_order', $4)`,
                        [tenantId, fieldId, osId, value]
                    );
                }
            }
        }

        await query('COMMIT');
        return res.status(201).json({ id: osId, message: 'OS criada com sucesso.' });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar OS.' });
    }
};

// --- DETALHES DA OS (Completo) ---
const getOrderDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        // 1. Busca Dados da OS + Dados Completos do Cliente
        const orderRes = await query(
            `SELECT so.*, c.email as client_email, c.phone as client_phone, c.document as client_document, c.address, c.city, c.state, c.name as client_name
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
             WHERE soi.service_order_id = $1
             ORDER BY soi.id ASC`,
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
            ORDER BY d.id ASC
        `, [id, tenantId]);

        // 4. Busca Dados da Empresa (CORRIGIDO: INCLUINDO OS NOVOS CAMPOS)
        const tenantRes = await query(
            `SELECT name, document, phone, email_contact, address, footer_message,
                    os_observation_message, os_warranty_terms  -- <--- ADICIONADO AQUI
             FROM tenants WHERE id = $1`,
            [tenantId]
        );

        return res.json({ 
            os: orderRes.rows[0], 
            items: itemsRes.rows,
            custom_fields: customFieldsRes.rows,
            company: tenantRes.rows[0] 
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao buscar detalhes.' });
    }
};

// --- EDITAR OS ---
const updateOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { equipment, description, priority, customValues } = req.body;

        await query('BEGIN');

        await query(
            `UPDATE service_orders 
             SET equipment = $1, description = $2, priority = $3 
             WHERE id = $4 AND tenant_id = $5`,
            [equipment, description, priority, id, tenantId]
        );

        if (customValues && typeof customValues === 'object') {
            for (const [fieldId, value] of Object.entries(customValues)) {
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
        const { product_id, quantity, unit_price, description } = req.body;

        await query('BEGIN');

        const osCheck = await query('SELECT status FROM service_orders WHERE id=$1', [id]);
        if (osCheck.rows.length === 0) return res.status(404).json({ message: 'OS inexistente.' });
        if (osCheck.rows[0].status === 'completed' || osCheck.rows[0].status === 'cancelled') {
            await query('ROLLBACK');
            return res.status(400).json({ message: 'Não é possível alterar uma OS fechada.' });
        }

        let prodName = description;
        let prodType = 'service';

        if (product_id) {
            const prodRes = await query('SELECT * FROM products WHERE id=$1 AND tenant_id=$2', [product_id, tenantId]);
            if (prodRes.rows.length === 0) {
                await query('ROLLBACK');
                return res.status(404).json({ message: 'Produto não encontrado.' });
            }
            
            const product = prodRes.rows[0];
            prodName = product.name; 
            prodType = product.type;

            if (product.type === 'product') {
                if (Number(product.stock) < Number(quantity)) {
                    await query('ROLLBACK');
                    return res.status(400).json({ message: `Estoque insuficiente. Disponível: ${product.stock}` });
                }
                await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, product_id]);
                await query(
                    `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                     VALUES ($1, $2, 'out', $3, 'sale', $4, $5)`,
                    [tenantId, product_id, quantity, `OS #${id}`, req.user.id]
                );
            }
        }

        const subtotal = Number(quantity) * Number(unit_price);
        
        await query(
            `INSERT INTO service_order_items (tenant_id, service_order_id, product_id, description, quantity, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tenantId, id, product_id || null, prodName, quantity, unit_price, subtotal]
        );

        await recalculateOSTotals(id);
        
        await query('COMMIT');
        return res.json({ message: 'Item adicionado.' });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao adicionar item.' });
    }
};

// --- REMOVER ITEM ---
const removeItem = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id, itemId } = req.params;

        await query('BEGIN');

        const itemRes = await query(
            `SELECT soi.*, p.type 
             FROM service_order_items soi 
             LEFT JOIN products p ON soi.product_id = p.id 
             WHERE soi.id=$1 AND soi.service_order_id=$2`, 
            [itemId, id]
        );

        if (itemRes.rows.length === 0) {
            await query('ROLLBACK');
            return res.status(404).json({ message: 'Item não encontrado.' });
        }
        const item = itemRes.rows[0];

        if (item.product_id && item.type === 'product') {
            await query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
            await query(
                `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                 VALUES ($1, $2, 'in', $3, 'adjustment', $4, $5)`,
                [tenantId, item.product_id, item.quantity, `Estorno OS #${id}`, req.user.id]
            );
        }

        await query('DELETE FROM service_order_items WHERE id=$1', [itemId]);
        await recalculateOSTotals(id);
        
        await query('COMMIT');
        return res.json({ message: 'Item removido.' });

    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao remover item.' });
    }
};

// --- ATUALIZAR STATUS E FINANCEIRO ---
const updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { status, payment_method, installments } = req.body;

        await query('BEGIN');
        
        const osRes = await query('SELECT * FROM service_orders WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        if (osRes.rows.length === 0) return res.status(404).json({ message: 'OS não encontrada.' });
        const os = osRes.rows[0];

        if (status === 'completed' && os.status !== 'completed' && !os.transaction_id) {
            const total = Number(os.total_amount) - Number(os.discount || 0);
            
            if (total > 0) {
                const clientRes = await query('SELECT name FROM clients WHERE id=$1', [os.client_id]);
                const clientName = clientRes.rows[0]?.name || 'Cliente';

                const numInstallments = Number(installments) > 0 ? Number(installments) : 1;
                const installmentValue = Math.floor((total / numInstallments) * 100) / 100;
                const remainder = total - (installmentValue * numInstallments);
                
                const methodMap = { 'money': 'Dinheiro', 'credit': 'Crédito', 'debit': 'Débito', 'pix': 'PIX' };
                const methodLabel = methodMap[payment_method] || payment_method || 'Avulso';

                let firstTransactionId = null;

                for (let i = 0; i < numInstallments; i++) {
                    const amount = i === numInstallments - 1 ? (installmentValue + remainder) : installmentValue;
                    const dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + (30 * i)); 

                    const desc = numInstallments > 1 
                        ? `OS #${id} (${methodLabel}) - ${i+1}/${numInstallments}` 
                        : `OS #${id} (${methodLabel})`;

                    const transStatus = numInstallments === 1 ? 'completed' : 'pending';

                    const transRes = await query(
                        `INSERT INTO transactions (
                            tenant_id, description, amount, type, status, date, client_id, created_by, installment_index, installments_total
                        ) VALUES ($1, $2, $3, 'income', $4, $5, $6, $7, $8, $9) RETURNING id`,
                        [
                            tenantId, desc, amount, transStatus, dueDate, os.client_id, req.user.id, i + 1, numInstallments
                        ]
                    );

                    if (i === 0) firstTransactionId = transRes.rows[0].id;
                }
                
                if (firstTransactionId) {
                    await query('UPDATE service_orders SET transaction_id = $1 WHERE id = $2', [firstTransactionId, id]);
                }
            }
        }

        await query('UPDATE service_orders SET status = $1 WHERE id = $2', [status, id]);
        
        await query('COMMIT');
        return res.json({ message: `Status atualizado para ${status}.` });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};

// --- HELPER ---
async function recalculateOSTotals(orderId) {
    const prodSum = await query(
        `SELECT COALESCE(SUM(subtotal), 0) as total FROM service_order_items soi
         LEFT JOIN products p ON soi.product_id = p.id
         WHERE soi.service_order_id = $1 AND (p.type = 'product' OR p.type IS NULL)`,
        [orderId]
    );
    
    const servSum = await query(
        `SELECT COALESCE(SUM(subtotal), 0) as total FROM service_order_items soi
         LEFT JOIN products p ON soi.product_id = p.id
         WHERE soi.service_order_id = $1 AND p.type = 'service'`, 
        [orderId]
    );

    const totalParts = Number(prodSum.rows[0].total);
    const totalServices = Number(servSum.rows[0].total);
    const totalAmount = totalParts + totalServices;

    await query(
        `UPDATE service_orders 
         SET total_parts = $1, total_services = $2, total_amount = $3 
         WHERE id = $4`,
        [totalParts, totalServices, totalAmount, orderId]
    );
}

// Aliases para compatibilidade de rotas
const listServiceOrders = listOrders;
const createServiceOrder = createOrder;
const getServiceOrderById = getOrderDetails; // Alias crucial para a rota /:id
const updateServiceOrder = updateOrder;
const updateOSStatus = updateStatus;
const deleteServiceOrder = async (req, res) => { /* Implementar se precisar */ };

module.exports = { 
    listOrders, 
    createOrder, 
    getOrderDetails, 
    updateOrder, 
    addItem, 
    removeItem, 
    updateStatus,
    // Exports com nomes alternativos para garantir que as rotas antigas funcionem
    listServiceOrders,
    createServiceOrder,
    getServiceOrderById,
    updateServiceOrder,
    updateOSStatus,
    deleteServiceOrder
};