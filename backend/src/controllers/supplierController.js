const { query } = require('../config/db');

// Listar Fornecedores (Com busca para Autocomplete)
const getSuppliers = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { search } = req.query;

        let sql = 'SELECT * FROM suppliers WHERE tenant_id = $1';
        let params = [tenantId];

        if (search) {
            const idx = params.length + 1;
            // Busca por Nome, Código, Email ou Documento (CNPJ/CPF)
            sql += ` AND (name ILIKE $${idx} OR code ILIKE $${idx} OR email ILIKE $${idx} OR cnpj_cpf ILIKE $${idx})`;
            params.push(`%${search}%`);
        }

        sql += ' ORDER BY name ASC';

        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar fornecedores.' });
    }
};

// Obter Detalhes
const getSupplier = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        
        const result = await query('SELECT * FROM suppliers WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        
        if (result.rows.length === 0) return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        
        return res.json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao buscar fornecedor.' });
    }
};

// Criar Fornecedor (Com Geração Automática de Código)
const createSupplier = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, cnpj_cpf, email, phone, address } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        // Lógica de Geração de Código Único (5 Dígitos)
        let code;
        let isUnique = false;
        // Tenta gerar até encontrar um livre
        for (let i = 0; i < 5; i++) {
            code = Math.floor(10000 + Math.random() * 90000).toString();
            const check = await query('SELECT id FROM suppliers WHERE tenant_id = $1 AND code = $2', [tenantId, code]);
            if (check.rows.length === 0) {
                isUnique = true;
                break;
            }
        }

        if (!isUnique) return res.status(500).json({ error: 'Erro ao gerar código de fornecedor. Tente novamente.' });

        const result = await query(
            `INSERT INTO suppliers (tenant_id, name, cnpj_cpf, email, phone, address, code) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [tenantId, name, cnpj_cpf, email, phone, address, code]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar fornecedor.' });
    }
};

// Atualizar Fornecedor
const updateSupplier = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { name, cnpj_cpf, email, phone, address } = req.body;

        const result = await query(
            `UPDATE suppliers 
             SET name=$1, cnpj_cpf=$2, email=$3, phone=$4, address=$5 
             WHERE id=$6 AND tenant_id=$7 RETURNING *`,
            [name, cnpj_cpf, email, phone, address, id, tenantId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        return res.json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar.' });
    }
};

// Deletar Fornecedor
const deleteSupplier = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        // Verifica se tem entradas de estoque vinculadas
        const checkEntries = await query('SELECT id FROM product_entries WHERE supplier_id = $1 LIMIT 1', [id]);
        if (checkEntries.rows.length > 0) {
            return res.status(400).json({ message: 'Não é possível excluir: Fornecedor possui histórico de entradas de produtos.' });
        }
        
        // Opcional: Verificar se tem transações financeiras vinculadas
        const checkTrans = await query('SELECT id FROM transactions WHERE supplier_id = $1 LIMIT 1', [id]);
        if (checkTrans.rows.length > 0) {
            return res.status(400).json({ message: 'Não é possível excluir: Fornecedor possui transações financeiras.' });
        }

        await query('DELETE FROM suppliers WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        return res.json({ message: 'Fornecedor removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

module.exports = { 
    getSuppliers, 
    getSupplier, 
    createSupplier, 
    updateSupplier, 
    deleteSupplier 
};