// server/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
    }

    // Formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
        return res.status(401).json({ error: 'Token mal formatado.' });
    }

    const [scheme, token] = parts;

    if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ error: 'Token mal formatado. Utilize o prefixo Bearer.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Segurança SAAS: Injeta o TenantID e UserID na requisição
        // O payload do JWT DEVE conter o companyId (adicionaremos isso no login)
        req.user = { 
            id: decoded.id, 
            email: decoded.email,
            companyId: decoded.companyId, // CRÍTICO: Tenant ID para queries
            role: decoded.role            // Controle de permissão (Admin/User)
        };

        // Verificação extra de segurança (opcional):
        // Se o usuário não tiver companyId (exceto se for super-admin de sistema), rejeita.
        if (!req.user.companyId && req.user.role !== 'SUPER_ADMIN') {
             return res.status(403).json({ error: 'Usuário não associado a uma empresa.' });
        }

        return next();
    } catch (err) {
        console.error('Erro de autenticação:', err.message);
        return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
    }
};