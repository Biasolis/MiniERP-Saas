const { query } = require('../config/db');
const geminiService = require('../services/geminiService');
const auditService = require('../services/auditService');

// ==========================================
// 1. LISTAR TRANSAÇÕES (Com Filtros, Paginação e Joins)
// ==========================================
const listTransactions = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        // Aceita tanto startDate (legado) quanto start_date (novo front)
        const { page = 1, limit = 50, type, status, startDate, endDate, start_date, end_date } = req.query;
        const offset = (page - 1) * limit;

        // Normaliza datas
        const finalStart = start_date || startDate;
        const finalEnd = end_date || endDate;

        let sql = `
            SELECT t.id, t.description, t.amount, t.type, t.cost_type, t.status, t.date, t.attachment_path,
                   c.name as category_name, cl.name as client_name, s.name as supplier_name,
                   t.installment_index, t.installments_total
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            LEFT JOIN clients cl ON t.client_id = cl.id
            LEFT JOIN suppliers s ON t.supplier_id = s.id
            WHERE t.tenant_id = $1
        `;
        const params = [tenantId];
        let paramIndex = 2;

        if (type && type !== 'all') {
            sql += ` AND t.type = $${paramIndex}`;
            params.push(type);
            paramIndex++;
        }

        if (status && status !== 'all') {
            sql += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (finalStart && finalEnd) {
            sql += ` AND t.date BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
            params.push(finalStart, finalEnd);
            paramIndex += 2;
        }

        sql += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await query(sql, params);
        
        // Contagem para paginação (se necessário)
        // const countResult = await query(`SELECT COUNT(*) FROM transactions WHERE tenant_id = $1`, [tenantId]);

        // Retorna array direto se o front esperar array, ou objeto se esperar paginação.
        // O front novo espera array direto (res.data), o antigo paginação.
        // Vou retornar array direto pois o novo front Transaction.jsx faz map direto.
        return res.json(result.rows);

    } catch (error) {
        console.error('Erro ao listar transações:', error);
        return res.status(500).json({ message: 'Erro interno ao buscar dados.' });
    }
};

// ==========================================
// 2. RESUMO FINANCEIRO (NOVO - Para tela de Transações)
// ==========================================
const getSummary = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const { start_date, end_date } = req.query;

        let dateFilter = '';
        const params = [tenantId];

        if (start_date && end_date) {
            dateFilter = `AND date BETWEEN $2 AND $3`;
            params.push(start_date, end_date);
        }

        const sql = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'completed' THEN amount ELSE 0 END), 0) as income_received,
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) as income_pending,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'completed' THEN amount ELSE 0 END), 0) as expense_paid,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'pending' THEN amount ELSE 0 END), 0) as expense_pending
            FROM transactions
            WHERE tenant_id = $1 ${dateFilter}
        `;

        const result = await query(sql, params);
        const data = result.rows[0];

        const balance = Number(data.income_received) - Number(data.expense_paid);
        const expected_balance = (Number(data.income_received) + Number(data.income_pending)) - (Number(data.expense_paid) + Number(data.expense_pending));

        return res.json({ ...data, balance, expected_balance });

    } catch (error) {
        return res.status(500).json({ message: 'Erro ao calcular resumo.' });
    }
};

// ==========================================
// 3. CRIAR NOVA TRANSAÇÃO (Com Parcelas e IA)
// ==========================================
const createTransaction = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { 
            description, amount, type, cost_type, date, status, 
            use_ai_category, client_id, supplier_id, attachment_path,
            installments, category_id 
        } = req.body;

        if (!description || !amount || !type || !date) {
            return res.status(400).json({ message: 'Campos obrigatórios faltando.' });
        }

        await query('BEGIN');

        // 1. Lógica de Categoria (IA ou Manual)
        let finalCategoryId = category_id;
        
        if (!finalCategoryId && use_ai_category) {
            const categoryName = await geminiService.categorizeTransaction(description);
            const catCheck = await query('SELECT id FROM categories WHERE tenant_id = $1 AND name = $2', [tenantId, categoryName]);
            
            if (catCheck.rows.length > 0) {
                finalCategoryId = catCheck.rows[0].id;
            } else {
                const newCat = await query('INSERT INTO categories (tenant_id, name, type) VALUES ($1, $2, $3) RETURNING id', [tenantId, categoryName, type]);
                finalCategoryId = newCat.rows[0].id;
            }
        }

        // 2. Lógica de Parcelamento
        const numInstallments = Number(installments) > 0 ? Number(installments) : 1;
        const installmentValue = Math.floor((Number(amount) / numInstallments) * 100) / 100;
        const remainder = Number(amount) - (installmentValue * numInstallments);

        // Loop para criar as parcelas
        for (let i = 0; i < numInstallments; i++) {
            const val = i === numInstallments - 1 ? (installmentValue + remainder) : installmentValue;
            
            const dueDate = new Date(date);
            dueDate.setMonth(dueDate.getMonth() + i);

            const desc = numInstallments > 1 ? `${description} (${i+1}/${numInstallments})` : description;
            const st = status || 'pending';

            await query(
                `INSERT INTO transactions 
                (tenant_id, category_id, client_id, supplier_id, description, amount, type, cost_type, status, date, created_by, attachment_path, installment_index, installments_total) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
                [
                    tenantId, finalCategoryId, client_id || null, supplier_id || null, 
                    desc, val, type, cost_type || 'variable', st, dueDate, userId, 
                    attachment_path || null, i + 1, numInstallments
                ]
            );
        }

        // --- AUDITORIA ---
        await auditService.logAction(
            tenantId, 
            userId, 
            'CREATE', 
            'TRANSACTION', 
            null, // ID null pois podem ser várias
            `Criou transação: ${description} (R$ ${amount}) em ${numInstallments}x`
        );

        await query('COMMIT');
        return res.status(201).json({ message: 'Lançamento realizado.' });

    } catch (error) {
        await query('ROLLBACK');
        console.error('Erro ao criar transação:', error);
        return res.status(500).json({ message: 'Erro ao salvar transação.' });
    }
};

// ==========================================
// 4. ATUALIZAR STATUS (DAR BAIXA)
// ==========================================
const updateTransactionStatus = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;
        const { status } = req.body;

        if (!['pending', 'completed'].includes(status)) {
             return res.status(400).json({ message: 'Status inválido.' });
        }

        const result = await query(
            `UPDATE transactions 
             SET status = $1, updated_at = NOW() 
             WHERE id = $2 AND tenant_id = $3 
             RETURNING *`,
            [status, id, tenantId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Transação não encontrada.' });
        }

        // --- AUDITORIA ---
        await auditService.logAction(
            tenantId, 
            userId, 
            'UPDATE', 
            'TRANSACTION', 
            id, 
            `Alterou status para: ${status}`
        );

        return res.json(result.rows[0]);

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        return res.status(500).json({ message: 'Erro ao atualizar transação.' });
    }
};

// ==========================================
// 5. DELETAR TRANSAÇÃO
// ==========================================
const deleteTransaction = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const { id } = req.params;

        const check = await query(
            'SELECT description, amount FROM transactions WHERE id=$1 AND tenant_id=$2', 
            [id, tenantId]
        );
        
        if (check.rows.length === 0) {
            return res.status(404).json({ message: 'Transação não encontrada' });
        }
        
        const oldData = check.rows[0];

        await query('DELETE FROM transactions WHERE id = $1 AND tenant_id = $2', [id, tenantId]);

        // --- AUDITORIA ---
        await auditService.logAction(
            tenantId, 
            userId, 
            'DELETE', 
            'TRANSACTION', 
            id, 
            `Apagou transação: ${oldData.description} (R$ ${oldData.amount})`
        );

        return res.json({ message: 'Transação removida com sucesso.' });

    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        return res.status(500).json({ message: 'Erro ao remover transação.' });
    }
};

// ==========================================
// 6. DASHBOARD KPI (Mantido)
// ==========================================
const getDashboardSummary = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        const sql = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_income,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'completed' THEN amount ELSE 0 END), 0) as total_expense,
                COALESCE(SUM(CASE WHEN type = 'income' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_income,
                COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'pending' THEN amount ELSE 0 END), 0) as pending_expense,
                COUNT(*) as total_transactions
            FROM transactions
            WHERE tenant_id = $1 AND date >= date_trunc('month', CURRENT_DATE)
        `;

        const result = await query(sql, [tenantId]);
        const data = result.rows[0];
        
        const balance = parseFloat(data.total_income) - parseFloat(data.total_expense);

        return res.json({
            period: 'current_month',
            income: parseFloat(data.total_income),
            expense: parseFloat(data.total_expense),
            balance: balance,
            pending_income: parseFloat(data.pending_income),
            pending_expense: parseFloat(data.pending_expense),
            transaction_count: parseInt(data.total_transactions)
        });

    } catch (error) {
        console.error('Erro no dashboard:', error);
        return res.status(500).json({ message: 'Erro ao gerar dashboard.' });
    }
};

// ==========================================
// 7. TRANSAÇÕES RECENTES (Mantido)
// ==========================================
const getRecentTransactions = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        const sql = `
            SELECT t.id, t.description, t.amount, t.type, t.status, t.date, c.name as category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.tenant_id = $1
            ORDER BY t.date DESC, t.created_at DESC
            LIMIT 5
        `;

        const result = await query(sql, [tenantId]);
        return res.json(result.rows);

    } catch (error) {
        console.error('Erro recent transactions:', error);
        return res.status(500).json({ message: 'Erro ao buscar recentes.' });
    }
};

// ==========================================
// 8. ESTATÍSTICAS POR CATEGORIA (Mantido)
// ==========================================
const getCategoryStats = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        const sql = `
            SELECT c.name, SUM(t.amount) as value
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.id
            WHERE t.tenant_id = $1 AND t.type = 'expense' AND t.status = 'completed'
            AND t.date >= date_trunc('month', CURRENT_DATE)
            GROUP BY c.name
            ORDER BY value DESC
            LIMIT 6
        `;

        const result = await query(sql, [tenantId]);
        
        const formatted = result.rows.map(row => ({
            name: row.name || 'Geral',
            value: parseFloat(row.value)
        }));

        return res.json(formatted);

    } catch (error) {
        console.error('Erro category stats:', error);
        return res.status(500).json({ message: 'Erro ao buscar categorias.' });
    }
};

// ==========================================
// 9. RELATÓRIO IA (Mantido)
// ==========================================
const getAiReport = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        const result = await query(
            `SELECT date, description, amount, type 
             FROM transactions 
             WHERE tenant_id = $1 
             ORDER BY date DESC LIMIT 50`,
            [tenantId]
        );

        if (result.rows.length === 0) {
            return res.json({ summary: "Sem dados suficientes para análise." });
        }

        const insight = await geminiService.generateFinancialInsight(result.rows, "Últimas 50 transações");
        return res.json(insight);

    } catch (error) {
        console.error('Erro no relatório IA:', error);
        return res.status(500).json({ message: 'Erro ao gerar relatório inteligente.' });
    }
};

// ==========================================
// 10. DADOS PARA O GRÁFICO (Mantido)
// ==========================================
const getChartData = async (req, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        const sql = `
            SELECT 
                TO_CHAR(date, 'DD/MM') as name,
                SUM(amount) FILTER (WHERE type = 'income' AND status = 'completed') as income,
                SUM(amount) FILTER (WHERE type = 'expense' AND status = 'completed') as expense
            FROM transactions
            WHERE tenant_id = $1 
              AND date >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY TO_CHAR(date, 'DD/MM'), date
            ORDER BY date ASC
        `;

        const result = await query(sql, [tenantId]);
        
        const formatted = result.rows.map(row => ({
            name: row.name,
            income: parseFloat(row.income || 0),
            expense: parseFloat(row.expense || 0)
        }));

        return res.json(formatted);

    } catch (error) {
        console.error('Erro no gráfico:', error);
        return res.status(500).json({ message: 'Erro ao gerar dados do gráfico.' });
    }
};

module.exports = {
    listTransactions,
    getSummary, // NOVO (Para o Transactions.jsx)
    createTransaction,
    updateTransactionStatus,
    updateStatus: updateTransactionStatus, // Alias
    deleteTransaction,
    getDashboardSummary,
    getRecentTransactions,
    getCategoryStats,
    getAiReport,
    getChartData
};