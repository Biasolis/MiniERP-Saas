import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const path = window.location.pathname;
  let token = null;

  // SEPARAÇÃO DE TOKENS POR ÁREA
  if (path.startsWith('/helpdesk')) {
      token = localStorage.getItem('clientToken');
  } 
  else if (path.startsWith('/portal')) {
      token = localStorage.getItem('employeeToken');
  } 
  else {
      token = localStorage.getItem('saas_token'); // Token do Admin
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // LIMPEZA CRÍTICA: Remove lixo do header se não tiver token
    delete config.headers.Authorization;
    if (api.defaults.headers.common['Authorization']) {
        config.headers.Authorization = undefined; 
    }
  }
  
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (path.endsWith('/login')) return Promise.reject(error);

      // REDIRECIONAMENTO INTELIGENTE
      if (path.startsWith('/helpdesk')) {
          localStorage.removeItem('clientToken');
          window.location.href = '/helpdesk/login';
      } else if (path.startsWith('/portal')) {
          localStorage.removeItem('employeeToken');
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