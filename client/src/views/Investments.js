import { api } from '../services/api.js';
import { auth } from '../utils/auth.js';
import { masks } from '../utils/masks.js';
import { Modal } from '../components/Modal.js';

export default class Investments {
    constructor() {
        this.data = {
            items: [],
            summary: { totalInvested: 0, totalCurrent: 0, totalProfit: 0 }
        };
    }

    async fetchData() {
        try {
            const response = await api.get('/investments');
            this.data = response;
        } catch (error) {
            console.error('Erro ao carregar investimentos', error);
        }
    }

    getHtml() {
        const user = auth.getUser();
        const { items, summary } = this.data;

        const rows = items.length 
            ? items.map(item => {
                const isProfit = item.profit >= 0;
                const profitClass = isProfit ? 'text-green' : 'text-red';
                const profitSign = isProfit ? '+' : '';
                
                return `
                <tr>
                    <td>
                        <div style="font-weight: 600;">${item.name}</div>
                        <span class="badge" style="background-color: #6b7280; font-size: 0.7em;">${item.type}</span>
                    </td>
                    <td>${item.interest_rate || '-'}</td>
                    <td>${new Date(item.start_date).toLocaleDateString()}</td>
                    <td>${masks.formatCurrency(item.invested_amount)}</td>
                    <td style="font-weight: bold;">${masks.formatCurrency(item.current_amount)}</td>
                    <td class="${profitClass}">
                        ${profitSign}${masks.formatCurrency(item.profit)} 
                        <small>(${Number(item.profitability_percentage).toFixed(2)}%)</small>
                    </td>
                    <td>
                        <div class="btn-action-group">
                            <button class="btn-action btn-update" data-id="${item.id}" data-current="${item.current_amount}" title="Atualizar Valor">🔄</button>
                            <button class="btn-action btn-delete" data-id="${item.id}" title="Excluir">🗑️</button>
                        </div>
                    </td>
                </tr>
            `}).join('')
            : '<tr><td colspan="7" style="text-align:center; padding: 1rem; color: #6b7280;">Nenhum investimento cadastrado.</td></tr>';

        const profitClassSummary = summary.totalProfit >= 0 ? 'income' : 'expense';

        return `
            <header class="app-header">
                <div class="header-brand">
                    <h1>Finance PWA</h1>
                    <span>Carteira de Ativos</span>
                </div>
                <div class="header-nav">
                    <a href="/" data-link class="nav-link">Dashboard</a>
                    <a href="/investments" data-link class="nav-link active">Investimentos</a>
                    <a href="/settings" data-link class="nav-link">Configurações</a>
                </div>
                <div class="header-actions">
                    <button id="logoutBtn" class="btn-logout">Sair ⇥</button>
                </div>
            </header>

            <div class="dashboard-container">
                <div class="dashboard-grid cards-grid">
                    <div class="summary-card">
                        <h3>Total Aportado</h3>
                        <div class="amount">${masks.formatCurrency(summary.totalInvested)}</div>
                    </div>
                    <div class="summary-card">
                        <h3>Valor Bruto Atual</h3>
                        <div class="amount" style="color: var(--primary-color);">${masks.formatCurrency(summary.totalCurrent)}</div>
                    </div>
                    <div class="summary-card ${profitClassSummary}">
                        <h3>Rentabilidade Líquida</h3>
                        <div class="amount">${summary.totalProfit >= 0 ? '+' : ''}${masks.formatCurrency(summary.totalProfit)}</div>
                    </div>
                </div>

                <div class="grid-content">
                    
                    <div class="content-section">
                        <div class="section-header">
                            <h3>Meus Ativos</h3>
                            <small style="color: #6b7280; font-weight: normal;">* Atualize o valor atual manualmente.</small>
                        </div>
                        <div class="table-container">
                            <table class="transaction-table">
                                <thead>
                                    <tr>
                                        <th>Ativo</th>
                                        <th>Taxa</th>
                                        <th>Data</th>
                                        <th>Investido</th>
                                        <th>Atual</th>
                                        <th>Rentabilidade</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rows}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="content-section">
                        <div class="section-header">
                            <h3>Novo Aporte</h3>
                        </div>
                        <form id="investmentForm">
                            <div class="form-group">
                                <label>Nome do Ativo</label>
                                <input type="text" name="name" required placeholder="Ex: CDB Banco X" class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label>Tipo</label>
                                <select name="type" required class="form-control">
                                    <option value="" disabled selected>Selecione...</option>
                                    <option value="CDB">CDB</option>
                                    <option value="POUPANCA">Poupança</option>
                                    <option value="LCI">LCI/LCA</option>
                                    <option value="ACOES">Ações</option>
                                    <option value="FII">FIIs</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Valor Investido</label>
                                <input type="text" name="investedAmount" id="investInput" required placeholder="R$ 0,00" autocomplete="off" class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label>Taxa / Indexador (Opcional)</label>
                                <input type="text" name="interestRate" placeholder="Ex: 100% CDI" class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label>Data Aplicação</label>
                                <input type="date" name="startDate" required value="${new Date().toISOString().split('T')[0]}" class="form-control">
                            </div>
                            
                            <div class="form-group">
                                <label>Vencimento (Opcional)</label>
                                <input type="date" name="dueDate" class="form-control">
                            </div>
                            
                            <button type="submit" class="btn btn-primary">Registrar Ativo</button>
                        </form>
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

        const investInput = document.getElementById('investInput');
        if (investInput) {
            investInput.addEventListener('input', (e) => {
                e.target.value = masks.currencyInput(e.target.value);
            });
        }

        const form = document.getElementById('investmentForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const rawAmount = masks.cleanCurrency(formData.get('investedAmount'));

            const payload = {
                name: formData.get('name'),
                type: formData.get('type'),
                investedAmount: rawAmount,
                interestRate: formData.get('interestRate'),
                startDate: formData.get('startDate'),
                dueDate: formData.get('dueDate') || null
            };

            try {
                await api.post('/investments', payload);
                await Modal.alert('Sucesso', 'Investimento registrado com sucesso!');
                await this.execute();
            } catch (error) {
                Modal.alert('Erro', error.message);
            }
        });

        document.querySelector('.transaction-table tbody').addEventListener('click', async (e) => {
            if (e.target.closest('.btn-delete')) {
                const btn = e.target.closest('.btn-delete');
                const id = btn.dataset.id;
                
                const confirmed = await Modal.confirm(
                    'Excluir Ativo', 
                    'Tem certeza que deseja excluir este investimento? Essa ação não pode ser desfeita.',
                    'Excluir',
                    true
                );

                if (confirmed) {
                    try {
                        await api.delete(`/investments/${id}`);
                        await this.execute();
                    } catch (error) {
                        Modal.alert('Erro', error.message);
                    }
                }
            }
            
            if (e.target.closest('.btn-update')) {
                const btn = e.target.closest('.btn-update');
                const id = btn.dataset.id;
                const currentVal = btn.dataset.current;
                
                const input = await Modal.prompt(
                    'Atualizar Valor', 
                    'Digite o novo VALOR BRUTO ATUAL do investimento:', 
                    masks.formatCurrency(currentVal),
                    'currency'
                );
                
                if (input !== null) {
                    const cleanValue = masks.cleanCurrency(input);
                    if (isNaN(cleanValue) || cleanValue < 0) {
                        Modal.alert('Inválido', "O valor informado não é válido.");
                        return;
                    }

                    try {
                        await api.patch(`/investments/${id}/value`, { currentAmount: cleanValue });
                        await this.execute();
                    } catch (error) {
                        Modal.alert('Erro', error.message);
                    }
                }
            }
        });
    }
}