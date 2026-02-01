const { query } = require('../config/db');

// Listar Funcionários
const listEmployees = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query(`
            SELECT e.*, d.name as department_name 
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.tenant_id = $1 
            ORDER BY e.name ASC`, 
            [tenantId]
        );
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar funcionários.' });
    }
};

// Criar Funcionário
const createEmployee = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, email, phone, cpf, admission_date, position, salary, department_id } = req.body;

        if (!name) return res.status(400).json({ message: 'Nome é obrigatório.' });

        const result = await query(
            `INSERT INTO employees (tenant_id, name, email, phone, cpf, admission_date, position, salary, department_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active') RETURNING *`,
            [tenantId, name, email, phone, cpf, admission_date, position, salary, department_id]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao cadastrar funcionário.' });
    }
};

// Atualizar Funcionário
const updateEmployee = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { name, email, phone, cpf, admission_date, position, salary, status, department_id } = req.body;

        await query(
            `UPDATE employees 
             SET name=$1, email=$2, phone=$3, cpf=$4, admission_date=$5, position=$6, salary=$7, status=$8, department_id=$9, updated_at=NOW()
             WHERE id=$10 AND tenant_id=$11`,
            [name, email, phone, cpf, admission_date, position, salary, status, department_id, id, tenantId]
        );
        return res.json({ message: 'Funcionário atualizado.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar.' });
    }
};

// Deletar Funcionário
const deleteEmployee = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        await query('DELETE FROM employees WHERE id=$1 AND tenant_id=$2', [id, tenantId]);
        return res.json({ message: 'Funcionário removido.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao remover.' });
    }
};

// Listar Departamentos
const listDepartments = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query('SELECT * FROM departments WHERE tenant_id = $1', [tenantId]);
        return res.json(result.rows);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao listar departamentos.' });
    }
};

// Criar Departamento
const createDepartment = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name } = req.body;
        if (!name) return res.status(400).json({ message: 'Nome obrigatório.' });
        
        const result = await query(
            'INSERT INTO departments (tenant_id, name) VALUES ($1, $2) RETURNING *',
            [tenantId, name]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao criar departamento.' });
    }
};

module.exports = { listEmployees, createEmployee, updateEmployee, deleteEmployee, listDepartments, createDepartment };