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

        // 4. Busca Dados da Empresa
        const tenantRes = await query(
            `SELECT name, document, phone, email_contact, address, footer_message,
                    os_observation_message, os_warranty_terms
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

// --- IMPRESSÃO (CORRIGIDA: UTF-8 + LAYOUT @PAGE) ---
const printOrder = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { mode } = req.query; // 'thermal', 'a4', 'a5_landscape'

        // 1. Busca Dados da OS + Tenant
        const osRes = await query(`
            SELECT so.*, 
                   c.name as client_name, c.phone as client_phone, c.document as client_doc,
                   c.address, c.number, c.neighborhood, c.city, c.state,
                   t.name as tenant_name, t.phone as tenant_phone, t.document as tenant_doc,
                   t.logo_url, t.os_warranty_terms, t.os_observation_message
            FROM service_orders so
            JOIN clients c ON so.client_id = c.id
            JOIN tenants t ON so.tenant_id = t.id
            WHERE so.id = $1 AND so.tenant_id = $2
        `, [id, tenantId]);

        if (osRes.rows.length === 0) return res.status(404).send('OS não encontrada.');
        const os = osRes.rows[0];

        const itemsRes = await query(
            'SELECT * FROM service_order_items WHERE service_order_id = $1', 
            [id]
        );
        const items = itemsRes.rows;

        // Helper para formatar moeda BRL
        const formatMoney = (value) => {
            return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
        };

        // 2. CSS DINÂMICO (@page e estilos)
        let pageStyle = '';
        let contentHtml = '';

        if (mode === 'thermal') {
            // --- MODO CUPOM TÉRMICO (80mm) ---
            pageStyle = `
                @page { size: 80mm auto; margin: 0; }
                body { width: 72mm; padding: 4mm; font-family: 'Courier New', monospace; font-size: 11px; margin: 0 auto; }
                .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
                .title { font-size: 14px; font-weight: bold; }
                .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                table { width: 100%; font-size: 11px; border-collapse: collapse; }
                td { vertical-align: top; }
                .right { text-align: right; }
                .center { text-align: center; }
                .total { font-size: 14px; font-weight: bold; text-align: right; margin-top: 5px; }
            `;

            contentHtml = `
                <div class="header">
                    <div class="title">${os.tenant_name}</div>
                    <div>${os.tenant_phone || ''}</div>
                    <br/>
                    <strong>OS Nº ${String(os.id).padStart(6, '0')}</strong><br/>
                    ${new Date(os.created_at).toLocaleString('pt-BR')}
                </div>
                
                <div>
                    <strong>CLI:</strong> ${os.client_name}<br/>
                    <strong>EQP:</strong> ${os.equipment}
                </div>

                <div class="line"></div>

                <table>
                    <thead><tr><th align="left">Qtd Item</th><th align="right">Total</th></tr></thead>
                    <tbody>
                        ${items.map(i => `
                            <tr>
                                <td>${Number(i.quantity)}x ${i.description}</td>
                                <td class="right">${formatMoney(i.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="line"></div>
                <div class="total">TOTAL: ${formatMoney(os.total_amount)}</div>
                
                <div class="center" style="margin-top:15px; font-size:10px;">
                    www.minierp.com.br
                </div>
            `;

        } else if (mode === 'a5_landscape') {
            // --- MODO A5 PAISAGEM (Meia Folha) ---
            pageStyle = `
                @page { size: A5 landscape; margin: 10mm; }
                body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; }
                .header-box { border: 1px solid #000; padding: 10px; display: flex; justify-content: space-between; margin-bottom: 8px; }
                .box { border: 1px solid #000; padding: 5px; margin-bottom: 5px; }
                .box-title { font-weight: bold; background: #eee; padding: 2px 5px; border-bottom: 1px solid #000; margin: -5px -5px 5px -5px; font-size: 10px; }
                table { width: 100%; border-collapse: collapse; font-size: 11px; }
                th, td { border: 1px solid #ccc; padding: 4px; text-align: left; }
                th { background: #f0f0f0; }
                .right { text-align: right; }
                .total-big { font-size: 14px; font-weight: bold; text-align: right; margin-top: 5px; }
            `;

            contentHtml = `
                <div class="header-box">
                    <div>
                        <div style="font-size:14px; font-weight:bold;">${os.tenant_name}</div>
                        <div>${os.tenant_phone || ''} | ${os.email_contact || ''}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:16px; font-weight:bold;">OS Nº ${String(os.id).padStart(6, '0')}</div>
                        <div>Data: ${new Date(os.created_at).toLocaleDateString('pt-BR')}</div>
                    </div>
                </div>

                <div style="display:flex; gap:10px;">
                    <div class="box" style="flex:1">
                        <div class="box-title">DADOS DO CLIENTE</div>
                        <div><strong>Nome:</strong> ${os.client_name}</div>
                        <div><strong>Tel:</strong> ${os.client_phone || '-'}</div>
                    </div>
                    <div class="box" style="flex:1">
                        <div class="box-title">EQUIPAMENTO / SERVIÇO</div>
                        <div><strong>Equip.:</strong> ${os.equipment}</div>
                        <div><strong>Defeito:</strong> ${os.description}</div>
                    </div>
                </div>

                <div class="box">
                    <div class="box-title">ITENS E SERVIÇOS</div>
                    <table>
                        <thead>
                            <tr><th>Descrição</th><th style="width:40px; text-align:center">Qtd</th><th style="width:70px" class="right">Unit.</th><th style="width:70px" class="right">Total</th></tr>
                        </thead>
                        <tbody>
                            ${items.map(i => `
                                <tr>
                                    <td>${i.description}</td>
                                    <td style="text-align:center">${Number(i.quantity)}</td>
                                    <td class="right">${formatMoney(i.unit_price)}</td>
                                    <td class="right">${formatMoney(i.subtotal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="total-big">
                    TOTAL: ${formatMoney(os.total_amount)}
                </div>

                <div style="font-size:9px; margin-top:10px; border-top:1px solid #ccc; padding-top:2px;">
                    ${os.os_warranty_terms || 'Garantia de 90 dias.'}
                </div>
                
                <div style="display:flex; justify-content:space-between; margin-top:25px;">
                    <div style="border-top:1px solid #000; width:40%; text-align:center; font-size:9px;">Assinatura Técnico</div>
                    <div style="border-top:1px solid #000; width:40%; text-align:center; font-size:9px;">Assinatura Cliente</div>
                </div>
            `;

        } else {
            // --- MODO A4 PADRÃO ---
            pageStyle = `
                @page { size: A4; margin: 15mm; }
                body { font-family: 'Helvetica', Arial, sans-serif; font-size: 12px; color: #000; margin: 0; }
                .header-container { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; }
                .company-info h1 { margin: 0; font-size: 20px; }
                .os-number { font-size: 22px; font-weight: bold; color: #d32f2f; }
                
                .section-title { background: #eee; padding: 5px 10px; font-weight: bold; border-left: 5px solid #333; margin: 15px 0 5px 0; text-transform: uppercase; font-size: 11px; }
                .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                .field { margin-bottom: 4px; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #333; color: #fff; padding: 8px; text-align: left; font-size: 11px; }
                td { border-bottom: 1px solid #eee; padding: 8px; }
                .right { text-align: right; }
                
                .footer-total { margin-top: 20px; text-align: right; font-size: 16px; background: #f9f9f9; padding: 10px; border: 1px solid #ddd; font-weight: bold; }
                .signatures { display: flex; justify-content: space-between; margin-top: 60px; }
                .sig-box { width: 40%; border-top: 1px solid #000; text-align: center; padding-top: 5px; font-size: 11px; }
            `;

            contentHtml = `
                <div class="header-container">
                    <div class="company-info">
                        <h1>${os.tenant_name}</h1>
                        <div>CNPJ: ${os.tenant_doc || '-'}</div>
                        <div>Tel: ${os.tenant_phone || ''}</div>
                        <div>${os.email_contact || ''}</div>
                    </div>
                    <div style="text-align:right">
                        <div class="os-number">OS #${String(os.id).padStart(6, '0')}</div>
                        <div>Abertura: ${new Date(os.created_at).toLocaleDateString('pt-BR')}</div>
                        <div>Status: <strong>${os.status === 'open' ? 'Aberta' : os.status === 'completed' ? 'Finalizada' : 'Em Andamento'}</strong></div>
                    </div>
                </div>

                <div class="grid-2">
                    <div>
                        <div class="section-title">Dados do Cliente</div>
                        <div class="field"><strong>Nome:</strong> ${os.client_name}</div>
                        <div class="field"><strong>CPF/CNPJ:</strong> ${os.client_doc || '-'}</div>
                        <div class="field"><strong>Telefone:</strong> ${os.client_phone || '-'}</div>
                        <div class="field"><strong>Endereço:</strong> ${os.address || ''}, ${os.number || ''}</div>
                        <div class="field"><strong>Cidade:</strong> ${os.city || ''} - ${os.state || ''}</div>
                    </div>
                    <div>
                        <div class="section-title">Dados do Equipamento</div>
                        <div class="field"><strong>Equipamento:</strong> ${os.equipment}</div>
                        <div class="field"><strong>Prioridade:</strong> ${os.priority === 'high' ? 'Alta' : 'Normal'}</div>
                        <div class="field">
                            <strong>Descrição do Defeito / Serviço:</strong><br/>
                            ${os.description}
                        </div>
                    </div>
                </div>

                <div class="section-title" style="margin-top:20px;">Itens, Peças e Serviços</div>
                <table>
                    <thead>
                        <tr>
                            <th>Descrição</th>
                            <th style="width: 60px; text-align: center;">Qtd</th>
                            <th style="width: 100px;" class="right">Vlr. Unit.</th>
                            <th style="width: 100px;" class="right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                         ${items.map(i => `
                            <tr>
                                <td>${i.description}</td>
                                <td style="text-align: center;">${Number(i.quantity)}</td>
                                <td class="right">${formatMoney(i.unit_price)}</td>
                                <td class="right">${formatMoney(i.subtotal)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer-total">
                    Total Geral: ${formatMoney(os.total_amount)}
                </div>

                ${os.os_observation_message ? `
                    <div class="section-title">Observações Técnicas</div>
                    <div style="padding:5px; font-size:12px;">${os.os_observation_message}</div>
                ` : ''}

                <div style="margin-top: 30px; font-size: 11px; text-align: justify; color: #555;">
                    <strong>Termos e Condições:</strong><br/>
                    ${os.os_warranty_terms || 'Garantia de 90 dias para mão de obra e peças substituídas.'}
                </div>

                <div class="signatures">
                    <div class="sig-box">Assinatura do Técnico</div>
                    <div class="sig-box">Assinatura do Cliente</div>
                </div>
            `;
        }

        // 3. Montagem Final (HTML + Charset UTF-8)
        const finalHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Impressão OS #${os.id}</title>
                <style>
                    * { box-sizing: border-box; }
                    /* Garante impressão correta de fundos coloridos */
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                    ${pageStyle}
                </style>
            </head>
            <body>
                ${contentHtml}
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(finalHtml);

    } catch (error) {
        console.error('Erro ao imprimir:', error);
        res.status(500).send('Erro ao gerar impressão.');
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

// Aliases
const listServiceOrders = listOrders;
const createServiceOrder = createOrder;
const getServiceOrderById = getOrderDetails;
const updateServiceOrder = updateOrder;
const updateOSStatus = updateStatus;
const deleteServiceOrder = async (req, res) => { /* ... */ };

module.exports = { 
    listOrders, 
    createOrder, 
    getOrderDetails, 
    updateOrder, 
    addItem, 
    removeItem, 
    updateStatus,
    print: printOrder,
    listServiceOrders,
    createServiceOrder,
    getServiceOrderById,
    updateServiceOrder,
    updateOSStatus,
    deleteServiceOrder
};