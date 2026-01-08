import { api } from '../services/api.js';
import { auth } from '../utils/auth.js';
import { masks } from '../utils/masks.js';
import { Modal } from '../components/Modal.js';

export default class Settings {
    constructor() {
        this.categories = [];
        this.user = auth.getUser();
    }

    async fetchData() {
        try {
            // Reutiliza endpoint do dashboard para pegar categorias atuais
            const response = await api.get('/transactions/dashboard'); 
            this.categories = response.categories;
        } catch (error) {
            console.error('Erro ao carregar configurações', error);
        }
    }

    getHtml() {
        const user = this.user;
        
        const categoryList = this.categories.map(c => `
            <div class="category-item">
                <div class="cat-info">
                    <span class="cat-color" style="background-color: ${c.color}"></span>
                    <span>${c.name}</span>
                    <small style="margin-left: 8px; color: #6b7280;">(${c.type === 'income' ? 'Receita' : 'Despesa'})</small>
                </div>
                <button class="btn-delete-cat" data-id="${c.id}" title="Excluir">✕</button>
            </div>
        `).join('');

        return `
            <header class="app-header">
                <div class="header-brand">
                    <h1>Finance PWA</h1>
                    <span>Configurações</span>
                </div>
                <div class="header-nav">
                    <a href="/" data-link class="nav-link">Dashboard</a>
                    <a href="/investments" data-link class="nav-link">Investimentos</a>
                    <a href="/settings" data-link class="nav-link active">Configurações</a>
                </div>
                <div class="header-actions">
                    <button id="logoutBtn" class="btn-logout">Sair ⇥</button>
                </div>
            </header>

            <div class="dashboard-container">
                <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
                    
                    <div class="content-section">
                        <div class="section-header">
                            <h3>Meu Perfil</h3>
                        </div>
                        <form id="profileForm">
                            <div class="form-group">
                                <label>Nome Completo</label>
                                <input type="text" name="name" value="${user.name}" required class="form-control">
                            </div>
                            <div class="form-group">
                                <label>Meta Financeira (Acumular)</label>
                                <input type="text" name="financialGoal" id="goalInput" value="${masks.formatCurrency(user.financial_goal || 0)}" required class="form-control">
                                <small style="color: var(--text-secondary); margin-top: 0.5rem; display: block;">Esta meta é usada pela IA para dar conselhos.</small>
                            </div>
                            <button type="submit" class="btn btn-primary" style="margin-top: 1rem;">Salvar Perfil</button>
                        </form>
                    </div>

                    <div class="content-section">
                        <div class="section-header">
                            <h3>Gerenciar Categorias</h3>
                        </div>
                        
                        <form id="categoryForm" style="margin-bottom: 1.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid #f3f4f6;">
                            
                            <div class="form-row">
                                <div class="form-group" style="flex: 2;">
                                    <label>Nome da Categoria</label>
                                    <input type="text" name="name" placeholder="Ex: Assinaturas" required class="form-control">
                                </div>
                                
                                <div class="form-group" style="flex: 1;">
                                    <label>Tipo</label>
                                    <select name="type" class="form-control">
                                        <option value="expense">Despesa</option>
                                        <option value="income">Receita</option>
                                    </select>
                                </div>
                                
                                <div class="form-group" style="flex: 0 0 80px;">
                                    <label>Cor</label>
                                    <div class="color-input-wrapper">
                                        <input type="color" name="color" value="#2563eb" title="Escolher cor">
                                    </div>
                                </div>

                                <button type="submit" class="btn btn-primary btn-inline" style="flex: 0 0 auto; width: auto; height: 48px; margin-bottom: 0;">
                                    Adicionar
                                </button>
                            </div>

                        </form>

                        <div class="category-list-container" style="max-height: 350px; overflow-y: auto;">
                            ${categoryList.length ? categoryList : '<p style="text-align:center; padding: 1rem; color: #9ca3af;">Nenhuma categoria personalizada.</p>'}
                        </div>
                    </div>

                </div>
            </div>
        `;
    }

    async execute() {
        await this.fetchData();
        document.getElementById('app').innerHTML = this.getHtml();
        this.attachEvents();
    }

    attachEvents() {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            auth.clearSession();
            window.dispatchEvent(new CustomEvent('navigate', { detail: '/login' }));
        });

        // Máscara Meta
        const goalInput = document.getElementById('goalInput');
        if (goalInput) {
            goalInput.addEventListener('input', (e) => {
                e.target.value = masks.currencyInput(e.target.value);
            });
        }

        // Atualizar Perfil
        const profileForm = document.getElementById('profileForm');
        profileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(profileForm);
            const rawGoal = masks.cleanCurrency(formData.get('financialGoal'));

            try {
                const response = await api.put('/settings/profile', {
                    name: formData.get('name'),
                    financialGoal: rawGoal
                });
                
                // Atualiza sessão local
                const updatedUser = { ...this.user, name: response.name, financial_goal: response.financial_goal };
                auth.setSession(auth.getToken(), updatedUser);
                this.user = updatedUser;

                await Modal.alert('Sucesso', 'Perfil atualizado com sucesso!');
            } catch (error) {
                await Modal.alert('Erro', error.message);
            }
        });

        // Criar Categoria
        const catForm = document.getElementById('categoryForm');
        catForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(catForm);

            try {
                await api.post('/settings/categories', {
                    name: formData.get('name'),
                    type: formData.get('type'),
                    color: formData.get('color')
                });
                await this.execute(); // Recarrega
            } catch (error) {
                await Modal.alert('Erro', error.message);
            }
        });

        // Deletar Categoria
        const listContainer = document.querySelector('.category-list-container');
        if (listContainer) {
            listContainer.addEventListener('click', async (e) => {
                if (e.target.classList.contains('btn-delete-cat')) {
                    const id = e.target.dataset.id;
                    const confirmed = await Modal.confirm('Excluir Categoria', 'Transações antigas desta categoria não serão apagadas, mas ficarão sem categoria. Continuar?', 'Excluir', true);
                    
                    if (confirmed) {
                        try {
                            await api.delete(`/settings/categories/${id}`);
                            await this.execute();
                        } catch (error) {
                            await Modal.alert('Erro', error.message);
                        }
                    }
                }
            });
        }
    }
}