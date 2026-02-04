const { query } = require('../config/db');

// Listar Produtos e Serviços
const getProducts = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { search, barcode } = req.query; // Adicionado suporte a barcode no filtro

        let sql = `
            SELECT *, 
            (sale_price - cost_price) as profit_margin,
            CASE 
                WHEN type = 'service' THEN false
                WHEN stock <= min_stock THEN true 
                ELSE false 
            END as low_stock_alert
            FROM products 
            WHERE tenant_id = $1 
        `;
        
        const params = [tenantId];
        let paramCounter = 2;

        if (barcode) {
            sql += ` AND barcode = $${paramCounter}`;
            params.push(barcode);
            paramCounter++;
        }

        // Se tiver search e NÃO for barcode exato, busca por nome/desc
        if (search && !barcode) {
            sql += ` AND (name ILIKE $${paramCounter} OR description ILIKE $${paramCounter} OR sku ILIKE $${paramCounter})`;
            params.push(`%${search}%`);
            paramCounter++;
        }

        sql += ` ORDER BY name ASC`;

        const result = await query(sql, params);
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
            stock, min_stock, sku, unit, category, type, commission_rate, barcode 
        } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        // Validação de Barcode único
        if (barcode) {
            const check = await query('SELECT id FROM products WHERE barcode = $1 AND tenant_id = $2', [barcode, tenantId]);
            if (check.rows.length > 0) return res.status(400).json({ message: 'Código de barras já existe.' });
        }

        const itemType = type || 'product';
        const finalSalePrice = Number(price) || Number(sale_price) || 0;
        const initialStock = itemType === 'service' ? 0 : (Number(stock) || 0);
        const minStockVal = itemType === 'service' ? 0 : (Number(min_stock) || 5);
        
        const commRate = (commission_rate === '' || commission_rate === null) ? null : Number(commission_rate);

        await query('BEGIN');

        const insertSql = `
            INSERT INTO products (
                tenant_id, name, description, sale_price, cost_price, 
                stock, min_stock, sku, unit, category, type, commission_rate, barcode
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;
        
        const result = await query(insertSql, [
            tenantId, name, description, 
            finalSalePrice, cost_price || 0, 
            initialStock, minStockVal, 
            sku, unit || 'un', category, itemType, commRate, barcode || null
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
            min_stock, sku, unit, category, type, stock, commission_rate, barcode 
        } = req.body;

        // Validação de Barcode único na edição
        if (barcode) {
            const check = await query('SELECT id FROM products WHERE barcode = $1 AND tenant_id = $2 AND id != $3', [barcode, tenantId, id]);
            if (check.rows.length > 0) return res.status(400).json({ message: 'Código de barras já em uso.' });
        }

        const finalSalePrice = Number(price) || Number(sale_price) || 0;
        let targetStock = stock;
        if (type === 'service') targetStock = 0;

        const commRate = (commission_rate === '' || commission_rate === null) ? null : Number(commission_rate);

        const sql = `
            UPDATE products 
            SET name=$1, description=$2, sale_price=$3, cost_price=$4, 
                min_stock=$5, sku=$6, unit=$7, category=$8, type=$9,
                stock=$10, commission_rate=$11, barcode=$12
            WHERE id=$13 AND tenant_id=$14
            RETURNING *
        `;
        
        const result = await query(sql, [
            name, description, finalSalePrice, cost_price || 0, 
            type === 'service' ? 0 : (min_stock || 0), 
            sku, unit, category, type,
            targetStock, commRate, barcode || null,
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

        const checkType = await query('SELECT type, stock FROM products WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
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

        // Verifica dependências antes de deletar
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