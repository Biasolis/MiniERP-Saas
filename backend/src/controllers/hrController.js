const { query } = require('../config/db');
const bcrypt = require('bcryptjs');

// ==========================================
// 1. GESTÃO DE COLABORADORES
// ==========================================

exports.getEmployees = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const result = await query(`
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
    const { name, email, phone, cpf, admission_date, department_id, position_id, salary, status, password, work_hours_daily } = req.body;

    let passwordHash = null;
    if (password && password.trim() !== '') {
        passwordHash = await bcrypt.hash(password, 10);
    } else {
        passwordHash = await bcrypt.hash('mudar123', 10);
    }

    const result = await query(
      `INSERT INTO employees (tenant_id, name, email, phone, cpf, admission_date, department_id, position_id, salary, status, password_hash, work_hours_daily)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, name, email`,
      [tenantId, name, email, phone, cpf, admission_date, department_id || null, position_id || null, salary || 0, status || 'active', passwordHash, work_hours_daily || 8]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    if (error.code === '23505') return res.status(400).json({ error: 'Email ou CPF já cadastrado' });
    res.status(500).json({ error: 'Erro ao criar colaborador' });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { id } = req.params;
    const { name, email, phone, cpf, admission_date, department_id, position_id, salary, status, password, work_hours_daily } = req.body;

    if (password && password.trim() !== '') {
        const passwordHash = await bcrypt.hash(password, 10);
        await query(
            `UPDATE employees SET password_hash = $1 WHERE id = $2 AND tenant_id = $3`,
            [passwordHash, id, tenantId]
        );
    }

    const result = await query(
      `UPDATE employees 
       SET name=$1, email=$2, phone=$3, cpf=$4, admission_date=$5, department_id=$6, position_id=$7, salary=$8, status=$9, work_hours_daily=$10
       WHERE id=$11 AND tenant_id=$12
       RETURNING id, name, email`,
      [name, email, phone, cpf, admission_date, department_id || null, position_id || null, salary, status, work_hours_daily || 8, id, tenantId]
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
    await query('DELETE FROM employees WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao remover colaborador' });
  }
};

// ==========================================
// 2. DEPARTAMENTOS & CARGOS
// ==========================================

exports.getDepartments = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const result = await query('SELECT * FROM departments WHERE tenant_id = $1 ORDER BY name ASC', [tenantId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar departamentos' });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { name, manager_name } = req.body;
    const result = await query(
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
      await query('DELETE FROM departments WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover departamento' });
    }
};

exports.getPositions = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const result = await query('SELECT * FROM positions WHERE tenant_id = $1 ORDER BY title ASC', [tenantId]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar cargos' });
  }
};

exports.createPosition = async (req, res) => {
  try {
    const { tenantId } = req.user;
    const { title, base_salary, description } = req.body;
    const result = await query(
      'INSERT INTO positions (tenant_id, title, base_salary, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [tenantId, title, base_salary, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar cargo' });
  }
};

exports.deletePosition = async (req, res) => {
    try {
      const { tenantId } = req.user;
      const { id } = req.params;
      await query('DELETE FROM positions WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover cargo' });
    }
};

// ==========================================
// 3. RECRUTAMENTO
// ==========================================

exports.getJobOpenings = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await query(`
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
        const result = await query(
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
        await query('DELETE FROM job_openings WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover vaga' });
    }
};

exports.getCandidates = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { job_id } = req.query; 
        let sql = `
            SELECT c.*, j.title as job_title 
            FROM candidates c
            LEFT JOIN job_openings j ON c.job_opening_id = j.id
            WHERE c.tenant_id = $1
        `;
        const params = [tenantId];
        if (job_id) {
            sql += ` AND c.job_opening_id = $2`;
            params.push(job_id);
        }
        sql += ` ORDER BY c.created_at DESC`;
        const result = await query(sql, params);
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
        const result = await query(
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
        await query('DELETE FROM candidates WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover candidato' });
    }
};

// ==========================================
// 4. DEMISSÕES & FORMULÁRIOS
// ==========================================

exports.getTerminations = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await query(`
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
    // Para transações, se você estiver usando o wrapper query, 
    // precisaremos acessar o pool direto ou implementar BEGIN/COMMIT manualmente
    // Como o 'query' exportado do db.js é simples, vamos usar comandos diretos:
    try {
        await query('BEGIN');
        const { tenantId } = req.user;
        const { employee_id, termination_date, reason, type } = req.body;

        const termResult = await query(
            `INSERT INTO terminations (tenant_id, employee_id, termination_date, reason, type)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [tenantId, employee_id, termination_date, reason, type]
        );

        await query(
            `UPDATE employees SET status = 'inactive' WHERE id = $1 AND tenant_id = $2`,
            [employee_id, tenantId]
        );

        await query('COMMIT');
        res.status(201).json(termResult.rows[0]);
    } catch (error) {
        await query('ROLLBACK');
        console.error(error);
        res.status(500).json({ error: 'Erro ao processar demissão' });
    }
};

exports.getForms = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const result = await query(`
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
        const { title, description, is_private, fields } = req.body; 

        const result = await query(
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
        await query('DELETE FROM hr_forms WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover formulário' });
    }
};

// ==========================================
// 5. GESTÃO DE PONTO (CORREÇÕES AQUI)
// ==========================================

// Buscar Espelho de Ponto (Visualização do RH)
exports.getEmployeeTimesheet = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { employeeId } = req.params;
        const { month, year } = req.query;

        // CORREÇÃO: location -> location_coords
        const sql = `
            SELECT 
                id,
                record_type,
                timestamp,
                TO_CHAR(timestamp AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as date_str,
                TO_CHAR(timestamp AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') as time_str,
                location_coords as location,
                ip_address
            FROM time_records 
            WHERE employee_id = $1 AND tenant_id = $2
            AND EXTRACT(MONTH FROM timestamp) = $3 
            AND EXTRACT(YEAR FROM timestamp) = $4
            ORDER BY timestamp ASC
        `;

        const result = await query(sql, [employeeId, tenantId, month, year]);
        res.json(result.rows);

    } catch (error) {
        console.error("Erro ao buscar espelho (RH):", error);
        res.status(500).json({ error: 'Erro ao buscar espelho de ponto' });
    }
};

// Adicionar Batida Manualmente (Esquecimento/Ajuste)
exports.addManualRecord = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { employee_id, date, time, type, reason } = req.body;

        const timestampIso = `${date}T${time}:00-03:00`;

        // CORREÇÃO: location -> location_coords
        const result = await query(
            `INSERT INTO time_records (tenant_id, employee_id, record_type, timestamp, location_coords, ip_address, created_at)
             VALUES ($1, $2, $3, $4, $5, 'MANUAL_HR', NOW()) RETURNING *`,
            [tenantId, employee_id, type, timestampIso, `Ajuste RH: ${reason || 'N/A'}`]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Erro ao adicionar registro manual:", error);
        res.status(500).json({ error: 'Erro ao adicionar registro' });
    }
};

// Atualizar Batida (Correção de Horário)
exports.updateRecord = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;
        const { time, date } = req.body; 

        const newTimestamp = `${date}T${time}:00-03:00`;

        // CORREÇÃO: location -> location_coords
        const result = await query(
            `UPDATE time_records 
             SET timestamp = $1, location_coords = COALESCE(location_coords, '') || ' (Editado RH)'
             WHERE id = $2 AND tenant_id = $3 RETURNING *`,
            [newTimestamp, id, tenantId]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: 'Registro não encontrado' });
        res.json(result.rows[0]);

    } catch (error) {
        console.error("Erro ao atualizar registro:", error);
        res.status(500).json({ error: 'Erro ao atualizar registro' });
    }
};

// Excluir Batida (Duplicidade/Erro)
exports.deleteRecord = async (req, res) => {
    try {
        const { tenantId } = req.user;
        const { id } = req.params;

        await query('DELETE FROM time_records WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Registro removido com sucesso' });

    } catch (error) {
        console.error("Erro ao excluir registro:", error);
        res.status(500).json({ error: 'Erro ao remover registro' });
    }
};