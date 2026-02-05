const { query } = require('../config/db');

// Listar Orçamentos
const listQuotes = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { status } = req.query;
        
        let sql = `
            SELECT q.*, c.name as client_real_name 
            FROM quotes q
            LEFT JOIN clients c ON q.client_id = c.id
            WHERE q.tenant_id = $1
        `;
        const params = [tenantId];

        if (status && status !== 'all') {
            sql += ` AND q.status = $2`;
            params.push(status);
        }

        sql += ` ORDER BY q.created_at DESC`;
        
        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar orçamentos.' });
    }
};

// Detalhes
const getQuoteDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const quoteRes = await query(`
            SELECT q.*, c.email, c.phone, c.address, c.document, c.name as client_real_name
            FROM quotes q
            LEFT JOIN clients c ON q.client_id = c.id
            WHERE q.id = $1 AND q.tenant_id = $2
        `, [id, tenantId]);

        if (quoteRes.rows.length === 0) return res.status(404).json({ message: 'Orçamento não encontrado.' });

        const itemsRes = await query(`
            SELECT qi.*, p.name as product_name
            FROM quote_items qi
            LEFT JOIN products p ON qi.product_id = p.id
            WHERE qi.quote_id = $1
        `, [id]);

        // Busca dados da empresa para exibir no frontend se necessário
        const tenantRes = await query('SELECT name, address, phone, email_contact, document, footer_message FROM tenants WHERE id = $1', [tenantId]);

        return res.json({ 
            quote: quoteRes.rows[0], 
            items: itemsRes.rows,
            company: tenantRes.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao buscar detalhes.' });
    }
};

// Criar Orçamento
const createQuote = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { client_id, client_name, items, discount, notes, valid_until } = req.body;

        if (!items || items.length === 0) return res.status(400).json({ message: 'Adicione itens.' });

        await query('BEGIN');

        // Header
        const quoteRes = await query(
            `INSERT INTO quotes (tenant_id, client_id, client_name, discount, notes, valid_until, created_by, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'draft') RETURNING id`,
            [tenantId, client_id || null, client_name, discount || 0, notes, valid_until, userId]
        );
        const quoteId = quoteRes.rows[0].id;

        let totalAmount = 0;

        // Items
        for (const item of items) {
            const subtotal = Number(item.quantity) * Number(item.unit_price);
            totalAmount += subtotal;

            await query(
                `INSERT INTO quote_items (quote_id, product_id, description, quantity, unit_price, subtotal)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [quoteId, item.product_id || null, item.description, item.quantity, item.unit_price, subtotal]
            );
        }

        const finalTotal = totalAmount - (Number(discount) || 0);
        await query('UPDATE quotes SET total_amount = $1 WHERE id = $2', [finalTotal, quoteId]);

        await query('COMMIT');
        return res.status(201).json({ id: quoteId, message: 'Orçamento criado.' });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar orçamento.' });
    }
};

// Converter Orçamento (Venda ou OS)
const convertQuote = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { target } = req.body; // 'sale' ou 'service_order'

        await query('BEGIN');

        // 1. Busca dados do orçamento
        const quoteRes = await query('SELECT * FROM quotes WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        if (quoteRes.rows.length === 0) return res.status(404).json({ message: 'Orçamento não encontrado.' });
        const quote = quoteRes.rows[0];

        const itemsRes = await query('SELECT * FROM quote_items WHERE quote_id=$1', [id]);
        const items = itemsRes.rows;

        let newId = null;

        if (target === 'sale') {
            const saleRes = await query(
                `INSERT INTO sales (tenant_id, seller_id, client_id, total_amount, status, payment_method, discount, created_at)
                 VALUES ($1, $2, $3, $4, 'pending', 'pending', $5, NOW()) RETURNING id`,
                [tenantId, req.user.id, quote.client_id, quote.total_amount, quote.discount]
            );
            const saleId = saleRes.rows[0].id;
            newId = saleId;

            for (const item of items) {
                await query(
                    `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [saleId, item.product_id, item.quantity, item.unit_price, item.subtotal]
                );
                
                if (item.product_id) {
                    const prodInfo = await query('SELECT type FROM products WHERE id=$1', [item.product_id]);
                    if (prodInfo.rows[0]?.type === 'product') {
                        await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
                    }
                }
            }

        } else if (target === 'service_order') {
            const osRes = await query(
                `INSERT INTO service_orders (tenant_id, client_id, client_name, equipment, description, status, total_amount, discount, created_at)
                 VALUES ($1, $2, $3, 'A definir', $4, 'open', $5, $6, NOW()) RETURNING id`,
                [tenantId, quote.client_id, quote.client_name, `Gerado via Orçamento #${quote.id}. ${quote.notes || ''}`, quote.total_amount, quote.discount]
            );
            const osId = osRes.rows[0].id;
            newId = osId;

            for (const item of items) {
                await query(
                    `INSERT INTO service_order_items (tenant_id, service_order_id, product_id, description, quantity, unit_price, subtotal)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [tenantId, osId, item.product_id, item.description, item.quantity, item.unit_price, item.subtotal]
                );
            }
            
            await query(`UPDATE service_orders SET total_amount = $1 WHERE id = $2`, [quote.total_amount, osId]);
        }

        // Atualiza status do orçamento para Aprovado (approved) ou Convertido
        await query("UPDATE quotes SET status = 'approved' WHERE id = $1", [id]);

        await query('COMMIT');
        return res.json({ message: 'Convertido com sucesso!', newId, target });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao converter.' });
    }
};

const deleteQuote = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        await query('DELETE FROM quotes WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        return res.json({ message: 'Orçamento excluído.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao excluir.' });
    }
};

// --- IMPRESSÃO DE ORÇAMENTO (NOVO) ---
const print = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { mode } = req.query; // 'a4', 'thermal'

        // 1. Busca Dados do Orçamento
        const quoteRes = await query(`
            SELECT q.*, 
                   c.name as client_real_name, c.phone as client_phone, c.document as client_doc,
                   c.address, c.number, c.neighborhood, c.city, c.state, c.email as client_email,
                   t.name as tenant_name, t.phone as tenant_phone, t.document as tenant_doc,
                   t.logo_url, t.email_contact, t.website
            FROM quotes q
            LEFT JOIN clients c ON q.client_id = c.id
            JOIN tenants t ON q.tenant_id = t.id
            WHERE q.id = $1 AND q.tenant_id = $2
        `, [id, tenantId]);

        if (quoteRes.rows.length === 0) return res.status(404).send('Orçamento não encontrado.');
        const quote = quoteRes.rows[0];

        // 2. Busca Itens
        const itemsRes = await query(
            'SELECT * FROM quote_items WHERE quote_id = $1', 
            [id]
        );
        const items = itemsRes.rows;

        // Formatação de Moeda
        const formatMoney = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        // 3. Estilos e Layout (@page para impressão correta)
        let pageStyle = '';
        if (mode === 'thermal') {
            pageStyle = `
                @page { size: 80mm auto; margin: 0; } 
                body { width: 72mm; font-family: 'Courier New', monospace; font-size: 11px; padding: 5px; margin: 0 auto; }
                .header { border-bottom: 1px dashed #000; }
                .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            `;
        } else {
            pageStyle = `
                @page { size: A4; margin: 15mm; } 
                body { font-family: Helvetica, Arial, sans-serif; font-size: 12px; color: #333; }
                .header { border-bottom: 2px solid #333; }
                .line { border-bottom: 1px solid #ccc; margin: 10px 0; }
            `;
        }

        const html = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Orçamento #${String(quote.id).substring(0,8)}</title>
            <style>
                ${pageStyle}
                * { box-sizing: border-box; }
                /* Ajuste para impressão de background colors */
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
                
                .header { text-align: center; padding-bottom: 10px; margin-bottom: 20px; }
                .title { font-size: 1.5em; font-weight: bold; text-transform: uppercase; color: #2563eb; }
                
                .grid { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 20px; }
                .box { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
                .box-title { font-weight: bold; background: #f3f4f6; padding: 5px; margin: -10px -10px 10px -10px; border-bottom: 1px solid #ddd; font-size: 0.9em; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #333; color: white; padding: 8px; text-align: left; font-size: 0.9em; }
                td { border-bottom: 1px solid #eee; padding: 8px; vertical-align: top; }
                .right { text-align: right; }
                
                .totals { margin-top: 20px; text-align: right; font-size: 1.1em; }
                .total-final { font-size: 1.4em; font-weight: bold; color: #2563eb; margin-top: 5px; }
                .notes { margin-top: 30px; font-size: 0.9em; color: #555; background: #fff9db; padding: 10px; border-radius: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <div style="font-size: 1.4em; font-weight: bold; color: #000;">${quote.tenant_name}</div>
                <div style="font-size: 0.9em; color: #555;">${quote.tenant_doc || ''} | ${quote.tenant_phone || ''}</div>
                <div style="font-size: 0.9em; color: #555;">${quote.email_contact || ''}</div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:20px;">
                <div>
                    <div style="font-size: 1.8em; font-weight: bold; color: #444;">ORÇAMENTO</div>
                    <div style="color: #666;">#${String(quote.id).substring(0, 8)}</div>
                </div>
                <div style="text-align:right;">
                    <div><strong>Emissão:</strong> ${new Date(quote.created_at).toLocaleDateString('pt-BR')}</div>
                    <div><strong>Validade:</strong> ${quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('pt-BR') : '15 dias'}</div>
                </div>
            </div>

            <div class="grid">
                <div class="box">
                    <div class="box-title">CLIENTE</div>
                    <div><strong>Nome:</strong> ${quote.client_real_name || quote.client_name || 'Consumidor Final'}</div>
                    <div><strong>Email:</strong> ${quote.client_email || '-'}</div>
                    <div><strong>Tel:</strong> ${quote.client_phone || '-'}</div>
                    <div>${quote.city ? `${quote.city}/${quote.state}` : ''}</div>
                </div>
                <div class="box" style="max-width: 150px; text-align: center;">
                    <div class="box-title">STATUS</div>
                    <div style="font-size:1.1em; text-transform: uppercase; margin-top: 10px; font-weight: bold; color: #555;">
                        ${quote.status === 'draft' ? 'Rascunho' : quote.status === 'approved' ? 'Aprovado' : 'Enviado'}
                    </div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>Descrição / Produto</th>
                        <th class="right" style="width: 60px;">Qtd</th>
                        <th class="right" style="width: 100px;">Unit.</th>
                        <th class="right" style="width: 100px;">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>${item.description || 'Produto sem nome'}</td>
                            <td class="right">${Number(item.quantity)}</td>
                            <td class="right">${formatMoney(item.unit_price)}</td>
                            <td class="right">${formatMoney(item.subtotal)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="totals">
                <div>Subtotal: ${formatMoney(Number(quote.total_amount) + Number(quote.discount || 0))}</div>
                ${Number(quote.discount) > 0 ? `<div style="color: #d32f2f;">Desconto: - ${formatMoney(quote.discount)}</div>` : ''}
                <div class="total-final">TOTAL: ${formatMoney(quote.total_amount)}</div>
            </div>

            ${quote.notes ? `
                <div class="notes">
                    <strong>Observações:</strong><br/>
                    ${quote.notes.replace(/\n/g, '<br>')}
                </div>
            ` : ''}

            <div style="margin-top: 50px; text-align: center; font-size: 0.8em; color: #888; border-top: 1px solid #eee; padding-top: 10px;">
                Este documento não possui valor fiscal. Gerado em ${new Date().toLocaleString('pt-BR')}.
            </div>

            <script>
                // Imprime automaticamente ao carregar
                window.onload = () => { window.print(); }
            </script>
        </body>
        </html>
        `;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);

    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao imprimir orçamento.');
    }
};

module.exports = { listQuotes, createQuote, getQuoteDetails, convertQuote, deleteQuote, print };