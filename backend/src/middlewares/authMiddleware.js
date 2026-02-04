const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  // O formato esperado é "Bearer <token>"
  const parts = authHeader.split(' ');

  if (parts.length !== 2) {
    return res.status(401).json({ error: 'Erro no Token' });
  }

  const [scheme, token] = parts;

  if (!/^Bearer$/i.test(scheme)) {
    return res.status(401).json({ error: 'Token malformatado' });
  }

  // Se o token for a string "null" ou "undefined" (erro comum de frontend), barra logo
  if (token === 'null' || token === 'undefined' || !token) {
      return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = {
        id: decoded.id,
        tenantId: decoded.tenantId, // Suporte legado
        tenant_id: decoded.tenantId, // Novo padrão
        role: decoded.role || 'user', // Se não tiver role, assume user
        isSuperAdmin: decoded.isSuperAdmin || false
    };

    return next();
  } catch (err) {
    // Trata erros específicos do JWT sem logar como Erro Crítico
    if (err.name === 'JsonWebTokenError' || err.message === 'jwt malformed') {
        return res.status(401).json({ error: 'Token inválido ou malformado' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expirado' });
    }

    console.error('Erro desconhecido na autenticação:', err);
    return res.status(401).json({ error: 'Falha na autenticação' });
  }
};