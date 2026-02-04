const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. ÁREA PÚBLICA (Portal do Cliente / Helpdesk)
// ==========================================

// Busca configurações visuais do portal pelo SLUG
exports.getPortalConfig = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await pool.query(
            'SELECT tenant_id, portal_title, primary_color, logo_url, support_email FROM helpdesk_config WHERE slug = $1', 
            [slug]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Central de ajuda não encontrada' });
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
};

// Login do Cliente Externo (via tabela support_users)
exports.clientLogin = async (req, res) => {
    try {
        const { email, password, slug } = req.body;

        // 1. Descobrir Tenant
        let tenantId = null;
        if (slug) {
            const configRes = await pool.query('SELECT tenant_id FROM helpdesk_config WHERE slug = $1', [slug]);
            if (configRes.rows.length === 0) return res.status(404).json({ error: 'Empresa não encontrada' });
            tenantId = configRes.rows[0].tenant_id;
        }

        // 2. Buscar Usuário
        let userQuery = 'SELECT * FROM support_users WHERE email = $1';
        let userParams = [email];
        
        if (tenantId) {
            userQuery += ' AND tenant_id = $2';
            userParams.push(tenantId);
        }

        const userRes = await pool.query(userQuery, userParams);

        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
        const user = userRes.rows[0];

        // 3. Validar Senha
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

        // 4. Gerar Token
        const token = jwt.sign(
            { id: user.id, tenantId: user.tenant_id, role: 'support_user', name: user.name },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '8h' }
        );

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: 'support_user' } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro no login' });
    }
};

// ==========================================
// 2. CONFIGURAÇÃO (Painel Admin)
// ==========================================

exports.getConfig = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await pool.query(
            'SELECT slug, portal_title, primary_color, support_email, auto_assign, allow_guest_tickets FROM helpdesk_config WHERE tenant_id = $1', 
            [tenantId]
        );
        
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ 
                slug: '', 
                portal_title: 'Central de Ajuda', 
                primary_color: '#4f46e5',
                support_email: '',
                auto_assign: false,
                allow_guest_tickets: false
            });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
};

exports.saveConfig = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { slug, portal_title, primary_color, support_email, auto_assign, allow_guest_tickets } = req.body;

        if (slug) {
            const check = await pool.query('SELECT tenant_id FROM helpdesk_config WHERE slug = $1 AND tenant_id != $2', [slug, tenantId]);
            if (check.rows.length > 0) return res.status(400).json({ error: 'Slug já em uso.' });
        }

        const result = await pool.query(`
            INSERT INTO helpdesk_config (tenant_id, slug, portal_title, primary_color, support_email, auto_assign, allow_guest_tickets)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (tenant_id) DO UPDATE 
            SET slug = EXCLUDED.slug, 
                portal_title = EXCLUDED.portal_title, 
                primary_color = EXCLUDED.primary_color,
                support_email = EXCLUDED.support_email,
                auto_assign = EXCLUDED.auto_assign,
                allow_guest_tickets = EXCLUDED.allow_guest_tickets
            RETURNING *
        `, [tenantId, slug, portal_title, primary_color, support_email, auto_assign, allow_guest_tickets]);

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
};

// ==========================================
// 3. CATEGORIAS E USUÁRIOS
// ==========================================

exports.getCategories = async (req, res) => {
    try {
        let tenantId = req.user?.tenantId;
        if (!tenantId && req.query.slug) {
             const conf = await pool.query('SELECT tenant_id FROM helpdesk_config WHERE slug = $1', [req.query.slug]);
             if (conf.rows.length > 0) tenantId = conf.rows[0].tenant_id;
        }
        if(!tenantId) return res.status(400).json({error: 'Contexto não identificado'});

        const result = await pool.query('SELECT * FROM ticket_categories WHERE tenant_id = $1 ORDER BY id ASC', [tenantId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar categorias' });
    }
};

exports.createCategory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, description, sla_hours } = req.body;
        const result = await pool.query(
            'INSERT INTO ticket_categories (tenant_id, name, description, sla_hours) VALUES ($1, $2, $3, $4) RETURNING *',
            [tenantId, name, description, sla_hours || 24]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar categoria' });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId;
        await pool.query('DELETE FROM ticket_categories WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Categoria removida' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover categoria' });
    }
};

exports.getSupportUsers = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await pool.query('SELECT id, name, email FROM support_users WHERE tenant_id = $1', [tenantId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários' });
    }
};

exports.createSupportUser = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { name, email, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO support_users (tenant_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, name, email`,
            [tenantId, name, email, hash]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

exports.getAgents = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await pool.query('SELECT id, name, email, role FROM users WHERE tenant_id = $1', [tenantId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar agentes' });
    }
};

exports.getUsers = exports.getSupportUsers;

// ==========================================
// 4. OPERAÇÃO DE TICKETS (CRUD INTERNO)
// ==========================================

exports.getTickets = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const role = req.user.role;
        
        let query = `
            SELECT t.*, c.name as category_name, 
            CASE 
                WHEN t.requester_type = 'support_user' THEN su.name
                WHEN t.requester_type = 'employee' THEN emp.name
                ELSE u.name 
            END as requester_name
            FROM tickets t
            LEFT JOIN ticket_categories c ON t.category_id = c.id
            LEFT JOIN support_users su ON (t.requester_id = su.id AND t.requester_type = 'support_user')
            LEFT JOIN employees emp ON (t.requester_id = emp.id AND t.requester_type = 'employee')
            LEFT JOIN users u ON (t.requester_id = u.id AND (t.requester_type = 'user' OR t.requester_type = 'admin'))
            WHERE t.tenant_id = $1
        `;
        const params = [tenantId];

        if (!['admin', 'agent', 'manager', 'owner'].includes(role)) {
            query += ` AND t.requester_id = $2`;
            params.push(userId);
        }

        query += ` ORDER BY t.created_at DESC`;
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar tickets' });
    }
};

exports.createTicket = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { subject, description, category_id, priority, requester_id, requester_type } = req.body;

        // Se for admin criando para outro, usa os dados do body, senão usa do usuário logado
        const role = req.user.role;
        let finalReqId = userId;
        let finalReqType = role;

        if (['admin', 'agent'].includes(role) && requester_id) {
            finalReqId = requester_id;
            finalReqType = requester_type || 'support_user';
        }

        const result = await pool.query(
            `INSERT INTO tickets (tenant_id, subject, description, category_id, priority, requester_type, requester_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'open') RETURNING *`,
            [tenantId, subject, description, category_id, priority || 'medium', finalReqType, finalReqId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar ticket' });
    }
};

exports.getTicketDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { id } = req.params;

        const ticketRes = await pool.query(`SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
        if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'Ticket não encontrado' });
        
        const msgs = await pool.query(
            `SELECT m.*, 
            CASE 
                WHEN m.sender_type = 'support_user' THEN su.name
                WHEN m.sender_type = 'employee' THEN emp.name
                ELSE u.name 
            END as sender_name
            FROM ticket_messages m
            LEFT JOIN support_users su ON (m.sender_id = su.id AND m.sender_type = 'support_user')
            LEFT JOIN employees emp ON (m.sender_id = emp.id AND m.sender_type = 'employee')
            LEFT JOIN users u ON (m.sender_id = u.id AND m.sender_type IN ('user','agent','admin'))
            WHERE m.ticket_id = $1 ORDER BY m.created_at ASC`,
            [id]
        );

        res.json({ ticket: ticketRes.rows[0], messages: msgs.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar ticket' });
    }
};

exports.addMessage = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { id } = req.params; // ticketRoutes usa :id para addMessageInternal
        const { message, is_internal } = req.body;

        await pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, is_internal_note)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, role, userId, message, is_internal || false]
        );
        
        await pool.query('UPDATE tickets SET updated_at = NOW() WHERE id = $1', [id]);
        res.json({ message: 'Mensagem enviada' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
};

exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const tenantId = req.user.tenantId;
        await pool.query('UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3', [status, id, tenantId]);
        res.json({ message: 'Status atualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar' });
    }
};

// ==========================================
// 5. INTEGRAÇÃO COM ROTAS PÚBLICAS (LEGADO/HELPDESK)
// ==========================================
// Estas funções são necessárias para que o ticketRoutes.js não quebre.
// Elas mapeiam as chamadas públicas para a lógica apropriada.

exports.publicAuth = exports.clientLogin;

exports.createTicketPublic = async (req, res) => {
    // Para criar ticket público, assumimos que o token JWT de support_user foi enviado no Header Authorization
    // O middleware de rota pública (se houver) ou a lógica aqui deve decodificar
    // Para simplificar e evitar crash, usamos uma lógica básica de inserção sem depender do req.user do authMiddleware padrão
    try {
        const { tenant_id, client_id, subject, description, priority } = req.body;
        // Validação básica
        if (!tenant_id || !subject) return res.status(400).json({ error: 'Dados incompletos' });

        const result = await pool.query(
            `INSERT INTO tickets (tenant_id, requester_id, requester_type, subject, description, priority, status)
             VALUES ($1, $2, 'support_user', $3, $4, $5, 'open') RETURNING id`,
            [tenant_id, client_id, subject, description, priority || 'medium']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar ticket público' });
    }
};

exports.listTicketsPublic = async (req, res) => {
    try {
        const { clientId } = req.params;
        const result = await pool.query(
            `SELECT id, subject, status, priority, created_at, updated_at 
             FROM tickets WHERE requester_id = $1 AND requester_type = 'support_user' ORDER BY created_at DESC`,
            [clientId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar tickets' });
    }
};

exports.getTicketPublic = async (req, res) => {
    try {
        const { id } = req.params;
        const ticketRes = await pool.query(`SELECT * FROM tickets WHERE id = $1`, [id]);
        if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'Ticket não encontrado' });
        
        const msgs = await pool.query(
            `SELECT m.*, 
            CASE 
                WHEN m.sender_type = 'support_user' THEN su.name
                WHEN m.sender_type = 'agent' OR m.sender_type = 'admin' THEN u.name
                ELSE 'Suporte'
            END as sender_name
            FROM ticket_messages m
            LEFT JOIN support_users su ON (m.sender_id = su.id AND m.sender_type = 'support_user')
            LEFT JOIN users u ON (m.sender_id = u.id AND m.sender_type IN ('agent','admin'))
            WHERE m.ticket_id = $1 AND m.is_internal_note = false
            ORDER BY m.created_at ASC`,
            [id]
        );

        res.json({ ticket: ticketRes.rows[0], messages: msgs.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar ticket' });
    }
};

exports.addMessagePublic = async (req, res) => {
    try {
        const { id } = req.params;
        const { message, sender_id } = req.body; // O ID do remetente deve vir no body se não tiver auth middleware

        await pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message)
             VALUES ($1, 'support_user', $2, $3)`,
            [id, sender_id, message]
        );
        await pool.query("UPDATE tickets SET status = 'open', updated_at = NOW() WHERE id = $1", [id]);
        res.json({ message: 'Mensagem enviada' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
};

// Exports internos adicionais
exports.createTicketInternal = exports.createTicket;
exports.addMessageInternal = exports.addMessage;
exports.updateTicketStatus = exports.updateStatus;