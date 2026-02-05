const { query } = require('../config/db');

// --- HELPER: Calcula Total dos Itens ---
function calculateTotal(items) {
    if (!items || !Array.isArray(items)) return 0;
    return items.reduce((acc, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        return acc + (qty * price);
    }, 0);
}

// ==========================================
// 1. LISTAR VENDAS
// ==========================================
const getSales = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { client, status, startDate, endDate } = req.query;

        let sql = `
            SELECT s.*, c.name as client_name, u.name as seller_name 
            FROM sales s
            LEFT JOIN clients c ON s.client_id = c.id
            LEFT JOIN users u ON s.seller_id = u.id
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
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar vendas.' });
    }
};

// ==========================================
// 2. DETALHES DA VENDA
// ==========================================
const getSaleDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const saleRes = await query(
            `SELECT s.*, c.name as client_name, c.document as client_document, u.name as seller_name 
             FROM sales s
             LEFT JOIN clients c ON s.client_id = c.id
             LEFT JOIN users u ON s.seller_id = u.id
             WHERE s.id = $1 AND s.tenant_id = $2`, 
            [id, tenantId]
        );

        if (saleRes.rows.length === 0) return res.status(404).json({ message: 'Venda não encontrada.' });

        const itemsRes = await query(
            `SELECT si.*, p.name as product_name 
             FROM sale_items si
             LEFT JOIN products p ON si.product_id = p.id
             WHERE si.sale_id = $1`,
            [id]
        );

        return res.json({ sale: saleRes.rows[0], items: itemsRes.rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao buscar detalhes.' });
    }
};

// ==========================================
// 3. CRIAR VENDA (RASCUNHO OU DIRETA/PDV)
// ==========================================
const createSale = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const sellerId = req.user.id;
        const { client_id, items, status, payment_method, notes, discount, pos_session_id } = req.body;

        // Se for venda direta (PDV), exige itens
        if (status === 'completed' && (!items || items.length === 0)) {
            return res.status(400).json({ message: 'Venda finalizada precisa ter itens.' });
        }

        await query('BEGIN');

        // --- CÁLCULO AUTOMÁTICO DO VALOR ---
        const itemsTotal = calculateTotal(items);
        const finalDiscount = Number(discount) || 0;
        const finalTotal = itemsTotal - finalDiscount;

        // Cria o Cabeçalho
        const saleRes = await query(
            `INSERT INTO sales (
                tenant_id, seller_id, client_id, pos_session_id, total_amount, 
                discount, payment_method, status, notes, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) RETURNING id`,
            [
                tenantId, 
                sellerId, 
                client_id || null, 
                pos_session_id || null,
                finalTotal, 
                finalDiscount,
                payment_method || 'cash',
                status || 'draft',
                notes
            ]
        );
        const saleId = saleRes.rows[0].id;

        // Se tiver itens, processa agora
        if (items && items.length > 0) {
            for (const item of items) {
                const itemQty = Number(item.quantity);
                const itemPrice = Number(item.unit_price);
                const itemSubtotal = itemQty * itemPrice;

                // Insere item
                await query(
                    `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [saleId, item.product_id, itemQty, itemPrice, itemSubtotal]
                );

                // Se for venda finalizada, baixa estoque
                if (status === 'completed') {
                    // Baixa Estoque
                    await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [itemQty, item.product_id]);
                    
                    // CORREÇÃO AQUI: Placeholders ajustados para 6 parâmetros
                    await query(
                        `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                         VALUES ($1, $2, 'out', $3, $4, $5, $6)`,
                        [tenantId, item.product_id, itemQty, `Venda PDV #${saleId}`, `Saída automática de venda`, sellerId]
                    );
                }
            }
        }

        // ============================================================
        // REGISTRA TRANSAÇÃO FINANCEIRA (Se venda for concluída)
        // ============================================================
        if (status === 'completed' && finalTotal > 0) {
            const desc = `Venda PDV #${saleId} (${payment_method === 'cash' ? 'Dinheiro' : payment_method === 'credit' ? 'Crédito' : 'Outro'})`;
            
            await query(
                `INSERT INTO transactions (
                    tenant_id, description, amount, type, status, date, client_id, created_by
                ) VALUES ($1, $2, $3, 'income', 'completed', NOW(), $4, $5)`,
                [tenantId, desc, finalTotal, client_id || null, sellerId]
            );
        }

        await query('COMMIT');
        return res.status(201).json({ message: 'Venda processada com sucesso!', id: saleId, total: finalTotal });

    } catch (error) {
        await query('ROLLBACK');
        console.error('Erro no createSale:', error);
        return res.status(500).json({ message: 'Erro ao criar venda.' });
    }
};

// ==========================================
// 4. ADICIONAR ITEM (EM RASCUNHO)
// ==========================================
const addItem = async (req, res) => {
    try {
        const { id } = req.params; // Sale ID
        const { product_id, quantity, unit_price } = req.body;
        
        const qty = Number(quantity);
        const price = Number(unit_price);
        const subtotal = qty * price;

        await query('BEGIN');

        await query(
            `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, product_id, qty, price, subtotal]
        );

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
// 5. REMOVER ITEM
// ==========================================
const removeItem = async (req, res) => {
    try {
        const { id, itemId } = req.params; 

        await query('BEGIN');

        const itemRes = await query('SELECT subtotal FROM sale_items WHERE id = $1', [itemId]);
        if (itemRes.rows.length === 0) return res.status(404).json({message: 'Item não encontrado'});
        
        const subtotal = itemRes.rows[0].subtotal;

        await query('DELETE FROM sale_items WHERE id = $1', [itemId]);

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
// 6. ATUALIZAR CLIENTE (PATCH)
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
// 7. FINALIZAR VENDA (CONVERTE RASCUNHO -> VENDA)
// ==========================================
const finishSale = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        const sellerId = req.user.id;
        const { payment_method, installments, discount } = req.body;

        await query('BEGIN');

        // Busca Venda e Itens para recalcular total
        const saleRes = await query('SELECT * FROM sales WHERE id = $1', [id]);
        if (saleRes.rows.length === 0) throw new Error('Venda não encontrada');
        const sale = saleRes.rows[0];

        if (sale.status === 'completed') {
            await query('ROLLBACK');
            return res.status(400).json({ message: 'Venda já finalizada.' });
        }

        const itemsRes = await query('SELECT product_id, quantity, unit_price FROM sale_items WHERE sale_id = $1', [id]);
        
        // Recalcula Total
        const itemsTotal = calculateTotal(itemsRes.rows);
        const valorDesconto = Number(discount) || 0;
        const totalLiquido = itemsTotal - valorDesconto;

        // 1. Atualiza Status
        await query(
            `UPDATE sales SET status = 'completed', payment_method = $1, discount = $2, total_amount = $3 
             WHERE id = $4`,
            [payment_method, valorDesconto, totalLiquido, id] 
        );

        // 2. Baixa Estoque dos Itens
        for (const item of itemsRes.rows) {
            const quantityToDeduct = Number(item.quantity);

            await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantityToDeduct, item.product_id]);
            
            // CORREÇÃO AQUI: Placeholders ajustados para 6 parâmetros ($1 a $6)
            await query(
                `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                 VALUES ($1, $2, 'out', $3, $4, $5, $6)`,
                [tenantId, item.product_id, quantityToDeduct, `Venda Finalizada #${id}`, `Baixa de estoque`, sellerId]
            );
        }

        // 3. Gera Parcelas Financeiras
        const numInstallments = Number(installments) > 0 ? Number(installments) : 1;
        const installmentValue = totalLiquido / numInstallments;

        for (let i = 0; i < numInstallments; i++) {
            const dueDate = new Date();
            dueDate.setMonth(dueDate.getMonth() + i);

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
        res.json({ message: 'Venda finalizada com sucesso!', total: totalLiquido });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Erro ao finalizar venda' });
    }
};

const deleteSale = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        await query('DELETE FROM sales WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        return res.json({ message: 'Venda excluída.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao excluir venda.' });
    }
};

module.exports = { 
    createSale, 
    getSales, 
    getSaleDetails, 
    addItem, 
    removeItem, 
    updateSale, 
    finishSale,
    deleteSale 
};