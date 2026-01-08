import { api } from '../services/api.js';
import { auth } from '../utils/auth.js';
import { masks } from '../utils/masks.js';
import { Modal } from '../components/Modal.js';

export default class Register {
    getHtml() {
        return `
            <div class="auth-container">
                <div class="card auth-card">
                    <h2>Nova Conta</h2>
                    <form id="registerForm">
                        <div class="form-group">
                            <label>Nome Completo</label>
                            <input type="text" name="name" class="form-control" required placeholder="Seu Nome">
                        </div>
                        <div class="form-group">
                            <label>E-mail</label>
                            <input type="email" name="email" class="form-control" required placeholder="seu@email.com">
                        </div>
                        <div class="form-group">
                            <label>CPF</label>
                            <input type="text" name="cpf" id="cpfInput" class="form-control" required placeholder="000.000.000-00" maxlength="14">
                        </div>
                        <div class="form-group">
                            <label>Meta Financeira (R$)</label>
                            <input type="text" name="financialGoal" id="goalInput" class="form-control" required placeholder="R$ 0,00">
                        </div>
                        <div class="form-group">
                            <label>Senha</label>
                            <input type="password" name="password" class="form-control" required placeholder="******">
                        </div>
                        <button type="submit" class="btn btn-primary">Criar Conta</button>
                    </form>
                    
                    <div class="auth-footer">
                        Já tem conta? <a href="/login" data-link>Fazer Login</a>
                    </div>
                </div>
            </div>
        `;
    }

    execute() {
        // Máscaras
        const cpfInput = document.getElementById('cpfInput');
        const goalInput = document.getElementById('goalInput');

        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                e.target.value = masks.cpf(e.target.value);
            });
        }

        if (goalInput) {
            goalInput.addEventListener('input', (e) => {
                e.target.value = masks.currencyInput(e.target.value);
            });
        }

        const form = document.getElementById('registerForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            
            const rawGoal = masks.cleanCurrency(formData.get('financialGoal'));
            const rawCpf = formData.get('cpf').replace(/\D/g, '');

            const payload = {
                name: formData.get('name'),
                email: formData.get('email'),
                password: formData.get('password'),
                cpf: rawCpf,
                financialGoal: rawGoal
            };

            try {
                const response = await api.post('/auth/register', payload);
                auth.setSession(response.token, response.user);
                await Modal.alert('Sucesso', 'Conta criada com sucesso!');
                window.dispatchEvent(new CustomEvent('navigate', { detail: '/' }));
            } catch (error) {
                Modal.alert('Erro ao Cadastrar', error.message || 'Falha no registro.');
            }
        });
    }
}