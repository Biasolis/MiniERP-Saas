const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==========================================
// 1. ÁREA PÚBLICA (Portal do Cliente)
// ==========================================

// Busca configurações visuais do portal pelo SLUG (sem login)
exports.getPortalConfig = async (req, res) => {
    try {
        const { slug } = req.params;
        const result = await pool.query(
            'SELECT tenant_id, portal_title, primary_color, logo_url FROM helpdesk_config WHERE slug = $1', 
            [slug]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ error: 'Central de ajuda não encontrada' });
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar configurações' });
    }
};

// Login do Cliente Externo
exports.clientLogin = async (req, res) => {
    try {
        const { email, password, slug } = req.body;

        // 1. Descobrir Tenant pelo Slug
        const configRes = await pool.query('SELECT tenant_id FROM helpdesk_config WHERE slug = $1', [slug]);
        if (configRes.rows.length === 0) return res.status(404).json({ error: 'Empresa não encontrada' });
        const tenantId = configRes.rows[0].tenant_id;

        // 2. Buscar Usuário no Tenant correto
        const userRes = await pool.query(
            'SELECT * FROM support_users WHERE email = $1 AND tenant_id = $2', 
            [email, tenantId]
        );

        if (userRes.rows.length === 0) return res.status(401).json({ error: 'Credenciais inválidas' });
        const user = userRes.rows[0];

        // 3. Validar Senha
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Senha incorreta' });

        // 4. Gerar Token
        const token = jwt.sign(
            { id: user.id, tenantId: user.tenant_id, role: 'support_user', name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.json({ token, user: { name: user.name, email: user.email } });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro no login' });
    }
};

// ==========================================
// 2. CONFIGURAÇÃO (Painel Admin)
// ==========================================

// Buscar Configuração Atual (GET /api/tickets/config)
exports.getConfig = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        
        const result = await pool.query(
            'SELECT slug, portal_title, primary_color, support_email, auto_assign, allow_guest_tickets FROM helpdesk_config WHERE tenant_id = $1', 
            [tenantId]
        );
        
        // Se não existir, retorna padrão em vez de 404 para não quebrar o form
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
        console.error("Erro em getConfig:", error);
        res.status(500).json({ error: 'Erro ao buscar configurações' });
    }
};

// Salvar Configuração (POST/PUT /api/tickets/config)
exports.saveConfig = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const { slug, portal_title, primary_color, support_email, auto_assign, allow_guest_tickets } = req.body;

        // Validação de Slug Único
        if (slug) {
            const check = await pool.query('SELECT tenant_id FROM helpdesk_config WHERE slug = $1 AND tenant_id != $2', [slug, tenantId]);
            if (check.rows.length > 0) return res.status(400).json({ error: 'Este endereço (slug) já está em uso por outra empresa.' });
        }

        // Upsert (Insere ou Atualiza)
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
        console.error("Erro em saveConfig:", error);
        res.status(500).json({ error: 'Erro ao salvar configurações' });
    }
};

// ==========================================
// 3. CATEGORIAS E USUÁRIOS (Gestão)
// ==========================================

// Listar Categorias (GET /api/tickets/admin/categories)
exports.getCategories = async (req, res) => {
    try {
        let tenantId = req.user?.tenantId || req.user?.tenant_id;
        
        // Suporte para acesso público via slug
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

// Criar Categoria (POST /api/tickets/categories)
exports.createCategory = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
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

// Deletar Categoria
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = req.user.tenantId || req.user.tenant_id;
        await pool.query('DELETE FROM ticket_categories WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
        res.json({ message: 'Categoria removida' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao remover categoria' });
    }
};

// Listar Clientes de Suporte (GET /api/tickets/users)
// Nota: O TicketConfig chama /users esperando lista de clientes, não usuários internos
exports.getSupportUsers = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const result = await pool.query(
            'SELECT id, name, email, created_at FROM support_users WHERE tenant_id = $1 ORDER BY created_at DESC',
            [tenantId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar clientes' });
    }
};

// Criar Usuário de Suporte (POST /api/tickets/users)
exports.createSupportUser = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const { name, email, password } = req.body;
        const hash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO support_users (tenant_id, name, email, password_hash) 
             VALUES ($1, $2, $3, $4) RETURNING id, name, email`,
            [tenantId, name, email, hash]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Email já cadastrado' });
        res.status(500).json({ error: 'Erro ao criar usuário' });
    }
};

// Listar Usuários Internos (GET /api/tickets/agents) - Adicionado para evitar erro se for chamado
exports.getAgents = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const result = await pool.query(
            'SELECT id, name, email, role FROM users WHERE tenant_id = $1 ORDER BY name ASC',
            [tenantId]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar agentes' });
    }
};

// Listar Usuários Internos Gerais (Se usado como fallback para users)
exports.getUsers = async (req, res) => {
    // Redireciona para getSupportUsers se for a intenção do front, ou getAgents
    // Como seu front TicketConfig chama /users para listar clientes, usamos getSupportUsers
    return exports.getSupportUsers(req, res);
};

// ==========================================
// 4. OPERAÇÃO DE TICKETS (CRUD)
// ==========================================

// Listar Tickets
exports.getTickets = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const userId = req.user.id;
        const role = req.user.role; // support_user, employee, admin, etc
        
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
            LEFT JOIN users u ON (t.requester_id = u.id AND t.requester_type = 'user')
            WHERE t.tenant_id = $1
        `;
        const params = [tenantId];

        // Se for cliente ou colaborador, vê apenas os seus
        const isStaff = ['admin', 'agent', 'manager'].includes(role);
        if (!isStaff) {
            query += ` AND t.requester_id = $2`; // AND t.requester_type = $3 (Simplificado)
            params.push(userId);
        }

        query += ` ORDER BY t.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar tickets' });
    }
};

// Criar Ticket
exports.createTicket = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const userId = req.user.id;
        const role = req.user.role || 'user';
        const { subject, title, description, category_id, priority, category } = req.body;

        const finalTitle = title || subject;

        let finalCatId = category_id;
        if (!finalCatId && category) {
            const catRes = await pool.query('SELECT id FROM ticket_categories WHERE tenant_id=$1 AND lower(name)=lower($2)', [tenantId, category]);
            if(catRes.rows.length > 0) finalCatId = catRes.rows[0].id;
        }

        const result = await pool.query(
            `INSERT INTO tickets (tenant_id, subject, description, category_id, priority, requester_type, requester_id, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'open') RETURNING *`,
            [tenantId, finalTitle, description, finalCatId, priority || 'medium', role, userId]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao abrir ticket' });
    }
};

// Detalhes e Mensagens
exports.getTicketDetails = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const userId = req.user.id;
        const role = req.user.role;
        const { id } = req.params;

        const ticketRes = await pool.query(`SELECT * FROM tickets WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
        if (ticketRes.rows.length === 0) return res.status(404).json({ error: 'Ticket não encontrado' });
        const ticket = ticketRes.rows[0];

        const isStaff = ['admin', 'agent', 'manager'].includes(role);
        if (!isStaff && ticket.requester_id !== userId) {
            return res.status(403).json({ error: 'Acesso negado' });
        }

        let msgQuery = `
            SELECT m.*, 
            CASE 
                WHEN m.sender_type = 'support_user' THEN su.name
                WHEN m.sender_type = 'employee' THEN emp.name
                ELSE u.name 
            END as sender_name
            FROM ticket_messages m
            LEFT JOIN support_users su ON (m.sender_id = su.id AND m.sender_type = 'support_user')
            LEFT JOIN employees emp ON (m.sender_id = emp.id AND m.sender_type = 'employee')
            LEFT JOIN users u ON (m.sender_id = u.id AND (m.sender_type = 'user' OR m.sender_type = 'agent' OR m.sender_type = 'admin'))
            WHERE m.ticket_id = $1
        `;

        if (!isStaff) msgQuery += ` AND m.is_internal_note = false`;
        
        msgQuery += ` ORDER BY m.created_at ASC`;

        const msgs = await pool.query(msgQuery, [id]);

        res.json({ ticket, messages: msgs.rows });

    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar ticket' });
    }
};

// Adicionar Mensagem
exports.addMessage = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const userId = req.user.id;
        const role = req.user.role;
        const { ticketId } = req.params;
        const { message, is_internal } = req.body;

        const isInternalNote = (['admin', 'agent'].includes(role)) ? (is_internal || false) : false;

        const result = await pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, message, is_internal_note)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [ticketId, role, userId, message, isInternalNote]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao enviar mensagem' });
    }
};

// Atualizar Status
exports.updateStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId || req.user.tenant_id;
        const { id } = req.params;
        const { status } = req.body;

        await pool.query(
            'UPDATE tickets SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
            [status, id, tenantId]
        );
        res.json({ message: 'Status atualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar' });
    }
};