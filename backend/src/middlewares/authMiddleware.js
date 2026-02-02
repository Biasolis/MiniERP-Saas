const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // --- CORREÇÃO: SUPORTE A COLABORADORES ---
    if (decoded.role === 'employee') {
        // Se for colaborador, confiamos no payload do token ou validamos na tabela correta
        // O controller timeClockController já colocou o tenantId no payload
        req.user = {
            id: decoded.id,
            tenantId: decoded.tenantId, // Nota: No login geramos como tenantId (camelCase)
            role: 'employee'
        };
        return next();
    }
    // -----------------------------------------

    // Fluxo normal para Administradores (Users)
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário inválido' });
    }

    const user = result.rows[0];

    // Normaliza o objeto req.user para usar tenantId (camelCase) em todo o sistema
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: user.tenant_id, // Mapeia snake_case do banco para camelCase
      isSuperAdmin: user.is_super_admin
    };

    return next();
  } catch (err) {
    console.error('Erro Auth:', err);
    return res.status(401).json({ error: 'Token inválido' });
  }
};