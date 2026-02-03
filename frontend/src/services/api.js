import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Interceptor de Resposta
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Se der erro de Autenticação (401)
    if (error.response && error.response.status === 401) {
      
      // Verifica onde o usuário está navegando
      const currentPath = window.location.pathname;

      // Se estiver no Portal do Colaborador
      if (currentPath.startsWith('/portal')) {
         localStorage.removeItem('employee_token');
         localStorage.removeItem('employee_user');
         // Evita loop se já estiver no login
         if (currentPath !== '/portal/login') {
             window.location.href = '/portal/login';
         }
      } 
      // Se estiver no Painel Admin ou Helpdesk
      else if (currentPath.startsWith('/helpdesk')) {
         localStorage.removeItem('helpdesk_token');
         // Redireciona para a raiz do helpdesk atual (ex: /helpdesk/minha-empresa)
         // Como não sabemos o slug aqui facilmente, recarregamos a página ou mandamos para login
      }
      else {
         // Fluxo Admin Normal
         localStorage.removeItem('saas_token');
         localStorage.removeItem('saas_user');
         if (currentPath !== '/login') {
             window.location.href = '/login';
         }
      }
    }
    return Promise.reject(error);
  }
);

export default api;