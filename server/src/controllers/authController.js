const authService = require('../services/authService');

class AuthController {
    async register(req, res) {
        try {
            const user = await authService.register(req.body);
            res.status(201).json({
                message: 'Usuário criado com sucesso!',
                user
            });
        } catch (error) {
            // Diferenciar erros de cliente (400) de erros de servidor (500)
            const statusCode = error.message.includes('obrigatórios') || 
                               error.message.includes('inválido') || 
                               error.message.includes('cadastrado') ? 400 : 500;
            
            res.status(statusCode).json({ error: error.message });
        }
    }

    async login(req, res) {
        try {
            const { email, password } = req.body;
            const data = await authService.login(email, password);
            res.json(data);
        } catch (error) {
            res.status(401).json({ error: error.message });
        }
    }
}

module.exports = new AuthController();