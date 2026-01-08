import { api } from '../services/api.js';
import { auth } from '../utils/auth.js';
import { masks } from '../utils/masks.js';
import { ChartManager } from '../components/ChartManager.js';
import { Modal } from '../components/Modal.js';

export default class Dashboard {
    constructor() {
        this.data = {
            summary: { income: 0, expense: 0, balance: 0, totalInvested: 0 },
            recentTransactions: [],
            categories: []
        };
        this.chartsData = null;
        this.aiAdvice = null;
        this.isLoadingAI = false;
        this.chartManager = new ChartManager();
    }

    async fetchDashboardData() {
        try {
            const [dashboardData, chartsData] = await Promise.all([
                api.get('/transactions/dashboard'),
                api.get('/transactions/charts')
            ]);
            
            this.data = dashboardData;
            this.chartsData = chartsData;
        } catch (error) {
            console.error('Erro ao carregar dashboard', error);
        }
    }

    async generateAIAdvice() {
        this.isLoadingAI = true;
        this.renderAIContent();

        try {
            const response = await api.post('/advisor/insight', {});
            this.aiAdvice = response.advice;
        } catch (error) {
            this.aiAdvice = 'Não foi possível conectar ao consultor virtual.';
        } finally {
            this.isLoadingAI = false;
            this.renderAIContent();
        }
    }

    renderAIContent() {
        const container = document.getElementById('ai-content-area');
        const btn = document.getElementById('btn-ai-generate');
        
        if (!container || !btn) return;

        if (this.isLoadingAI) {
            container.innerHTML = '<p>Analisando suas finanças<span class="typing-indicator"></span></p>';
            btn.disabled = true;
            btn.textContent = 'Analisando...';
        } else if (this.aiAdvice) {
            container.innerHTML = this.aiAdvice;
            btn.disabled = false;
            btn.textContent = 'Atualizar Análise';
        } else {
            container.innerHTML = '<p>Clique no botão para receber insights personalizados sobre suas finanças baseados na sua meta.</p>';
            btn.disabled = false;
            btn.textContent = 'Gerar Análise IA';
        }
    }

    getHtml() {
        const user = auth.getUser();
        const { summary, recentTransactions, categories } = this.data;
        
        const transactionsHtml = recentTransactions.length 
            ? recentTransactions.map(t => `
                <tr>
                    <td>
                        <span class="badge" style="background-color: ${t.category_color}">${t.category_name || 'Outros'}</span>
                    </td>
                    <td>${t.description}</td>
                    <td>${new Date(t.transaction_date).toLocaleDateString()}</td>
                    <td class="amount-cell ${t.type}">
                        ${t.type === 'expense' ? '-' : '+'} ${masks.formatCurrency(t.amount)}
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="4" style="text-align:center; padding: 1rem; color: #6b7280;">Nenhuma transação recente.</td></tr>';

        const categoryOptions = categories.map(c => 
            `<option value="${c.id}">${c.name} (${c.type === 'income' ? 'Receita' : 'Despesa'})</option>`
        ).join('');

        return `
            <header class="app-header">
                <div class="header-brand">
                    <h1>Finance PWA</h1>
                    <span>Gestão Inteligente</span>
                </div>
                <div class="header-nav">
                    <a href="/" data-link class="nav-link active">Dashboard</a>
                    <a href="/investments" data-link class="nav-link">Investimentos</a>
                    <a href="/settings" data-link class="nav-link">Configurações</a>
                </div>
                <div class="header-actions">
                    <span class="user-greeting">Olá, ${user ? user.name.split(' ')[0] : 'Visitante'}</span>
                    <button id="logoutBtn" class="btn-logout" title="Sair do Sistema">
                        Sair ⇥
                    </button>
                </div>
            </header>

            <div class="dashboard-container">
                
                <div class="ai-advisor-card">
                    <div class="ai-header">
                        <h3>🤖 Consultor Gemini</h3>
                        <button id="btn-ai-generate" class="btn-ai">Gerar Análise IA</button>
                    </div>
                    <div id="ai-content-area" class="ai-content">
                        <p>Obtenha insights inteligentes sobre seus gastos e progresso da meta.</p>
                    </div>
                </div>

                <div class="dashboard-grid cards-grid">
                    <div class="summary-card income">
                        <h3>Receitas</h3>
                        <div class="amount">${masks.formatCurrency(summary.income)}</div>
                    </div>
                    <div class="summary-card expense">
                        <h3>Despesas</h3>
                        <div class="amount">${masks.formatCurrency(summary.expense)}</div>
                    </div>
                    <div class="summary-card balance">
                        <h3>Saldo Atual</h3>
                        <div class="amount">${masks.formatCurrency(summary.balance)}</div>
                    </div>
                    <div class="summary-card invest">
                        <h3>Total Investido</h3>
                        <div class="amount">${masks.formatCurrency(summary.totalInvested || 0)}</div>
                    </div>
                </div>

                <div class="grid-charts">
                    <div class="content-section">
                        <h3>Evolução (6 meses)</h3>
                        <div style="height: 250px; position: relative;">
                            <canvas id="evolutionChart"></canvas>
                        </div>
                    </div>
                    <div class="content-section">
                        <h3>Por Categoria</h3>
                        <div style="height: 250px; position: relative; display: flex; justify-content: center;">
                            <canvas id="expenseChart"></canvas>
                        </div>
                    </div>
                </div>

                <div class="grid-content">
                    
                    <div class="content-section">
                        <div class="section-header">
                            <h3>Últimas Transações</h3>
                        </div>
                        <div class="table-container">
                            <table class="transaction-table">
                                <thead>
                                    <tr>
                                        <th>Categoria</th>
                                        <th>Descrição</th>
                                        <th>Data</th>
                                        <th>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${transactionsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="content-section">
                        <div class="section-header">
                            <h3>Nova Transação</h3>
                        </div>
                        <form id="transactionForm">
                            <div class="form-group">
                                <label>Descrição</label>
                                <input type="text" name="description" required placeholder="Ex: Mercado" class="form-control">
                            </div>
                            <div class="form-group">
                                <label>Valor</label>
                                <input type="text" name="amount" id="amountInput" required placeholder="R$ 0,00" autocomplete="off" class="form-control">
                            </div>
                            <div class="form-group">
                                <label>Categoria</label>
                                <select name="categoryId" required class="form-control">
                                    <option value="" disabled selected>Selecione...</option>
                                    ${categoryOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Data</label>
                                <input type="date" name="transactionDate" required value="${new Date().toISOString().split('T')[0]}" class="form-control">
                            </div>
                            <button type="submit" class="btn btn-primary">Adicionar</button>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    async execute() {
        if (this.data.categories.length === 0) {
            await this.fetchDashboardData();
            document.getElementById('app').innerHTML = this.getHtml();
            this.attachEvents();
            this.renderCharts();
        } else {
            this.attachEvents();
            this.renderCharts();
        }

        if (this.aiAdvice) {
            this.renderAIContent();
        }
    }

    renderCharts() {
        if (!this.chartsData) return;
        const ctxExpense = document.getElementById('expenseChart');
        const ctxEvolution = document.getElementById('evolutionChart');
        if (ctxExpense) this.chartManager.renderExpenseChart(ctxExpense, this.chartsData.expensesByCategory);
        if (ctxEvolution) this.chartManager.renderEvolutionChart(ctxEvolution, this.chartsData.monthlyEvolution);
    }

    attachEvents() {
        document.getElementById('logoutBtn').addEventListener('click', () => {
            auth.clearSession();
            window.dispatchEvent(new CustomEvent('navigate', { detail: '/login' }));
        });

        const aiBtn = document.getElementById('btn-ai-generate');
        if (aiBtn) {
            aiBtn.addEventListener('click', () => this.generateAIAdvice());
        }

        const amountInput = document.getElementById('amountInput');
        if (amountInput) {
            amountInput.addEventListener('input', (e) => {
                e.target.value = masks.currencyInput(e.target.value);
            });
        }

        const form = document.getElementById('transactionForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const rawAmount = masks.cleanCurrency(formData.get('amount'));
            
            const payload = {
                description: formData.get('description'),
                amount: rawAmount,
                categoryId: formData.get('categoryId'),
                transactionDate: formData.get('transactionDate')
            };

            try {
                await api.post('/transactions', payload);
                await this.fetchDashboardData();
                document.getElementById('app').innerHTML = this.getHtml();
                this.attachEvents();
                this.renderCharts();
            } catch (error) {
                Modal.alert('Erro', 'Erro ao salvar: ' + error.message);
            }
        });
    }
}