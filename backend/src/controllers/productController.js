const { query } = require('../config/db');

// Listar Produtos
const getProducts = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        // Traz produtos e calcula status do estoque
        const sql = `
            SELECT *, 
            (sale_price - cost_price) as profit_margin,
            CASE WHEN stock <= min_stock THEN true ELSE false END as low_stock_alert
            FROM products 
            WHERE tenant_id = $1 
            ORDER BY name ASC
        `;
        const result = await query(sql, [tenantId]);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar produtos.' });
    }
};

// Obter Produto Detalhado (Com Histórico)
const getProductDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const productId = req.params.id;

        const prodResult = await query('SELECT * FROM products WHERE id = $1 AND tenant_id = $2', [productId, tenantId]);
        if (prodResult.rows.length === 0) return res.status(404).json({ message: 'Produto não encontrado.' });

        const historyResult = await query(`
            SELECT m.*, u.name as user_name 
            FROM inventory_movements m
            LEFT JOIN users u ON m.created_by = u.id
            WHERE m.product_id = $1 
            ORDER BY m.created_at DESC LIMIT 20
        `, [productId]);

        return res.json({ product: prodResult.rows[0], history: historyResult.rows });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao carregar detalhes.' });
    }
};

// Criar Produto
const createProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { name, description, sale_price, cost_price, stock, min_stock, sku, unit, category } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        // Inicia transação (segurança de dados)
        await query('BEGIN');

        const insertSql = `
            INSERT INTO products (tenant_id, name, description, sale_price, cost_price, stock, min_stock, sku, unit, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;
        const result = await query(insertSql, [
            tenantId, name, description, 
            sale_price || 0, cost_price || 0, stock || 0, 
            min_stock || 5, sku, unit || 'un', category
        ]);
        const newProduct = result.rows[0];

        // Se criou com estoque inicial > 0, registra movimentação
        if (stock > 0) {
            await query(`
                INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                VALUES ($1, $2, 'in', $3, 'adjustment', 'Estoque Inicial', $4)
            `, [tenantId, newProduct.id, stock, userId]);
        }

        await query('COMMIT');
        return res.status(201).json(newProduct);

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar produto.' });
    }
};

// Atualizar Produto (Dados básicos, não estoque direto)
const updateProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { name, description, sale_price, cost_price, min_stock, sku, unit, category } = req.body;

        const sql = `
            UPDATE products 
            SET name=$1, description=$2, sale_price=$3, cost_price=$4, min_stock=$5, sku=$6, unit=$7, category=$8
            WHERE id=$9 AND tenant_id=$10
            RETURNING *
        `;
        const result = await query(sql, [
            name, description, sale_price, cost_price, min_stock, sku, unit, category,
            id, tenantId
        ]);
        return res.json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar.' });
    }
};

// Ajustar Estoque (Entrada/Saída Manual)
const adjustStock = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;
        const { type, quantity, reason, notes } = req.body; // type: 'in' ou 'out'

        if (!quantity || quantity <= 0) return res.status(400).json({ message: 'Quantidade inválida.' });

        await query('BEGIN');

        // 1. Atualiza Tabela Produto
        let updateSql = '';
        if (type === 'in') {
            updateSql = 'UPDATE products SET stock = stock + $1 WHERE id = $2 AND tenant_id = $3 RETURNING stock';
        } else {
            // Verifica se tem saldo antes de sair
            const check = await query('SELECT stock FROM products WHERE id = $1', [id]);
            if (check.rows[0].stock < quantity) {
                await query('ROLLBACK');
                return res.status(400).json({ message: 'Estoque insuficiente.' });
            }
            updateSql = 'UPDATE products SET stock = stock - $1 WHERE id = $2 AND tenant_id = $3 RETURNING stock';
        }
        
        const updateRes = await query(updateSql, [quantity, id, tenantId]);

        // 2. Registra Movimentação
        await query(`
            INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [tenantId, id, type, quantity, reason, notes, userId]);

        await query('COMMIT');
        return res.json({ message: 'Estoque ajustado.', new_stock: updateRes.rows[0].stock });

    } catch (error) {
        await query('ROLLBACK');
        return res.status(500).json({ message: 'Erro ao ajustar estoque.' });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        await query('DELETE FROM products WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.json({ message: 'Produto removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

module.exports = { getProducts, getProductDetails, createProduct, updateProduct, adjustStock, deleteProduct };