const pool = require('../config/db');
const bcrypt = require('bcryptjs'); // Necessário: npm install bcryptjs

// --- EMPLOYEES (COLABORADORES) ---

exports.getEmployees = async (req, res) => {
  try {
    const { tenantId } = req.user; // Corrigido para tenantId
    const result = await pool.query(`
      SELECT e.id, e.tenant_id, e.name, e.email, e.phone, e.cpf, e.admission_date, 
             e.salary, e.status, e.work_hours_daily,
             d.name as department_name, p.title as position_title, e.department_id, e.position_id
      FROM employees e
      LEFT JOIN departments d ON e.department_id = d.id
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE e.tenant_id = $1 
      ORDER BY e.name ASC
    `, [tenantId]);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar colaboradores' });
  }
};

exports.createEmployee = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { name, email, phone, cpf, admission_date, department_id, position_id, salary, status, password } = req.body;

    // Criptografa a senha se ela foi fornecida
    let passwordHash = null;
    if (password && password.trim() !== '') {
        passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `INSERT INTO employees (tenant_id, name, email, phone, cpf, admission_date, department_id, position_id, salary, status, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, name, email`,
      [tenantId, name, email, phone, cpf, admission_date, department_id || null, position_id || null, salary || 0, status || 'active', passwordHash]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar colaborador' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { name, email, phone, cpf, admission_date, department_id, position_id, salary, status, password } = req.body;

    // Se enviou senha nova, atualiza. Se não, mantém a antiga.
    if (password && password.trim() !== '') {
        const passwordHash = await bcrypt.hash(password, 10);
        await pool.query(
            `UPDATE employees SET password_hash = $1 WHERE id = $2 AND tenant_id = $3`,
            [passwordHash, id, tenantId]
        );
    }

    const result = await pool.query(
      `UPDATE employees 
       SET name=$1, email=$2, phone=$3, cpf=$4, admission_date=$5, department_id=$6, position_id=$7, salary=$8, status=$9
       WHERE id=$10 AND tenant_id=$11
       RETURNING id, name, email`,
      [name, email, phone, cpf, admission_date, department_id || null, position_id || null, salary, status, id, tenantId]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar colaborador' });
  }
};

exports.deleteEmployee = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    await pool.query('DELETE FROM employees WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover colaborador' });
  }
};

// --- DEPARTMENTS ---

exports.getDepartments = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const result = await pool.query('SELECT * FROM departments WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar departamentos' });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { name, manager_name } = req.body;
    const result = await pool.query(
      'INSERT INTO departments (tenant_id, name, manager_name) VALUES ($1, $2, $3) RETURNING *',
      [tenantId, name, manager_name]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar departamento' });
  }
};

exports.deleteDepartment = async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;
      await pool.query('DELETE FROM departments WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover departamento' });
    }
};

// --- POSITIONS (CARGOS) ---

exports.getPositions = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const result = await pool.query('SELECT * FROM positions WHERE tenant_id = $1 ORDER BY title ASC', [tenantId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cargos' });
  }
};

exports.createPosition = async (req, res) => {
  try {
    const { tenantId } = req.user; // AQUI ESTAVA O ERRO (tenant_id -> tenantId)
    const { title, base_salary, description } = req.body;
    const result = await pool.query(
      'INSERT INTO positions (tenant_id, title, base_salary, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [tenantId, title, base_salary, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error); // Log para ajudar no debug
    res.status(500).json({ error: 'Erro ao criar cargo' });
  }
};

exports.deletePosition = async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;
      await pool.query('DELETE FROM positions WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover cargo' });
    }
};

// --- RECRUITMENT ---

exports.getJobOpenings = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await pool.query(`
            SELECT j.*, d.name as department_name, p.title as position_title,
            (SELECT COUNT(*) FROM candidates c WHERE c.job_opening_id = j.id) as candidate_count
            FROM job_openings j
            LEFT JOIN departments d ON j.department_id = d.id
            LEFT JOIN positions p ON j.position_id = p.id
            WHERE j.tenant_id = $1
            ORDER BY j.created_at DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar vagas' });
    }
};

exports.createJobOpening = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { title, description, department_id, position_id, status } = req.body;
        const result = await pool.query(
            `INSERT INTO job_openings (tenant_id, title, description, department_id, position_id, status)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [tenantId, title, description, department_id || null, position_id || null, status || 'open']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar vaga' });
    }
};

exports.deleteJobOpening = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        await pool.query('DELETE FROM job_openings WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover vaga' });
    }
};

exports.getCandidates = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { job_id } = req.query; 
        let query = `
            SELECT c.*, j.title as job_title 
            FROM candidates c
            LEFT JOIN job_openings j ON c.job_opening_id = j.id
            WHERE c.tenant_id = $1
        `;
        const params = [tenantId];
        if (job_id) {
            query += ` AND c.job_opening_id = $2`;
            params.push(job_id);
        }
        query += ` ORDER BY c.created_at DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar candidatos' });
    }
};

exports.createCandidate = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { job_opening_id, name, email, phone, resume_link, status, notes } = req.body;
        const result = await pool.query(
            `INSERT INTO candidates (tenant_id, job_opening_id, name, email, phone, resume_link, status, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
            [tenantId, job_opening_id, name, email, phone, resume_link, status || 'applied', notes]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao adicionar candidato' });
    }
};

exports.deleteCandidate = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        await pool.query('DELETE FROM candidates WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover candidato' });
    }
};

// --- TERMINATIONS ---

exports.getTerminations = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await pool.query(`
            SELECT t.*, e.name as employee_name, e.cpf 
            FROM terminations t
            JOIN employees e ON t.employee_id = e.id
            WHERE t.tenant_id = $1
            ORDER BY t.termination_date DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar demissões' });
    }
};

exports.createTermination = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { tenantId } = req.user;
        const { employee_id, termination_date, reason, type } = req.body;

        const termResult = await client.query(
            `INSERT INTO terminations (tenant_id, employee_id, termination_date, reason, type)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [tenantId, employee_id, termination_date, reason, type]
        );

        await client.query(
            `UPDATE employees SET status = 'inactive' WHERE id = $1 AND tenant_id = $2`,
            [employee_id, tenantId]
        );

        await client.query('COMMIT');
        res.status(201).json(termResult.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar demissão' });
    } finally {
        client.release();
    }
};

// --- FORMS (FORMULÁRIOS) ---

exports.getForms = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await pool.query(`
            SELECT * FROM hr_forms WHERE tenant_id = $1 ORDER BY created_at DESC
        `, [tenantId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar formulários' });
    }
};

exports.createForm = async (req, res) => {
    try {
        const { tenantId, id: user_id } = req.user;
        const { title, description, is_private, fields } = req.body; // fields é um JSON Array

        const result = await pool.query(
            `INSERT INTO hr_forms (tenant_id, title, description, is_private, fields, created_by)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [tenantId, title, description, is_private || false, JSON.stringify(fields), user_id]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar formulário' });
    }
};

exports.deleteForm = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        await pool.query('DELETE FROM hr_forms WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover formulário' });
    }
};