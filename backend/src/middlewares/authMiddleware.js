const jwt = require('jsonwebtoken');
const pool = require('../config/db');

module.exports = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seusecretuperseguro123');

    // --- CENÁRIO 1: ACESSO DE COLABORADOR (Portal) ---
    // Colaboradores não estão na tabela 'users', então confiamos no token
    if (decoded.role === 'employee' || decoded.role === 'support_user') {
        req.user = {
            id: decoded.id,
            tenantId: decoded.tenantId,   // Formato Novo
            tenant_id: decoded.tenantId,  // Formato Compatibilidade
            role: decoded.role,
            name: decoded.name || 'Usuário Portal'
        };
        return next();
    }

    // --- CENÁRIO 2: ACESSO ADMINISTRATIVO (ERP) ---
    // Validamos se o usuário ainda existe no banco
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Usuário administrador não encontrado.' });
    }

    const user = result.rows[0];

    // O PULO DO GATO: Injetamos ambas as versões do ID do tenant
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      
      // Mapeamento Duplo para evitar erros em controllers antigos e novos
      tenantId: user.tenant_id,   // CamelCase (Novos Controllers: RH, Tickets)
      tenant_id: user.tenant_id,  // SnakeCase (Controllers Antigos: Dashboard, Vendas)
      
      isSuperAdmin: user.is_super_admin,
      role: user.role || 'agent'
    };

    return next();

  } catch (err) {
    console.error('Erro de Autenticação (Middleware):', err.message);
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
};