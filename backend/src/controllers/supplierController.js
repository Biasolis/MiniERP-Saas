const { query } = require('../config/db');

// Listar Fornecedores
const getSuppliers = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query('SELECT * FROM suppliers WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
        return res.json(result.rows);
    } catch (error) {
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

// Criar Fornecedor
const createSupplier = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, cnpj_cpf, email, phone, address } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        const result = await query(
            `INSERT INTO suppliers (tenant_id, name, cnpj_cpf, email, phone, address) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [tenantId, name, cnpj_cpf, email, phone, address]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
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

        // Verifica se tem entradas vinculadas
        const checkEntries = await query('SELECT id FROM product_entries WHERE supplier_id = $1 LIMIT 1', [id]);
        if (checkEntries.rows.length > 0) {
            return res.status(400).json({ message: 'Não é possível excluir: Fornecedor possui histórico de entradas.' });
        }

        await query('DELETE FROM suppliers WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        return res.json({ message: 'Fornecedor removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };