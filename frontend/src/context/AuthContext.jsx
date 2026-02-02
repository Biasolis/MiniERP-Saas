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
          // Validação básica de expiração do token (JWT)
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
          
          // --- CORREÇÃO DE SEGURANÇA: DEFINIR HEADER IMEDIATAMENTE ---
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

          // Normalização Forçada na Inicialização (F5/Reload)
          // Garante que isSuperAdmin exista mesmo se vier como is_super_admin do cache antigo
          const isSuperAdmin = parsedUser.isSuperAdmin === true || parsedUser.is_super_admin === true;

          const normalizedUser = {
              ...parsedUser,
              isSuperAdmin: isSuperAdmin
          };

          // console.log("AuthContext: Usuário carregado e normalizado:", normalizedUser);
          
          setUser(normalizedUser);
          
          // Aplica o tema se existir
          if (normalizedUser.tenant_color) {
             applyTheme(normalizedUser.tenant_color);
          }

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
        tenant_color: userData.primary_color || '#2563eb', // Fallback blue
        isSuperAdmin: isSuperAdmin // Salva já normalizado como camelCase
      };

      localStorage.setItem('saas_token', token);
      localStorage.setItem('saas_user', JSON.stringify(userWithTheme));

      // Define header para requisições futuras
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
    
    // Evita loop de redirecionamento se já estiver no login
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