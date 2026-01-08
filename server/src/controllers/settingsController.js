const userRepository = require('../repositories/userRepository');
const categoryRepository = require('../repositories/categoryRepository');

class SettingsController {
    // Atualizar Perfil
    async updateProfile(req, res) {
        try {
            const userId = req.user.id;
            const { name, financialGoal } = req.body;

            if (!name || financialGoal === undefined) {
                return res.status(400).json({ error: 'Nome e Meta Financeira são obrigatórios.' });
            }

            const updatedUser = await userRepository.update(userId, { name, financialGoal });
            res.json(updatedUser);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar perfil.' });
        }
    }

    // Criar Categoria
    async createCategory(req, res) {
        try {
            const userId = req.user.id;
            const { name, type, color } = req.body;

            if (!name || !type) {
                return res.status(400).json({ error: 'Nome e Tipo são obrigatórios.' });
            }

            const category = await categoryRepository.create({
                userId,
                name,
                type,
                color: color || '#000000'
            });

            res.status(201).json(category);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao criar categoria.' });
        }
    }

    // Deletar Categoria
    async deleteCategory(req, res) {
        try {
            const userId = req.user.id;
            const { id } = req.params;

            const deleted = await categoryRepository.delete(id, userId);
            
            if (!deleted) {
                return res.status(404).json({ error: 'Categoria não encontrada.' });
            }

            res.json({ message: 'Categoria removida.' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao remover categoria.' });
        }
    }
}

module.exports = new SettingsController();