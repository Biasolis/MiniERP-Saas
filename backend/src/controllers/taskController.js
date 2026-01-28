const { query } = require('../config/db');

// Listar Tarefas
const getTasks = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        // Traz também o nome de quem está responsável (assigned_to)
        const sql = `
            SELECT t.*, u.name as assigned_name, u.avatar_path
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.tenant_id = $1
            ORDER BY t.created_at DESC
        `;
        const result = await query(sql, [tenantId]);
        return res.json(result.rows);
    } catch (error) {
        console.error('Erro getTasks:', error);
        return res.status(500).json({ message: 'Erro ao buscar tarefas.' });
    }
};

// Criar Tarefa
const createTask = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { title, description, status, priority, due_date, assigned_to } = req.body;

        if (!title) return res.status(400).json({ message: 'Título é obrigatório.' });

        const sql = `
            INSERT INTO tasks (tenant_id, title, description, status, priority, due_date, assigned_to)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;
        const result = await query(sql, [
            tenantId, title, description, 
            status || 'todo', priority || 'normal', 
            due_date || null, assigned_to || null
        ]);

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Erro createTask:', error);
        return res.status(500).json({ message: 'Erro ao criar tarefa.' });
    }
};

// Atualizar Status (Kanban Drag & Drop)
const updateTaskStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        const { status } = req.body;

        const result = await query(
            `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
            [status, id, tenantId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Tarefa não encontrada.' });
        return res.json(result.rows[0]);

    } catch (error) {
        return res.status(500).json({ message: 'Erro ao atualizar status.' });
    }
};

// Deletar Tarefa
const deleteTask = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;
        await query('DELETE FROM tasks WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        return res.json({ message: 'Tarefa removida.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao deletar.' });
    }
};

module.exports = { getTasks, createTask, updateTaskStatus, deleteTask };