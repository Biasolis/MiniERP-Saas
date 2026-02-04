import { createContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

export const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    // SE ESTIVER NO HELPDESK OU PORTAL, NÃO FAZ NADA.
    const path = location.pathname;
    if (path.startsWith('/helpdesk') || path.startsWith('/portal')) {
        setLoading(false);
        return; 
    }

    const recoverUser = async () => {
      const storedUser = localStorage.getItem('saas_user');
      const storedToken = localStorage.getItem('saas_token');

      if (storedUser && storedToken) {
        try {
          const payloadBase64 = storedToken.split('.')[1];
          if (payloadBase64) {
            const payload = JSON.parse(atob(payloadBase64));
            if (Date.now() >= payload.exp * 1000) {
              signOut();
              setLoading(false);
              return;
            }
          }

          const parsedUser = JSON.parse(storedUser);
          
          api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

          const isSuperAdmin = parsedUser.isSuperAdmin === true || parsedUser.is_super_admin === true;

          setUser({ ...parsedUser, isSuperAdmin });
          
          if (parsedUser.tenant_color) {
             applyTheme(parsedUser.tenant_color);
          }

        } catch (e) {
            console.error("AuthContext Error", e);
            signOut();
        }
      }
      setLoading(false);
    };

    recoverUser();
  }, [location.pathname]);

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

      const userWithTheme = { 
        ...userData, 
        tenant_color: userData.primary_color || '#2563eb', 
        isSuperAdmin: userData.isSuperAdmin === true || userData.is_super_admin === true
      };

      localStorage.setItem('saas_token', token);
      localStorage.setItem('saas_user', JSON.stringify(userWithTheme));
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      setUser(userWithTheme);
      applyTheme(userWithTheme.tenant_color);

      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Erro ao logar' };
    }
  };

  const signOut = () => {
    localStorage.removeItem('saas_token');
    localStorage.removeItem('saas_user');
    setUser(null);
    delete api.defaults.headers.common['Authorization'];
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