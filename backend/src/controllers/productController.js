const { query } = require('../config/db');

// Listar Produtos e Serviços
const getProducts = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const sql = `
            SELECT *, 
            (sale_price - cost_price) as profit_margin,
            CASE 
                WHEN type = 'service' THEN false
                WHEN stock <= min_stock THEN true 
                ELSE false 
            END as low_stock_alert
            FROM products 
            WHERE tenant_id = $1 
            ORDER BY name ASC
        `;
        const result = await query(sql, [tenantId]);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar itens.' });
    }
};

// Obter Detalhes
const getProductDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const productId = req.params.id;

        const prodResult = await query('SELECT * FROM products WHERE id = $1 AND tenant_id = $2', [productId, tenantId]);
        if (prodResult.rows.length === 0) return res.status(404).json({ message: 'Item não encontrado.' });

        let historyResult = { rows: [] };
        if (prodResult.rows[0].type !== 'service') {
            historyResult = await query(`
                SELECT m.*, u.name as user_name 
                FROM inventory_movements m
                LEFT JOIN users u ON m.created_by = u.id
                WHERE m.product_id = $1 
                ORDER BY m.created_at DESC LIMIT 20
            `, [productId]);
        }

        return res.json({ product: prodResult.rows[0], history: historyResult.rows });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao carregar detalhes.' });
    }
};

// Criar
const createProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { 
            name, description, price, sale_price, cost_price, 
            stock, min_stock, sku, unit, category, type, commission_rate 
        } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        const itemType = type || 'product';
        const finalSalePrice = Number(price) || Number(sale_price) || 0;
        const initialStock = itemType === 'service' ? 0 : (Number(stock) || 0);
        const minStockVal = itemType === 'service' ? 0 : (Number(min_stock) || 5);
        
        // Se commission_rate vier vazio ou zero, pode ser null (para usar a do vendedor) ou 0 se quiser explicitar.
        // Aqui assumimos que se vier '', vira NULL.
        const commRate = (commission_rate === '' || commission_rate === null) ? null : Number(commission_rate);

        await query('BEGIN');

        const insertSql = `
            INSERT INTO products (
                tenant_id, name, description, sale_price, cost_price, 
                stock, min_stock, sku, unit, category, type, commission_rate
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *
        `;
        
        const result = await query(insertSql, [
            tenantId, name, description, 
            finalSalePrice, cost_price || 0, 
            initialStock, minStockVal, 
            sku, unit || 'un', category, itemType, commRate
        ]);
        
        const newProduct = result.rows[0];

        if (itemType === 'product' && initialStock > 0) {
            await query(`
                INSERT INTO inventory_movements (tenant_id, product_id, type, quantity, reason, notes, created_by)
                VALUES ($1, $2, 'in', $3, 'adjustment', 'Estoque Inicial', $4)
            `, [tenantId, newProduct.id, initialStock, userId]);
        }

        await query('COMMIT');
        return res.status(201).json(newProduct);

    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar item.' });
    }
};

// Atualizar
const updateProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { 
            name, description, price, sale_price, cost_price, 
            min_stock, sku, unit, category, type, stock, commission_rate 
        } = req.body;

        const finalSalePrice = Number(price) || Number(sale_price) || 0;
        let targetStock = stock;
        if (type === 'service') targetStock = 0;

        const commRate = (commission_rate === '' || commission_rate === null) ? null : Number(commission_rate);

        const sql = `
            UPDATE products 
            SET name=$1, description=$2, sale_price=$3, cost_price=$4, 
                min_stock=$5, sku=$6, unit=$7, category=$8, type=$9,
                stock=$10, commission_rate=$11
            WHERE id=$12 AND tenant_id=$13
            RETURNING *
        `;
        
        const result = await query(sql, [
            name, description, finalSalePrice, cost_price || 0, 
            type === 'service' ? 0 : (min_stock || 0), 
            sku, unit, category, type,
            targetStock, commRate,
            id, tenantId
        ]);

        if (result.rows.length === 0) return res.status(404).json({ message: 'Item não encontrado.' });
        return res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro Update:', error);
        return res.status(500).json({ message: 'Erro ao atualizar.' });
    }
};

// Ajustar Estoque
const adjustStock = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;
        const { type, quantity, reason, notes } = req.body; 

        if (!quantity || quantity <= 0) return res.status(400).json({ message: 'Quantidade inválida.' });

        const checkType = await query('SELECT type, stock FROM products WHERE id = $1', [id]);
        if (checkType.rows.length === 0) return res.status(404).json({ message: 'Item não encontrado.' });
        
        if (checkType.rows[0].type === 'service') {
            return res.status(400).json({ message: 'Não é possível ajustar estoque de Serviços.' });
        }

        await query('BEGIN');

        let updateSql = '';
        if (type === 'in') {
            updateSql = 'UPDATE products SET stock = stock + $1 WHERE id = $2 AND tenant_id = $3 RETURNING stock';
        } else {
            if (checkType.rows[0].stock < quantity) {
                await query('ROLLBACK');
                return res.status(400).json({ message: 'Estoque insuficiente.' });
            }
            updateSql = 'UPDATE products SET stock = stock - $1 WHERE id = $2 AND tenant_id = $3 RETURNING stock';
        }
        
        const updateRes = await query(updateSql, [quantity, id, tenantId]);

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

// Remover
const deleteProduct = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const checkOS = await query('SELECT id FROM service_order_items WHERE product_id = $1 LIMIT 1', [id]);
        if (checkOS.rows.length > 0) return res.status(400).json({ message: 'Item em uso (OS).' });

        const checkSales = await query('SELECT id FROM sale_items WHERE product_id = $1 LIMIT 1', [id]);
        if (checkSales.rows.length > 0) return res.status(400).json({ message: 'Item em uso (Vendas).' });

        await query('DELETE FROM products WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.json({ message: 'Item removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

module.exports = { getProducts, getProductDetails, createProduct, updateProduct, adjustStock, deleteProduct };