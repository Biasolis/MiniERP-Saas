import { Navigate } from 'react-router-dom';

export default function PortalPrivateRoute({ children }) {
  // Busca o token exato que o EmployeeLogin salvou
  const token = localStorage.getItem('employeeToken');
  
  if (!token) {
    // Se não tiver token, volta pro login
    return <Navigate to="/portal/login" replace />;
  }

  return children;
}