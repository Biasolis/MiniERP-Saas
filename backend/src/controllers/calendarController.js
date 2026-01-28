const { query } = require('../config/db');

// ==========================================
// LISTAR EVENTOS (OS + FINANCEIRO + TAREFAS + EVENTOS MANUAIS)
// ==========================================
const getEvents = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;

        // 1. Ordens de Serviço (OS)
        const osSql = `
            SELECT id, CONCAT('OS #', id, ' - ', client_name) as title, 
            created_at as start_date, created_at as end_date,
            status, 'os' as type
            FROM service_orders WHERE tenant_id = $1
        `;
        const osResult = await query(osSql, [tenantId]);

        // 2. Transações Financeiras
        const financeSql = `
            SELECT id, CONCAT(CASE WHEN type = 'income' THEN 'Receber: ' ELSE 'Pagar: ' END, description) as title, 
            date as start_date, date as end_date,
            status, type as finance_type, 'finance' as type
            FROM transactions WHERE tenant_id = $1 AND status = 'pending'
        `;
        const financeResult = await query(financeSql, [tenantId]);

        // 3. Tarefas com Data (NOVO)
        const tasksSql = `
            SELECT id, title, due_date as start_date, due_date as end_date,
            status, priority, 'task' as type
            FROM tasks WHERE tenant_id = $1 AND due_date IS NOT NULL
        `;
        const tasksResult = await query(tasksSql, [tenantId]);

        // 4. Eventos Manuais da Agenda (NOVO)
        const eventsSql = `
            SELECT id, title, description, start_date, end_date, color, 'event' as type
            FROM calendar_events WHERE tenant_id = $1
        `;
        const manualEventsResult = await query(eventsSql, [tenantId]);

        // Unificar
        const events = [
            ...osResult.rows.map(os => ({
                id: `os-${os.id}`,
                title: os.title,
                start: os.start_date, end: os.end_date,
                allDay: true, resource: os,
                color: os.status === 'completed' ? '#10b981' : '#3b82f6'
            })),
            ...financeResult.rows.map(fin => ({
                id: `fin-${fin.id}`,
                title: fin.title,
                start: fin.start_date, end: fin.end_date,
                allDay: true, resource: fin,
                color: fin.finance_type === 'expense' ? '#ef4444' : '#10b981'
            })),
            ...tasksResult.rows.map(task => ({
                id: `task-${task.id}`,
                title: `Task: ${task.title}`,
                start: task.start_date, end: task.end_date,
                allDay: true, resource: task,
                color: '#f59e0b' // Laranja
            })),
            ...manualEventsResult.rows.map(evt => ({
                id: `evt-${evt.id}`,
                title: evt.title,
                start: evt.start_date, end: evt.end_date,
                allDay: false, // Eventos manuais podem ter hora
                resource: evt,
                color: evt.color || '#6366f1' // Roxo padrão
            }))
        ];

        return res.json(events);

    } catch (error) {
        console.error('Erro agenda:', error);
        return res.status(500).json({ message: 'Erro ao carregar agenda.' });
    }
};

// ==========================================
// CRIAR EVENTO MANUAL
// ==========================================
const createEvent = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { title, description, start_date, end_date, color } = req.body;

        if (!title || !start_date || !end_date) {
            return res.status(400).json({ message: 'Dados incompletos.' });
        }

        const sql = `
            INSERT INTO calendar_events (tenant_id, title, description, start_date, end_date, color, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const result = await query(sql, [tenantId, title, description, start_date, end_date, color, userId]);

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao criar evento.' });
    }
};

module.exports = { getEvents, createEvent };