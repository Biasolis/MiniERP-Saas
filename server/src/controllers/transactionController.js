// server/src/controllers/transactionController.js
const transactionRepository = require('../repositories/transactionRepository');

class TransactionController {
    async create(req, res) {
        try {
            // Segurança SaaS: Pega o ID da empresa do Token, não do corpo da requisição
            const { companyId, id: userId } = req.user;
            
            const { 
                accountId, categoryId, contactId, 
                amount, description, date, type 
            } = req.body;

            // Validação básica de B2B
            if (!accountId) {
                return res.status(400).json({ error: 'Selecione uma conta bancária/caixa para movimentar.' });
            }

            // Tratamento de valor (Entrada vs Saída)
            // Se o frontend mandar type='expense', forçamos o valor negativo
            let finalAmount = parseFloat(amount);
            if (type === 'expense' && finalAmount > 0) finalAmount *= -1;
            if (type === 'income' && finalAmount < 0) finalAmount *= -1;

            const transaction = await transactionRepository.create({
                companyId,
                userId,
                accountId,
                categoryId,
                contactId,
                amount: finalAmount,
                description,
                date
            });

            res.status(201).json(transaction);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao criar transação.' });
        }
    }

    async index(req, res) {
        try {
            const { companyId } = req.user;
            const { startDate, endDate, accountId } = req.query;

            const transactions = await transactionRepository.findAll({
                companyId,
                startDate,
                endDate,
                accountId
            });

            res.json(transactions);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar transações.' });
        }
    }

    async getDashboard(req, res) {
        try {
            const { companyId } = req.user;
            const { startDate, endDate } = req.query;

            // Buscando dados paralelos para performance
            const [accounts, cashFlow] = await Promise.all([
                transactionRepository.getBalancesByAccount(companyId),
                transactionRepository.getCashFlow(companyId, startDate, endDate)
            ]);

            res.json({
                accounts,
                cashFlow: {
                    income: cashFlow.total_income || 0,
                    expense: cashFlow.total_expense || 0,
                    balance: (parseFloat(cashFlow.total_income || 0) + parseFloat(cashFlow.total_expense || 0))
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao carregar dashboard.' });
        }
    }
}

module.exports = new TransactionController();