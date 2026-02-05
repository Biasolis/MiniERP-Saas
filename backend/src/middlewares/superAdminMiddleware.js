const superAdminMiddleware = (req, res, next) => {
    // Verifica se o usuário logado (pelo authMiddleware) é super admin
    if (req.user && (req.user.is_super_admin === true || req.user.role === 'super_admin')) {
        next();
    } else {
        return res.status(403).json({ 
            message: 'Acesso negado. Requer privilégios de Super Administrador.' 
        });
    }
};

module.exports = superAdminMiddleware;