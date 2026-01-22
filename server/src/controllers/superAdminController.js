// server/src/controllers/superAdminController.js
const companyRepository = require('../repositories/companyRepository');

class SuperAdminController {
    
    // GET /api/admin/companies
    async listCompanies(req, res) {
        try {
            // O middleware já garantiu que req.user.role === 'SUPER_ADMIN'
            const companies = await companyRepository.findAllWithStats();
            res.json(companies);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao listar empresas.' });
        }
    }

    // PATCH /api/admin/companies/:id/plan
    async updateCompanyPlan(req, res) {
        try {
            const { id } = req.params;
            const { plan } = req.body; // 'FREE', 'PRO', 'ENTERPRISE'

            if (!['FREE', 'PRO', 'ENTERPRISE'].includes(plan)) {
                return res.status(400).json({ error: 'Plano inválido.' });
            }

            const updated = await companyRepository.updatePlan(id, plan);
            
            if (!updated) return res.status(404).json({ error: 'Empresa não encontrada.' });
            
            res.json({ message: 'Plano atualizado com sucesso.', company: updated });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar plano.' });
        }
    }

    // PATCH /api/admin/companies/:id/status
    async toggleCompanyStatus(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body; // true ou false

            if (typeof isActive !== 'boolean') {
                return res.status(400).json({ error: 'Status inválido. Use true ou false.' });
            }

            const updated = await companyRepository.toggleActive(id, isActive);
            
            if (!updated) return res.status(404).json({ error: 'Empresa não encontrada.' });

            res.json({ 
                message: `Empresa ${isActive ? 'ativada' : 'bloqueada'} com sucesso.`, 
                company: updated 
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao alterar status.' });
        }
    }
}

module.exports = new SuperAdminController();