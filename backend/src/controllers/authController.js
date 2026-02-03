const { query } = require('../config/db'); // Garanta que seu db.js exporta { query }
const { hashPassword, comparePassword, generateToken } = require('../utils/security');
const { sendMail } = require('../config/mailer');
const crypto = require('crypto');
const logger = require('../config/logger');

// ==========================================
// 1. REGISTRO (Cria Empresa e Usuário Admin)
// ==========================================
const register = async (req, res) => {
    try {
        const { companyName, slug, name, email, password } = req.body;

        if (!companyName || !slug || !email || !password) {
            return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
        }

        // Verifica unicidade
        const slugCheck = await query('SELECT id FROM tenants WHERE slug = $1', [slug]);
        if (slugCheck.rows.length > 0) return res.status(400).json({ message: 'Este slug (URL da empresa) já está em uso.' });

        const emailCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (emailCheck.rows.length > 0) return res.status(400).json({ message: 'Email já cadastrado.' });

        // Cria o Tenant
        const tenantResult = await query(
            'INSERT INTO tenants (name, slug, active) VALUES ($1, $2, true) RETURNING id', 
            [companyName, slug]
        );
        const tenantId = tenantResult.rows[0].id;

        // Cria o Usuário Admin
        const hashedPassword = await hashPassword(password);
        const userResult = await query(
            `INSERT INTO users (tenant_id, name, email, password_hash, role, is_super_admin) 
             VALUES ($1, $2, $3, $4, 'admin', false) 
             RETURNING id, name, email, role, tenant_id`,
            [tenantId, name, email, hashedPassword]
        );

        const user = userResult.rows[0];
        
        // Gera Token
        const token = generateToken(user);

        logger.info(`Nova empresa registrada: ${companyName} (${email})`);

        return res.status(201).json({ message: 'Cadastro realizado com sucesso!', token, user });

    } catch (error) {
        logger.error(`Erro no registro: ${error.message}`);
        return res.status(500).json({ message: 'Erro interno ao registrar.' });
    }
};

// ==========================================
// 2. LOGIN (CORRIGIDO PARA EVITAR LOOP)
// ==========================================
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Busca o usuário admin
        const result = await query(
            `SELECT u.*, t.name as company_name, t.slug as company_slug, t.active as tenant_active 
             FROM users u 
             JOIN tenants t ON u.tenant_id = t.id 
             WHERE u.email = $1`, 
            [email]
        );

        if (result.rows.length === 0) {
            logger.warn(`Login falhou (email não existe): ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        const user = result.rows[0];

        // Verifica se a empresa está ativa
        if (!user.tenant_active) {
            logger.warn(`Login bloqueado (empresa inativa): ${email}`);
            return res.status(403).json({ message: 'Sua conta empresarial está inativa. Contate o suporte.' });
        }

        // Valida senha
        const isMatch = await comparePassword(password, user.password_hash);
        if (!isMatch) {
            logger.warn(`Login falhou (senha incorreta): ${email}`);
            return res.status(401).json({ message: 'Credenciais inválidas.' });
        }

        // Gera Token (Padronizado via utils/security)
        const token = generateToken(user);

        // Remove dados sensíveis do retorno
        delete user.password_hash;
        delete user.reset_token;

        logger.info(`Admin logado: ${email}`);

        // Retorno: Importante mandar tenant_id E tenantId para compatibilidade total
        return res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role || 'admin', // Garante uma role se vier nulo
                
                // --- PULO DO GATO: COMPATIBILIDADE ---
                tenant_id: user.tenant_id, // Para o Dashboard antigo
                tenantId: user.tenant_id,  // Para o Middleware/RH novo
                // -------------------------------------
                
                companyName: user.company_name,
                companySlug: user.company_slug,
                avatar: user.avatar_path,
                isSuperAdmin: user.is_super_admin
            }
        });

    } catch (error) {
        logger.error(`Erro no login: ${error.message}`);
        return res.status(500).json({ message: 'Erro interno ao realizar login.' });
    }
};

// ==========================================
// 3. OBTER PERFIL
// ==========================================
const getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query('SELECT id, name, email, role, avatar_path, tenant_id FROM users WHERE id = $1', [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        
        return res.json(result.rows[0]);
    } catch (error) {
        logger.error(`Erro getProfile: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao buscar perfil.' });
    }
};

// ==========================================
// 4. ATUALIZAR PERFIL
// ==========================================
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, currentPassword, newPassword, avatar_path } = req.body;

        const userCheck = await query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = userCheck.rows[0];

        // Se quiser validar senha atual antes de mudar dados sensíveis
        if (currentPassword) {
            const isMatch = await comparePassword(currentPassword, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Senha atual incorreta.' });
            }
        }

        let passwordHash = user.password_hash;
        if (newPassword && newPassword.trim() !== '') {
            passwordHash = await hashPassword(newPassword);
        }

        const finalAvatar = avatar_path !== undefined ? avatar_path : user.avatar_path;

        await query(
            `UPDATE users SET name = $1, email = $2, password_hash = $3, avatar_path = $4 WHERE id = $5`,
            [name, email, passwordHash, finalAvatar, userId]
        );

        logger.info(`Perfil atualizado: ${userId}`);

        return res.json({ 
            message: 'Perfil atualizado com sucesso!',
            user: { id: userId, name, email, avatar: finalAvatar }
        });

    } catch (error) {
        logger.error(`Erro updateProfile: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao atualizar perfil.' });
    }
};

// ==========================================
// 5. ESQUECI MINHA SENHA (Request Reset)
// ==========================================
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const userCheck = await query('SELECT id, name FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length === 0) {
            // Retorna 200 por segurança (não revelar se email existe)
            return res.json({ message: 'Se o email existir, enviamos um link de recuperação.' });
        }

        const user = userCheck.rows[0];
        const token = crypto.randomBytes(20).toString('hex');
        
        // Expira em 1 hora
        const now = new Date();
        now.setHours(now.getHours() + 1);

        await query(
            'UPDATE users SET reset_token = $1, reset_expires = $2 WHERE id = $3',
            [token, now, user.id]
        );

        // URL do Frontend para reset
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h3>Olá, ${user.name}</h3>
                <p>Recebemos uma solicitação para redefinir sua senha.</p>
                <p>Se foi você, clique no botão abaixo:</p>
                <a href="${resetUrl}" style="background:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;display:inline-block;margin-top:10px;">Redefinir Minha Senha</a>
                <p style="margin-top:20px;color:#666;font-size:12px;">O link expira em 1 hora.</p>
            </div>
        `;

        await sendMail(email, 'Recuperação de Senha', html);
        
        logger.info(`Email de recuperação enviado para: ${email}`);

        return res.json({ message: 'Email de recuperação enviado.' });

    } catch (error) {
        logger.error(`Erro forgotPassword: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao processar solicitação.' });
    }
};

// ==========================================
// 6. REDEFINIR SENHA (Confirm Reset)
// ==========================================
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) return res.status(400).json({ message: 'Dados incompletos.' });

        const result = await query(
            `SELECT id FROM users 
             WHERE reset_token = $1 AND reset_expires > NOW()`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Link inválido ou expirado.' });
        }

        const user = result.rows[0];
        const newHash = await hashPassword(newPassword);

        await query(
            `UPDATE users 
             SET password_hash = $1, reset_token = NULL, reset_expires = NULL 
             WHERE id = $2`,
            [newHash, user.id]
        );

        logger.info(`Senha redefinida com sucesso para usuário: ${user.id}`);

        return res.json({ message: 'Sua senha foi alterada com sucesso! Faça login.' });

    } catch (error) {
        logger.error(`Erro resetPassword: ${error.message}`);
        return res.status(500).json({ message: 'Erro ao redefinir senha.' });
    }
};

module.exports = {
    register,
    login,
    getProfile,
    updateProfile,
    forgotPassword,
    resetPassword
};