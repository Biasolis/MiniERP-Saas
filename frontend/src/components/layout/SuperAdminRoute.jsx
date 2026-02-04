import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

export default function SuperAdminRoute({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{display:'flex', justifyContent:'center', marginTop:'50px'}}>Carregando...</div>;
  }

  // Se não estiver logado, manda pro login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado mas NÃO for Super Admin, manda pro dashboard comum
  if (!user.isSuperAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Se for Super Admin, libera o acesso
  return children;
}