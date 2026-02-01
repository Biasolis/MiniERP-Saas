import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { useContext } from 'react';
import './styles/global.css';

// --- PÁGINAS DE AUTENTICAÇÃO ---
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// --- PÁGINAS DO DASHBOARD (VISÃO GERAL & SISTEMA) ---
import DashboardHome from './pages/dashboard/DashboardHome';
import Settings from './pages/dashboard/Settings';
import AuditLogs from './pages/dashboard/AuditLogs';
import Notifications from './pages/dashboard/Notifications';
import Profile from './pages/dashboard/Profile';

// --- GESTÃO DE TEMPO ---
import CalendarPage from './pages/dashboard/CalendarPage';
import TasksPage from './pages/dashboard/TasksPage';

// --- FINANCEIRO ---
import Transactions from './pages/dashboard/Transactions';
import Recurring from './pages/dashboard/Recurring';
import Reports from './pages/dashboard/Reports';
import Suppliers from './pages/dashboard/Suppliers';

// --- CRM (CLIENTES) ---
import Clients from './pages/dashboard/Clients';
import ClientDetails from './pages/dashboard/ClientDetails';

// --- OPERACIONAL & ESTOQUE & VENDAS ---
import Products from './pages/dashboard/Products';
import StockEntries from './pages/dashboard/StockEntries'; // <--- NOVO
import Sales from './pages/dashboard/Sales'; // <--- NOVO
import ServiceOrders from './pages/dashboard/ServiceOrders';
import ServiceOrderDetails from './pages/dashboard/ServiceOrderDetails';
import PrintOS from './pages/dashboard/PrintOS';

// --- SUPER ADMIN ---
import AdminDashboard from './pages/admin/AdminDashboard';

// =========================================================
// ROTA PROTEGIDA (Usuário Logado)
// =========================================================
const PrivateRoute = ({ children }) => {
  const { signed, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <div style={{textAlign:'center'}}>
            <div className="spinner"></div>
            <p style={{marginTop:'10px', color:'#6b7280'}}>Carregando sistema...</p>
        </div>
      </div>
    );
  }

  return signed ? children : <Navigate to="/login" />;
};

// =========================================================
// ROTA SUPER ADMIN (Apenas Leonardo/Admin Global)
// =========================================================
const SuperAdminRoute = ({ children }) => {
  const { signed, user, loading } = useContext(AuthContext);

  if (loading) {
    return <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Carregando...</div>;
  }

  // Verifica flag de super admin
  const isSuperUser = user?.isSuperAdmin === true || user?.is_super_admin === true;

  if (signed && isSuperUser) {
    return children;
  }

  return signed ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
};

// =========================================================
// DEFINIÇÃO DAS ROTAS
// =========================================================
function AppRoutes() {
  return (
    <Routes>
      {/* --- PÚBLICO --- */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      
      {/* --- DASHBOARD PRINCIPAL --- */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
      
      {/* --- GESTÃO DE TEMPO --- */}
      <Route path="/dashboard/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
      <Route path="/dashboard/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />

      {/* --- FINANCEIRO --- */}
      <Route path="/dashboard/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
      <Route path="/dashboard/recurring" element={<PrivateRoute><Recurring /></PrivateRoute>} />
      <Route path="/dashboard/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
      <Route path="/dashboard/suppliers" element={<PrivateRoute><Suppliers /></PrivateRoute>} />

      {/* --- ESTOQUE & VENDAS & PRODUTOS --- */}
      <Route path="/dashboard/products" element={<PrivateRoute><Products /></PrivateRoute>} />
      <Route path="/dashboard/stock-entries" element={<PrivateRoute><StockEntries /></PrivateRoute>} /> {/* NOVO */}
      <Route path="/dashboard/sales" element={<PrivateRoute><Sales /></PrivateRoute>} /> {/* NOVO */}

      {/* --- CRM (CLIENTES) --- */}
      <Route path="/dashboard/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
      <Route path="/dashboard/clients/:id" element={<PrivateRoute><ClientDetails /></PrivateRoute>} />

      {/* --- ORDENS DE SERVIÇO --- */}
      <Route path="/dashboard/service-orders" element={<PrivateRoute><ServiceOrders /></PrivateRoute>} />
      <Route path="/dashboard/service-orders/:id" element={<PrivateRoute><ServiceOrderDetails /></PrivateRoute>} />

      {/* --- CONFIGURAÇÕES & SISTEMA --- */}
      <Route path="/dashboard/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
      <Route path="/dashboard/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
      <Route path="/dashboard/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
      <Route path="/dashboard/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

      {/* --- IMPRESSÃO (Sem Layout) --- */}
      <Route path="/print/os/:id" element={<PrivateRoute><PrintOS /></PrivateRoute>} />

      {/* --- ÁREA ADMINISTRATIVA --- */}
      <Route path="/admin" element={<SuperAdminRoute><AdminDashboard /></SuperAdminRoute>} />

      {/* --- REDIRECIONAMENTOS --- */}
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

// =========================================================
// APP PRINCIPAL (PROVIDERS)
// =========================================================
export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}