const { query } = require('../config/db');

// Criar Entrada de Mercadoria (XML ou Manual)
const createEntry = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { invoice_number, supplier_name, entry_date, items, invoice_url } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'A entrada deve ter pelo menos um item.' });
        }

        await query('BEGIN');

        // 1. Cria Cabeçalho da Entrada
        const entryRes = await query(
            `INSERT INTO product_entries (tenant_id, user_id, invoice_number, supplier_name, entry_date, invoice_url, total_amount)
             VALUES ($1, $2, $3, $4, $5, $6, 0) RETURNING id`,
            [tenantId, userId, invoice_number, supplier_name, entry_date || new Date(), invoice_url]
        );
        const entryId = entryRes.rows[0].id;

        let totalAmount = 0;

        // 2. Processa Itens
        for (const item of items) {
            const qty = Number(item.quantity);
            const cost = Number(item.unit_cost);
            const subtotal = qty * cost;

            // Insere Item da Entrada
            await query(
                `INSERT INTO product_entry_items (entry_id, product_id, quantity, unit_cost, subtotal)
                 VALUES ($1, $2, $3, $4, $5)`,
                [entryId, item.product_id, qty, cost, subtotal]
            );

            // ATUALIZA PRODUTO: Sobe Estoque e Atualiza Custo
            // Aqui usamos o custo da ÚLTIMA entrada como custo atual.
            await query(
                `UPDATE products 
                 SET stock = stock + $1, cost_price = $2 
                 WHERE id = $3 AND tenant_id = $4`,
                [qty, cost, item.product_id, tenantId]
            );

            // Registra Movimentação
            await query(
                `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                 VALUES ($1, $2, 'in', $3, 'purchase', $4, $5)`,
                [tenantId, item.product_id, qty, `NF ${invoice_number || 'S/N'} - ${supplier_name || 'Fornecedor'}`, userId]
            );

            totalAmount += subtotal;
        }

        // 3. Atualiza Total da Entrada
        await query('UPDATE product_entries SET total_amount = $1 WHERE id = $2', [totalAmount, entryId]);

        await query('COMMIT');
        return res.status(201).json({ message: 'Entrada registrada com sucesso!', entryId });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao registrar entrada.' });
    }
};

// Listar Entradas
const getEntries = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query(`
            SELECT e.*, u.name as user_name,
            (SELECT COUNT(*) FROM product_entry_items WHERE entry_id = e.id) as items_count
            FROM product_entries e
            LEFT JOIN users u ON e.user_id = u.id
            WHERE e.tenant_id = $1
            ORDER BY e.entry_date DESC
        `, [tenantId]);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar entradas.' });
    }
};

// Detalhes da Entrada
const getEntryDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const entryRes = await query('SELECT * FROM product_entries WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        if (entryRes.rows.length === 0) return res.status(404).json({ message: 'Entrada não encontrada.' });

        const itemsRes = await query(`
            SELECT i.*, p.name as product_name, p.sku
            FROM product_entry_items i
            JOIN products p ON i.product_id = p.id
            WHERE i.entry_id = $1
        `, [id]);

        return res.json({ entry: entryRes.rows[0], items: itemsRes.rows });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao carregar detalhes.' });
    }
};

module.exports = { createEntry, getEntries, getEntryDetails };