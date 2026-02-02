const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- AUTENTICAÇÃO DO COLABORADOR ---

exports.employeeLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // 1. Busca colaborador pelo email
        const result = await pool.query('SELECT * FROM employees WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const employee = result.rows[0];

        // 2. Verifica se a senha foi configurada pelo RH
        if (!employee.password_hash) {
            return res.status(403).json({ error: 'Acesso não configurado. Contate o RH.' });
        }

        // 3. Valida a senha
        const validPassword = await bcrypt.compare(password, employee.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        // 4. Gera o Token JWT
        // Importante: passamos 'tenantId' em camelCase para alinhar com o AuthMiddleware
        const token = jwt.sign(
            { 
                id: employee.id, 
                tenantId: employee.tenant_id, // Mapeia do banco (snake_case) para o padrão do app (camelCase)
                role: 'employee' 
            },
            process.env.JWT_SECRET,
            { expiresIn: '12h' }
        );

        // 5. Retorna token e dados básicos do usuário
        res.json({ 
            token, 
            employee: { 
                id: employee.id, 
                name: employee.name, 
                email: employee.email 
            } 
        });

    } catch (error) {
        console.error('Erro no Login de Colaborador:', error);
        res.status(500).json({ error: 'Erro interno ao realizar login' });
    }
};

// --- GERENCIAMENTO DE SENHA (ADMIN) ---

exports.setEmployeePassword = async (req, res) => {
    try {
        const { tenantId } = req.user; // Obtido do middleware de autenticação
        const { id } = req.params;     // ID do colaborador
        const { password } = req.body; // Nova senha

        if (!password) {
            return res.status(400).json({ error: 'A senha é obrigatória' });
        }

        const hash = await bcrypt.hash(password, 10);
        
        // Atualiza a senha garantindo que o colaborador pertença ao tenant do admin
        const result = await pool.query(
            'UPDATE employees SET password_hash = $1 WHERE id = $2 AND tenant_id = $3', 
            [hash, id, tenantId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Colaborador não encontrado' });
        }

        res.json({ message: 'Senha do colaborador atualizada com sucesso' });

    } catch (error) {
        console.error('Erro ao definir senha:', error);
        res.status(500).json({ error: 'Erro ao atualizar senha' });
    }
};

// --- REGISTRO DE PONTO (CLOCK IN) ---

exports.clockIn = async (req, res) => {
    try {
        // O AuthMiddleware já populou req.user com { id, tenantId, role }
        const { tenantId, id: userId, role } = req.user;
        
        // Se for o próprio colaborador batendo o ponto, usa o ID do token (userId).
        // Se for um admin registrando manualmente para alguém, usa o ID enviado no corpo da requisição.
        const employee_id = role === 'employee' ? userId : req.body.employee_id;
        
        const { record_type, location } = req.body;

        if (!employee_id) {
            return res.status(400).json({ error: 'ID do colaborador não identificado' });
        }

        // Captura IP para auditoria
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const result = await pool.query(
            `INSERT INTO time_records (tenant_id, employee_id, record_type, location_coords, ip_address)
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [tenantId, employee_id, record_type, location, ip]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error("Erro ao registrar ponto:", error);
        res.status(500).json({ error: 'Erro ao registrar ponto' });
    }
};

// --- ESPELHO DE PONTO (TIMESHEET) ---

exports.getTimesheet = async (req, res) => {
    try {
        // Se for employee, vê o próprio. Se for admin, vê o do colaborador solicitado na URL.
        const { id: userId, role } = req.user;
        const employee_id = role === 'employee' ? userId : req.params.employee_id;
        
        const { month, year } = req.query; // Ex: month=10, year=2023

        if (!month || !year) {
            return res.status(400).json({ error: 'Mês e Ano são obrigatórios' });
        }

        // Busca registros de ponto do mês específico
        const recordsRes = await pool.query(`
            SELECT * FROM time_records 
            WHERE employee_id = $1 
            AND EXTRACT(MONTH FROM timestamp) = $2 
            AND EXTRACT(YEAR FROM timestamp) = $3
            ORDER BY timestamp ASC
        `, [employee_id, month, year]);

        // Busca jornada de trabalho do funcionário (para calcular horas extras/atrasos)
        const empRes = await pool.query('SELECT work_hours_daily FROM employees WHERE id = $1', [employee_id]);
        const dailyWorkLoad = parseFloat(empRes.rows[0]?.work_hours_daily || 8);

        // Agrupamento por dia
        const records = recordsRes.rows;
        const dailySummary = {};
        
        records.forEach(rec => {
            const day = new Date(rec.timestamp).toLocaleDateString('pt-BR');
            if (!dailySummary[day]) dailySummary[day] = [];
            dailySummary[day].push(rec);
        });

        // Montagem do Relatório Diário
        const report = Object.keys(dailySummary).map(day => {
            const punches = dailySummary[day];
            
            // Cálculo simplificado de horas trabalhadas (pares de Entrada/Saída)
            let minutesWorked = 0;
            for (let i = 0; i < punches.length - 1; i += 2) {
                const start = new Date(punches[i].timestamp);
                const end = new Date(punches[i+1].timestamp);
                minutesWorked += (end - start) / 1000 / 60;
            }

            const hoursWorked = minutesWorked / 60;
            const balance = hoursWorked - dailyWorkLoad; // Saldo do dia

            return {
                date: day,
                punches: punches.map(p => ({ 
                    time: new Date(p.timestamp).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}), 
                    type: p.record_type 
                })),
                hoursWorked: hoursWorked.toFixed(2),
                balance: balance.toFixed(2)
            };
        });

        // Saldo Total do Mês (Banco de Horas)
        const totalBalance = report.reduce((acc, day) => acc + parseFloat(day.balance), 0);

        res.json({
            employee_id,
            month,
            year,
            daily_records: report,
            bank_balance: totalBalance.toFixed(2)
        });

    } catch (error) {
        console.error("Erro ao gerar espelho de ponto:", error);
        res.status(500).json({ error: 'Erro ao processar espelho de ponto' });
    }
};