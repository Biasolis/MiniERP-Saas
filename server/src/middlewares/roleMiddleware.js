// server/src/middlewares/roleMiddleware.js

// Verifica se o usuário tem o papel necessário
const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        // req.user vem do authMiddleware anterior
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                error: 'Acesso negado. Privilégios insuficientes.' 
            });
        }
        next();
    };
};

module.exports = { checkRole };