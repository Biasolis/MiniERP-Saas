const { query } = require('../config/db');

// Listar Logs de Auditoria
exports.getLogs = async (req, res) => {
    try {
        const { tenantId } = req.user;
        
        // Busca os últimos 100 logs da tabela audit_logs (gerada pelos Triggers)
        const result = await query(`
            SELECT * FROM audit_logs 
            WHERE tenant_id = $1 
            ORDER BY created_at DESC 
            LIMIT 100
        `, [tenantId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar auditoria:', error);
        res.status(500).json({ error: 'Erro ao buscar logs' });
    }
};