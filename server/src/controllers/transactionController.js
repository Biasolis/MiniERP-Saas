const transactionRepository = require('../repositories/transactionRepository');
const categoryRepository = require('../repositories/categoryRepository');
const investmentRepository = require('../repositories/investmentRepository'); // <--- IMPORT NOVO

class TransactionController {
    async getDashboard(req, res) {
        try {
            const userId = req.user.id;
            
            // Agora buscamos também o resumo de investimentos em paralelo
            const [summary, recentTransactions, categories, investmentSummary] = await Promise.all([
                transactionRepository.getDashboardSummary(userId),
                transactionRepository.findAllByUserId(userId),
                categoryRepository.findAllByUserId(userId),
                investmentRepository.getSummary(userId) // <--- BUSCA NOVA
            ]);

            // Prepara o objeto de resposta unificado
            res.json({
                summary: {
                    ...summary,
                    totalInvested: Number(investmentSummary.total_current) || 0 // Adiciona o total atual dos ativos
                },
                recentTransactions,
                categories
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao carregar dashboard' });
        }
    }

    async create(req, res) {
        try {
            const userId = req.user.id;
            const { categoryId, amount, description, transactionDate } = req.body;

            if (!categoryId || !amount || !transactionDate) {
                return res.status(400).json({ error: 'Dados incompletos.' });
            }

            const transaction = await transactionRepository.create({
                userId,
                categoryId,
                amount,
                description,
                transactionDate
            });

            res.status(201).json(transaction);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao criar transação' });
        }
    }

    async getCharts(req, res) {
        try {
            const userId = req.user.id;
            
            const [expensesByCategory, monthlyEvolution] = await Promise.all([
                transactionRepository.getExpensesByCategory(userId),
                transactionRepository.getMonthlyEvolution(userId)
            ]);

            res.json({
                expensesByCategory,
                monthlyEvolution
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao carregar gráficos' });
        }
    }
}

module.exports = new TransactionController();