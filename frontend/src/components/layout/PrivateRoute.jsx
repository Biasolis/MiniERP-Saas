import { Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

export default function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useContext(AuthContext);
  const token = localStorage.getItem('saas_token');

  if (loading) {
    return <div style={{display:'flex', justifyContent:'center', marginTop:'50px'}}>Carregando...</div>;
  }
  
  // 1. Verifica autenticação básica
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Verifica Permissões (RBAC)
  // Se allowedRoles for passado, verifica se o user.role está incluso
  // Se for SuperAdmin, libera tudo
  if (allowedRoles && allowedRoles.length > 0) {
      const userRole = user.role || 'user'; // fallback
      const isSuper = user.isSuperAdmin;

      if (!isSuper && !allowedRoles.includes(userRole)) {
          // Se não tiver permissão, manda para o dashboard padrão ou página de erro 403
          return <div style={{padding:'2rem', textAlign:'center', color:'#666'}}>Acesso não autorizado para seu perfil ({userRole}).</div>;
      }
  }

  return children;
}