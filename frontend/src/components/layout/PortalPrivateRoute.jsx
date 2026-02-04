import { Navigate } from 'react-router-dom';

export default function PortalPrivateRoute({ children }) {
  const token = localStorage.getItem('employeeToken');
  
  // Se não tem token de funcionário, redireciona para o login do portal
  if (!token) {
    return <Navigate to="/portal/login" replace />;
  }

  return children;
}