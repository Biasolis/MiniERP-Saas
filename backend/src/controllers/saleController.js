const { query } = require('../config/db');

// ==========================================
// 1. CRIAR VENDA (RASCUNHO OU DIRETA)
// ==========================================
const createSale = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const sellerId = req.user.id;
        const { 
            client_id, items, 
            status, // 'draft' ou 'completed'
            total_amount 
        } = req.body;

        // Se for venda direta (PDV), exige itens
        if (status === 'completed' && (!items || items.length === 0)) {
            return res.status(400).json({ message: 'Venda finalizada precisa ter itens.' });
        }

        await query('BEGIN');

        // Cria o Cabeçalho
        const saleRes = await query(
            `INSERT INTO sales (
                tenant_id, seller_id, client_id, total_amount, 
                status, created_at
            ) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id`,
            [
                tenantId, 
                sellerId, 
                client_id || null, 
                total_amount || 0,
                status || 'draft'
            ]
        );
        const saleId = saleRes.rows[0].id;

        // Se tiver itens (Venda Direta), processa agora
        if (items && items.length > 0) {
            for (const item of items) {
                // Insere item
                await query(
                    `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [saleId, item.product_id, item.quantity, item.unit_price, item.subtotal]
                );

                // Se já nasceu finalizada, baixa estoque
                if (status === 'completed') {
                    const quantityToDeduct = Number(item.quantity);
                    await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantityToDeduct, item.product_id]);
                }
            }
        }

        await query('COMMIT');
        return res.status(201).json({ message: 'Venda iniciada com sucesso!', id: saleId });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar venda.' });
    }
};

// ==========================================
// 2. ADICIONAR ITEM (EM RASCUNHO)
// ==========================================
const addItem = async (req, res) => {
    try {
        const { id } = req.params; // Sale ID
        const { product_id, quantity, unit_price } = req.body;
        
        const qty = Number(quantity);
        const price = Number(unit_price);
        const subtotal = qty * price;

        await query('BEGIN');

        // Insere Item
        await query(
            `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, product_id, qty, price, subtotal]
        );

        // Atualiza Total da Venda
        await query(
            `UPDATE sales SET total_amount = total_amount + $1 WHERE id = $2`,
            [subtotal, id]
        );

        await query('COMMIT');
        res.status(201).json({ message: 'Item adicionado' });
    } catch (error) {
        await query('ROLLBACK');
        res.status(500).json({ message: 'Erro ao adicionar item' });
    }
};

// ==========================================
// 3. REMOVER ITEM
// ==========================================
const removeItem = async (req, res) => {
    try {
        const { id, itemId } = req.params; // Sale ID, Item ID

        await query('BEGIN');

        // Busca valor do item para subtrair
        const itemRes = await query('SELECT subtotal FROM sale_items WHERE id = $1', [itemId]);
        if (itemRes.rows.length === 0) return res.status(404).json({message: 'Item não encontrado'});
        
        const subtotal = itemRes.rows[0].subtotal;

        // Remove
        await query('DELETE FROM sale_items WHERE id = $1', [itemId]);

        // Atualiza Total
        await query(
            `UPDATE sales SET total_amount = total_amount - $1 WHERE id = $2`,
            [subtotal, id]
        );

        await query('COMMIT');
        res.json({ message: 'Item removido' });
    } catch (error) {
        await query('ROLLBACK');
        res.status(500).json({ message: 'Erro ao remover item' });
    }
};

// ==========================================
// 4. ATUALIZAR CLIENTE (PATCH)
// ==========================================
const updateSale = async (req, res) => {
    try {
        const { id } = req.params;
        const { client_id } = req.body;

        await query('UPDATE sales SET client_id = $1 WHERE id = $2', [client_id, id]);
        res.json({ message: 'Venda atualizada' });
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar venda' });
    }
};

// ==========================================
// 5. FINALIZAR VENDA (GERA FINANCEIRO)
// ==========================================
const finishSale = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const sellerId = req.user.id;
        const { payment_method, installments, discount } = req.body;

        await query('BEGIN');

        // Busca dados completos da venda
        const saleRes = await query('SELECT * FROM sales WHERE id = $1', [id]);
        const sale = saleRes.rows[0];

        if (sale.status === 'completed') {
            return res.status(400).json({ message: 'Venda já finalizada.' });
        }

        // Calcula totais finais
        const totalBruto = Number(sale.total_amount);
        const valorDesconto = Number(discount || 0);
        const totalLiquido = totalBruto - valorDesconto;

        // 1. Atualiza Status e Valores
        await query(
            `UPDATE sales SET status = 'completed', payment_method = $1, discount = $2, total_amount = $3 
             WHERE id = $4`,
            [payment_method, valorDesconto, totalBruto, id] 
        );

        // 2. Baixa Estoque dos Itens
        const itemsRes = await query('SELECT product_id, quantity FROM sale_items WHERE sale_id = $1', [id]);
        
        for (const item of itemsRes.rows) {
            // CORREÇÃO: Garante que a quantidade seja um número para evitar erro de sintaxe no PG
            const quantityToDeduct = Number(item.quantity);

            await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantityToDeduct, item.product_id]);
            
            // Log de Movimentação
            await query(
                `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, created_by)
                 VALUES ($1, $2, 'out', $3, 'sale', $4)`,
                [tenantId, item.product_id, quantityToDeduct, sellerId]
            );
        }

        // 3. Gera Parcelas Financeiras
        const numInstallments = Number(installments) > 0 ? Number(installments) : 1;
        const installmentValue = totalLiquido / numInstallments;

        for (let i = 0; i < numInstallments; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i); // +1 mês para cada parcela

            await query(
                `INSERT INTO transactions (
                    tenant_id, description, amount, type, status, date, client_id, created_by, installment_index, installments_total
                ) VALUES ($1, $2, $3, 'income', 'pending', $4, $5, $6, $7, $8)`,
                [
                    tenantId, 
                    `Venda #${id} (${i+1}/${numInstallments})`, 
                    installmentValue, 
                    dueDate, 
                    sale.client_id, 
                    sellerId,
                    i + 1,
                    numInstallments
                ]
            );
        }

        await query('COMMIT');
        res.json({ message: 'Venda finalizada com sucesso!' });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Erro ao finalizar venda' });
    }
};

// ==========================================
// LISTAGEM E DETALHES (PADRÃO)
// ==========================================
const getSales = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { client, status, startDate, endDate } = req.query;

        let sql = `
            SELECT s.*, c.name as client_name 
            FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.tenant_id = $1
        `;
        const params = [tenantId];

        if (client) {
            sql += ` AND c.name ILIKE $${params.length + 1}`;
            params.push(`%${client}%`);
        }
        if (status) {
            sql += ` AND s.status = $${params.length + 1}`;
            params.push(status);
        }
        if (startDate) {
            sql += ` AND s.created_at >= $${params.length + 1}`;
            params.push(startDate);
        }

        sql += ` ORDER BY s.created_at DESC`;

        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar vendas.' });
    }
};

const getSaleDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const saleRes = await query(`
            SELECT s.*, c.name as client_name, c.document as client_document
            FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.id = $1 AND s.tenant_id = $2
        `, [id, tenantId]);

        if (saleRes.rows.length === 0) return res.status(404).json({ message: 'Venda não encontrada.' });

        const itemsRes = await query(`
            SELECT si.*, p.name as product_name
            FROM sale_items si
            LEFT JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = $1
        `, [id]);

        return res.json({ sale: saleRes.rows[0], items: itemsRes.rows });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao obter detalhes.' });
    }
};

module.exports = { 
    createSale, 
    getSales, 
    getSaleDetails, 
    addItem, 
    removeItem, 
    updateSale, 
    finishSale 
};