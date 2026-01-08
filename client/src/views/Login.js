import { api } from '../services/api.js';
import { auth } from '../utils/auth.js';
import { Modal } from '../components/Modal.js';

export default class Login {
    getHtml() {
        return `
            <div class="auth-container">
                <div class="card auth-card">
                    <h2>Entrar</h2>
                    <form id="loginForm">
                        <div class="form-group">
                            <label>E-mail</label>
                            <input type="email" name="email" class="form-control" placeholder="seu@email.com" required>
                        </div>
                        <div class="form-group">
                            <label>Senha</label>
                            <input type="password" name="password" class="form-control" placeholder="******" required>
                        </div>
                        <button type="submit" class="btn btn-primary">Acessar Sistema</button>
                    </form>
                    
                    <div class="auth-footer">
                        Não tem conta? <a href="/register" data-link>Cadastre-se</a>
                    </div>
                </div>
            </div>
        `;
    }

    execute() {
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(form);
            const payload = Object.fromEntries(formData);

            try {
                const response = await api.post('/auth/login', payload);
                auth.setSession(response.token, response.user);
                window.dispatchEvent(new CustomEvent('navigate', { detail: '/' }));
            } catch (error) {
                Modal.alert('Erro no Login', error.message || 'Credenciais inválidas.');
            }
        });
    }
}