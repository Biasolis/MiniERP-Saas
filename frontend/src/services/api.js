import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

// Interceptor de Requisição: Seleção de Token por Contexto
api.interceptors.request.use((config) => {
  const path = window.location.pathname;
  let token = null;

  // 1. Contexto Helpdesk (Cliente)
  if (path.startsWith('/helpdesk')) {
      token = localStorage.getItem('clientToken');
  } 
  // 2. Contexto Portal (Colaborador)
  else if (path.startsWith('/portal')) {
      token = localStorage.getItem('employeeToken');
  } 
  // 3. Contexto Admin/ERP
  else {
      token = localStorage.getItem('saas_token');
  }

  // Aplica o token ou LIMPA o header global para não "vazar" permissão
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
    // Se existir um header global configurado, anula ele nesta requisição
    if (api.defaults.headers.common['Authorization']) {
        config.headers.Authorization = undefined; 
    }
  }
  
  return config;
}, (error) => Promise.reject(error));

// Interceptor de Resposta: Redirecionamento por Contexto em caso de 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;

      // Evita loop de redirecionamento
      if (path.endsWith('/login')) return Promise.reject(error);

      if (path.startsWith('/helpdesk')) {
          localStorage.removeItem('clientToken');
          localStorage.removeItem('clientUser');
          window.location.href = '/helpdesk/login';
      } else if (path.startsWith('/portal')) {
          localStorage.removeItem('employeeToken');
          localStorage.removeItem('employeeUser');
          window.location.href = '/portal/login';
      } else {
          localStorage.removeItem('saas_token');
          localStorage.removeItem('saas_user');
          window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;