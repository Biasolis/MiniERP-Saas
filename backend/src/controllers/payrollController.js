const pool = require('../config/db');

exports.getPayrolls = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await pool.query(`
            SELECT p.*, e.name as employee_name, e.cpf 
            FROM payrolls p
            JOIN employees e ON p.employee_id = e.id
            WHERE p.tenant_id = $1
            ORDER BY p.reference_date DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar folhas' });
    }
};

exports.generatePayroll = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { tenantId } = req.user;
        const { employee_id, reference_date, additions, deductions } = req.body;

        const empRes = await client.query('SELECT salary FROM employees WHERE id = $1', [employee_id]);
        if (empRes.rowCount === 0) throw new Error('Colaborador não encontrado');
        
        const baseSalary = parseFloat(empRes.rows[0].salary || 0);
        const netSalary = baseSalary + parseFloat(additions || 0) - parseFloat(deductions || 0);

        const result = await client.query(
            `INSERT INTO payrolls 
            (tenant_id, employee_id, reference_date, base_salary, total_additions, total_deductions, net_salary, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'processed')
            RETURNING *`,
            [tenantId, employee_id, reference_date, baseSalary, additions, deductions, netSalary]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
};