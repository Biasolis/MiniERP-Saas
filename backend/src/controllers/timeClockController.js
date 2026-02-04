const { query } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- AUTENTICAÇÃO DO COLABORADOR ---

exports.employeeLogin = async (req, res) => {
    try {
        const { email, password, access_code } = req.body;
        
        // CORREÇÃO: Coluna 'cpf' em vez de 'document'
        const result = await query(
            'SELECT * FROM employees WHERE email = $1 OR cpf = $1', 
            [email || access_code]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }
        
        const employee = result.rows[0];

        if (!employee.password_hash) {
            return res.status(403).json({ error: 'Acesso não configurado. Contate o RH.' });
        }

        const validPassword = await bcrypt.compare(password, employee.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Senha incorreta' });
        }

        const token = jwt.sign(
            { 
                id: employee.id, 
                tenantId: employee.tenant_id, 
                role: 'employee',
                name: employee.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ 
            token, 
            user: { 
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
        const { tenantId } = req.user; 
        const { id } = req.params;     
        const { password } = req.body; 

        if (!password) return res.status(400).json({ error: 'A senha é obrigatória' });

        const hash = await bcrypt.hash(password, 10);
        
        const result = await query(
            'UPDATE employees SET password_hash = $1 WHERE id = $2 AND tenant_id = $3', 
            [hash, id, tenantId]
        );

        if (result.rowCount === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });

        res.json({ message: 'Senha atualizada com sucesso' });

    } catch (error) {
        console.error('Erro ao definir senha:', error);
        res.status(500).json({ error: 'Erro ao atualizar senha' });
    }
};

// --- REGISTRO DE PONTO (CLOCK IN) ---

exports.clockIn = async (req, res) => {
    try {
        const { tenantId, id: userId, role } = req.user;
        const employee_id = role === 'employee' ? userId : req.body.employee_id;
        const { record_type, location } = req.body;

        if (!employee_id) return res.status(400).json({ error: 'ID do colaborador não identificado' });

        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        // Usa NOW() para gravar a hora exata do servidor (que agora está configurado para BRT via db.js)
        const sql = `
            INSERT INTO time_records (tenant_id, employee_id, record_type, location_coords, ip_address, timestamp, created_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
            RETURNING id, timestamp
        `;
        
        const result = await query(sql, [tenantId, employee_id, record_type, location, ip]);

        res.status(201).json({
            message: 'Ponto registrado',
            time: result.rows[0].timestamp
        });

    } catch (error) {
        console.error("Erro ao registrar ponto:", error);
        res.status(500).json({ error: 'Erro ao registrar ponto.' });
    }
};

exports.registerPunch = exports.clockIn;

// --- ESPELHO DE PONTO (TIMESHEET) ---

exports.getTimesheet = async (req, res) => {
    try {
        const { id: userId, role } = req.user;
        const employee_id = role === 'employee' ? userId : req.params.employee_id;
        const { month, year } = req.query;

        if (!month || !year) return res.status(400).json({ error: 'Mês e Ano são obrigatórios' });

        // BLINDAGEM DE FUSO HORÁRIO:
        // Usamos "AT TIME ZONE 'America/Sao_Paulo'" para garantir que, mesmo se o banco salvou em UTC,
        // a visualização converta para o horário do Brasil antes de formatar a string HH:MI.
        const sql = `
            SELECT 
                record_type, 
                timestamp,
                TO_CHAR(timestamp AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM-DD') as date_str,
                TO_CHAR(timestamp AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI') as time_str
            FROM time_records 
            WHERE employee_id = $1 
            AND EXTRACT(MONTH FROM timestamp) = $2 
            AND EXTRACT(YEAR FROM timestamp) = $3
            ORDER BY timestamp ASC
        `;

        const recordsRes = await query(sql, [employee_id, month, year]);

        const empRes = await query('SELECT work_hours_daily FROM employees WHERE id = $1', [employee_id]);
        const dailyWorkLoad = parseFloat(empRes.rows[0]?.work_hours_daily || 8);

        const records = recordsRes.rows;
        const dailySummary = {};
        
        records.forEach(rec => {
            const dateKey = rec.date_str; 
            const [y, m, d] = dateKey.split('-');
            const displayDate = `${d}/${m}/${y}`;

            if (!dailySummary[displayDate]) dailySummary[displayDate] = [];
            dailySummary[displayDate].push(rec);
        });

        const report = Object.keys(dailySummary).map(day => {
            const punches = dailySummary[day];
            
            let minutesWorked = 0;
            for (let i = 0; i < punches.length - 1; i += 2) {
                const start = new Date(punches[i].timestamp);
                const end = new Date(punches[i+1].timestamp);
                minutesWorked += (end - start) / 1000 / 60;
            }

            const hoursWorked = minutesWorked / 60;
            const balance = hoursWorked > 0 ? (hoursWorked - dailyWorkLoad) : 0;

            const typeMap = { 'entry': 'Entrada', 'lunch_out': 'Saída Almoço', 'lunch_in': 'Volta Almoço', 'exit': 'Saída' };

            return {
                date: day,
                punches: punches.map(p => ({ 
                    time: p.time_str, // Agora vem com fuso corrigido pelo SQL
                    type: p.record_type,
                    label: typeMap[p.record_type] || p.record_type
                })),
                hoursWorked: hoursWorked.toFixed(2),
                balance: balance.toFixed(2)
            };
        });

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