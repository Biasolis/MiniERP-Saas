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

        if (status) {
            sql += ` AND q.status = $2`;
            params.push(status);
        }

        sql += ` ORDER BY q.created_at DESC`;
        
        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar orçamentos.' });
    }
};

// Detalhes
const getQuoteDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const quoteRes = await query(`
            SELECT q.*, c.email, c.phone, c.address, c.document
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

        // Busca dados da empresa para impressão
        const tenantRes = await query('SELECT name, address, phone, email_contact, document, footer_message FROM tenants WHERE id = $1', [tenantId]);

        return res.json({ 
            quote: quoteRes.rows[0], 
            items: itemsRes.rows,
            company: tenantRes.rows[0]
        });
    } catch (error) {
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
            `INSERT INTO quotes (tenant_id, client_id, client_name, discount, notes, valid_until, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
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
            // Lógica simplificada de criar venda (Chama insert direto ou poderia reutilizar controller se refatorado)
            // Aqui faremos a inserção direta para performance e atomicidade
            const saleRes = await query(
                `INSERT INTO sales (tenant_id, seller_id, client_id, total_amount, status, payment_method, discount, created_at)
                 VALUES ($1, $2, $3, $4, 'pending', 'pending', $5, NOW()) RETURNING id`,
                [tenantId, req.user.id, quote.client_id, quote.total_amount, quote.discount]
            );
            const saleId = saleRes.rows[0].id;
            newId = saleId;

            // Migrar Itens e Baixar Estoque
            for (const item of items) {
                // Insere item venda
                await query(
                    `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [saleId, item.product_id, item.quantity, item.unit_price, item.subtotal]
                );
                
                // Baixa Estoque (Se for produto)
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
                // OBS: Na OS, o estoque só baixa quando efetivamente usa, ou se configurado.
                // Aqui vamos reservar/baixar se o usuário confirmar no fluxo da OS depois.
            }
            
            // Recalcula totais da OS para garantir
            // (Poderia chamar a função recalculateOSTotals se ela estivesse exportada ou replicar logica)
            await query(`UPDATE service_orders SET total_amount = $1 WHERE id = $2`, [quote.total_amount, osId]);
        }

        // Atualiza status do orçamento
        await query("UPDATE quotes SET status = 'converted' WHERE id = $1", [id]);

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

module.exports = { listQuotes, createQuote, getQuoteDetails, convertQuote, deleteQuote };