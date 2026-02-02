import { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const recoverUser = async () => {
      const storedUser = localStorage.getItem('saas_user');
      const storedToken = localStorage.getItem('saas_token');

      if (storedUser && storedToken) {
        try {
          // Validação básica de expiração
          const payloadBase64 = storedToken.split('.')[1];
          if (payloadBase64) {
            const payload = JSON.parse(atob(payloadBase64));
            const exp = payload.exp * 1000;

            if (Date.now() >= exp) {
              console.warn("AuthContext: Token expirado na inicialização.");
              signOut();
              setLoading(false);
              return;
            }
          }

          const parsedUser = JSON.parse(storedUser);
          
          // Normalização Forçada na Inicialização
          const isSuperAdmin = parsedUser.isSuperAdmin === true || parsedUser.is_super_admin === true;

          const normalizedUser = {
              ...parsedUser,
              isSuperAdmin: isSuperAdmin
          };

          // --- CORREÇÃO CRUCIAL AQUI ---
          // Define o token no Header do Axios IMEDIATAMENTE ao carregar
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          setUser(normalizedUser);
          applyTheme(normalizedUser.tenant_color);

        } catch (e) {
            console.error("AuthContext: Erro ao parsear token/user", e);
            signOut();
        }
      }
      
      setLoading(false);
    };

    recoverUser();
  }, []);

  const applyTheme = (color) => {
    if (color) {
      document.documentElement.style.setProperty('--primary-color', color);
      document.documentElement.style.setProperty('--primary-hover', color); 
    }
  };

  const signIn = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      const { token, user: userData } = response.data;

      // Normalização Forçada no Login
      const isSuperAdmin = userData.isSuperAdmin === true || userData.is_super_admin === true;

      const userWithTheme = { 
        ...userData, 
        tenant_color: userData.primary_color || '#2563eb',
        isSuperAdmin: isSuperAdmin 
      };

      localStorage.setItem('saas_token', token);
      localStorage.setItem('saas_user', JSON.stringify(userWithTheme));

      // Define header para a sessão atual
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userWithTheme);
      applyTheme(userWithTheme.tenant_color);

      return { success: true };
    } catch (error) {
      console.error("Erro no login:", error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Erro ao fazer login' 
      };
    }
  };

  const signOut = () => {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_user');
    setUser(null);
    api.defaults.headers.common['Authorization'] = undefined;
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--primary-hover');
    
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider value={{ user, signed: !!user, signIn, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};