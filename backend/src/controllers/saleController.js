const { query } = require('../config/db');

// Criar Venda (PDV)
const createSale = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const sellerId = req.user.id;
        const { 
            client_id, items, 
            payment_method, discount, amount_paid, notes,
            installments // <--- NOVO CAMPO (Número de parcelas)
        } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ message: 'O carrinho está vazio.' });
        }

        await query('BEGIN');

        // 1. Busca dados do vendedor (para comissão)
        const userRes = await query('SELECT commission_rate FROM users WHERE id = $1', [sellerId]);
        const sellerDefaultCommission = Number(userRes.rows[0]?.commission_rate || 0);

        // 2. Cria Cabeçalho da Venda
        const saleRes = await query(
            `INSERT INTO sales (
                tenant_id, seller_id, client_id, total_amount, 
                status, payment_method, discount, amount_paid, change_amount, notes
            ) VALUES ($1, $2, $3, 0, 'completed', $4, $5, $6, $7, $8) RETURNING id`,
            [
                tenantId, sellerId, client_id || null, 
                payment_method || 'cash', 
                discount || 0, 
                amount_paid || 0, 
                0, 
                notes || ''
            ]
        );
        const saleId = saleRes.rows[0].id;

        let totalItemsAmount = 0;
        let totalCommissionAmount = 0;

        // 3. Processa Itens
        for (const item of items) {
            const qty = Number(item.quantity);
            const price = Number(item.unit_price);
            const subtotal = qty * price;

            // Busca produto
            const prodRes = await query('SELECT type, stock, name, commission_rate FROM products WHERE id = $1', [item.product_id]);
            
            if (prodRes.rows.length === 0) {
                await query('ROLLBACK');
                return res.status(400).json({ message: `Produto ID ${item.product_id} não encontrado.` });
            }

            const product = prodRes.rows[0];

            // Valida Estoque
            if (product.type === 'product' && product.stock < qty) {
                await query('ROLLBACK');
                return res.status(400).json({ message: `Estoque insuficiente para: ${product.name}` });
            }

            // Comissão
            const rateToUse = product.commission_rate !== null ? Number(product.commission_rate) : sellerDefaultCommission;
            const itemCommission = subtotal * (rateToUse / 100);

            // Insere Item
            await query(
                `INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, commission_amount)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [saleId, item.product_id, qty, price, subtotal, itemCommission]
            );

            // Baixa Estoque
            if (product.type === 'product') {
                await query('UPDATE products SET stock = stock - $1 WHERE id = $2', [qty, item.product_id]);
                await query(
                    `INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                     VALUES ($1, $2, 'out', $3, 'sale', $4, $5)`,
                    [tenantId, item.product_id, qty, `Venda #${saleId}`, sellerId]
                );
            }

            totalItemsAmount += subtotal;
            totalCommissionAmount += itemCommission;
        }

        // 4. Cálculos Finais
        const finalTotal = totalItemsAmount - (Number(discount) || 0);
        const change = (Number(amount_paid) || 0) - finalTotal;

        // Atualiza Venda
        await query(
            `UPDATE sales SET total_amount = $1, change_amount = $2 WHERE id = $3`, 
            [finalTotal, change > 0 ? change : 0, saleId]
        );

        // 5. GERAÇÃO FINANCEIRA (COM PARCELAMENTO)
        const numInstallments = Number(installments) > 0 ? Number(installments) : 1;
        const methodMap = { 'money': 'Dinheiro', 'credit': 'Crédito', 'debit': 'Débito', 'pix': 'PIX' };
        const methodLabel = methodMap[payment_method] || payment_method;

        // Lógica de divisão de valor
        const installmentValue = Math.floor((finalTotal / numInstallments) * 100) / 100;
        const remainder = finalTotal - (installmentValue * numInstallments); // Centavos que sobram

        for (let i = 0; i < numInstallments; i++) {
            // Se for a última parcela, soma a diferença de centavos
            const amount = i === numInstallments - 1 ? (installmentValue + remainder) : installmentValue;
            
            // Calcula Data de Vencimento (Hoje + 30 dias * i)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + (30 * i)); // Regra simples de 30 dias

            // Status: Se for dinheiro/pix ou cartão à vista (1x), já nasce pago. Se for prazo, nasce pendente.
            // Aqui vamos assumir: Vendas PDV geralmente já nascem pagas ou a primeira paga.
            // Para simplificar PDV: Tudo 'completed' pois assume-se que passou o cartão na hora.
            // Se fosse boleto, seria 'pending'. Vamos manter 'completed' para PDV padrão por enquanto.
            const status = 'completed'; 

            const desc = numInstallments > 1 
                ? `Venda PDV #${saleId} (${methodLabel}) - Parcela ${i+1}/${numInstallments}`
                : `Venda PDV #${saleId} (${methodLabel})`;

            await query(
                `INSERT INTO transactions (
                    tenant_id, description, amount, type, status, date, client_id, created_by, installment_index, installments_total
                ) VALUES ($1, $2, $3, 'income', $4, $5, $6, $7, $8, $9)`,
                [
                    tenantId, 
                    desc, 
                    amount, 
                    status, 
                    dueDate, 
                    client_id || null, 
                    sellerId,
                    i + 1,
                    numInstallments
                ]
            );
        }

        // 6. Comissão
        if (totalCommissionAmount > 0) {
            await query(
                `INSERT INTO commissions (tenant_id, seller_id, sale_id, amount, status)
                 VALUES ($1, $2, $3, $4, 'pending')`,
                [tenantId, sellerId, saleId, totalCommissionAmount]
            );
        }

        await query('COMMIT');
        return res.status(201).json({ message: 'Venda realizada com sucesso!', saleId });

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao processar venda.' });
    }
};

// Listar Vendas
const getSales = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query(`
            SELECT s.*, u.name as seller_name, c.name as client_name
            FROM sales s
            LEFT JOIN users u ON s.seller_id = u.id
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.tenant_id = $1
            ORDER BY s.created_at DESC
        `, [tenantId]);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar vendas.' });
    }
};

// Detalhes da Venda
const getSaleDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const saleRes = await query(`
            SELECT s.*, u.name as seller_name, c.name as client_name
            FROM sales s
            LEFT JOIN users u ON s.seller_id = u.id
            LEFT JOIN clients c ON s.client_id = c.id
            WHERE s.id = $1 AND s.tenant_id = $2
        `, [id, tenantId]);

        if (saleRes.rows.length === 0) return res.status(404).json({ message: 'Venda não encontrada.' });

        const itemsRes = await query(`
            SELECT i.*, p.name as product_name
            FROM sale_items i
            JOIN products p ON i.product_id = p.id
            WHERE i.sale_id = $1
        `, [id]);

        return res.json({ sale: saleRes.rows[0], items: itemsRes.rows });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao obter detalhes.' });
    }
};

// Relatório de Comissões
const getCommissions = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { seller_id, status } = req.query;

        let sql = `
            SELECT c.*, u.name as seller_name, s.created_at as sale_date, s.total_amount as sale_total
            FROM commissions c
            JOIN users u ON c.seller_id = u.id
            JOIN sales s ON c.sale_id = s.id
            WHERE c.tenant_id = $1
        `;
        const params = [tenantId];

        if (seller_id) {
            sql += ` AND c.seller_id = $${params.length + 1}`;
            params.push(seller_id);
        }
        if (status) {
            sql += ` AND c.status = $${params.length + 1}`;
            params.push(status);
        }

        sql += ` ORDER BY c.created_at DESC`;

        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar comissões.' });
    }
};

module.exports = { createSale, getSales, getSaleDetails, getCommissions };