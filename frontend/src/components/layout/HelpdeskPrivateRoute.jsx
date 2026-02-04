import { Navigate } from 'react-router-dom';

export default function HelpdeskPrivateRoute({ children }) {
  const token = localStorage.getItem('clientToken');
  
  // Se não tem token de cliente, redireciona para o login do helpdesk
  if (!token) {
    return <Navigate to="/helpdesk/login" replace />;
  }

  return children;
}