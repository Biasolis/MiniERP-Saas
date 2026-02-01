const { query } = require('../config/db');

// Verifica status
const getSessionStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        const result = await query(
            `SELECT * FROM pos_sessions 
             WHERE tenant_id = $1 AND user_id = $2 AND status = 'open' 
             LIMIT 1`,
            [tenantId, userId]
        );

        if (result.rows.length === 0) {
            return res.json({ isOpen: false });
        }

        return res.json({ isOpen: true, session: result.rows[0] });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao verificar caixa.' });
    }
};

// Detalhes para Fechamento
const getSessionDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        const sessionRes = await query(
            `SELECT * FROM pos_sessions WHERE tenant_id = $1 AND user_id = $2 AND status = 'open'`,
            [tenantId, userId]
        );
        
        if (sessionRes.rows.length === 0) return res.status(400).json({ message: 'Nenhum caixa aberto.' });
        const session = sessionRes.rows[0];

        const salesRes = await query(
            `SELECT payment_method, SUM(total_amount) as total 
             FROM sales 
             WHERE pos_session_id = $1 
             GROUP BY payment_method`,
            [session.id]
        );

        let totalSales = 0;
        let totalCash = 0;
        let totalCard = 0;

        salesRes.rows.forEach(row => {
            const val = Number(row.total);
            totalSales += val;
            if (row.payment_method === 'money' || row.payment_method === 'cash') totalCash += val;
            else totalCard += val;
        });

        const expectedCount = Number(session.opening_balance) + totalCash;

        return res.json({
            opening_balance: Number(session.opening_balance),
            total_sales: totalSales,
            total_cash_sales: totalCash,
            total_card_sales: totalCard,
            expected_in_drawer: expectedCount
        });

    } catch (error) {
        return res.status(500).json({ message: 'Erro ao calcular totais.' });
    }
};

// Abrir Caixa
const openSession = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { opening_balance } = req.body;

        const check = await query(`SELECT id FROM pos_sessions WHERE tenant_id = $1 AND user_id = $2 AND status = 'open'`, [tenantId, userId]);
        if (check.rows.length > 0) return res.status(400).json({ message: 'Caixa já aberto.' });

        const result = await query(
            `INSERT INTO pos_sessions (tenant_id, user_id, opening_balance, status, opened_at)
             VALUES ($1, $2, $3, 'open', NOW()) RETURNING *`,
            [tenantId, userId, opening_balance || 0]
        );

        return res.status(201).json(result.rows[0]);
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao abrir caixa.' });
    }
};

// Fechar Caixa
const closeSession = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { closing_balance, notes } = req.body;

        const sessionRes = await query(`SELECT id FROM pos_sessions WHERE tenant_id = $1 AND user_id = $2 AND status = 'open'`, [tenantId, userId]);
        if (sessionRes.rows.length === 0) return res.status(400).json({ message: 'Nenhum caixa aberto.' });
        
        await query(
            `UPDATE pos_sessions 
             SET status = 'closed', closing_balance = $1, notes = $2, closed_at = NOW()
             WHERE id = $3`,
            [closing_balance, notes, sessionRes.rows[0].id]
        );

        return res.json({ message: 'Caixa fechado com sucesso.' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro ao fechar caixa.' });
    }
};

// --- HISTÓRICO (NOVO) ---
const listHistory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { start_date, end_date } = req.query;

        let sql = `
            SELECT p.*, u.name as user_name 
            FROM pos_sessions p
            LEFT JOIN users u ON p.user_id = u.id
            WHERE p.tenant_id = $1 AND p.status = 'closed'
        `;
        const params = [tenantId];

        if (start_date && end_date) {
            sql += ` AND p.opened_at BETWEEN $2 AND $3`;
            params.push(start_date, end_date);
        }

        sql += ` ORDER BY p.closed_at DESC LIMIT 50`;

        const result = await query(sql, params);
        return res.json(result.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Erro ao listar histórico.' });
    }
};

module.exports = { 
    getSessionStatus, 
    getSessionDetails, 
    openSession, 
    closeSession, 
    listHistory // Exportando nova função
};