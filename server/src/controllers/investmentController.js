const investmentRepository = require('../repositories/investmentRepository');

class InvestmentController {
    async list(req, res) {
        try {
            const userId = req.user.id;
            const [items, summary] = await Promise.all([
                investmentRepository.findAllByUserId(userId),
                investmentRepository.getSummary(userId)
            ]);

            res.json({
                items,
                summary: {
                    totalInvested: Number(summary.total_invested),
                    totalCurrent: Number(summary.total_current),
                    totalProfit: Number(summary.total_current) - Number(summary.total_invested)
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao listar investimentos' });
        }
    }

    async create(req, res) {
        try {
            const userId = req.user.id;
            const { name, type, investedAmount, interestRate, startDate, dueDate } = req.body;

            if (!name || !investedAmount || !type || !startDate) {
                return res.status(400).json({ error: 'Campos obrigatórios: Nome, Tipo, Valor e Data.' });
            }

            const investment = await investmentRepository.create({
                userId,
                name,
                type,
                investedAmount,
                currentAmount: investedAmount, // Inicialmente vale o que pagou
                interestRate,
                startDate,
                dueDate: dueDate || null
            });

            res.status(201).json(investment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao criar investimento' });
        }
    }

    async updateValue(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;
            const { currentAmount } = req.body;

            if (!currentAmount) {
                return res.status(400).json({ error: 'Novo valor é obrigatório.' });
            }

            const updated = await investmentRepository.updateValue(id, userId, currentAmount);

            if (!updated) {
                return res.status(404).json({ error: 'Investimento não encontrado.' });
            }

            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar valor.' });
        }
    }

    async delete(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const deleted = await investmentRepository.delete(id, userId);
            
            if (!deleted) {
                return res.status(404).json({ error: 'Investimento não encontrado' });
            }

            res.json({ message: 'Investimento removido' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao deletar' });
        }
    }
}

module.exports = new InvestmentController();