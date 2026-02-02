import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/layout/PrivateRoute';

// Pages - Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Pages - Dashboard Core
import DashboardHome from './pages/dashboard/DashboardHome';
import Transactions from './pages/dashboard/Transactions';
import Clients from './pages/dashboard/Clients';
import ClientDetails from './pages/dashboard/ClientDetails';
import ServiceOrders from './pages/dashboard/ServiceOrders';
import ServiceOrderDetails from './pages/dashboard/ServiceOrderDetails';
import Products from './pages/dashboard/Products';
import Settings from './pages/dashboard/Settings';
import Reports from './pages/dashboard/Reports';
import Recurring from './pages/dashboard/Recurring';
import Sales from './pages/dashboard/Sales';
import Suppliers from './pages/dashboard/Suppliers';
import StockEntries from './pages/dashboard/StockEntries';
import AuditLogs from './pages/dashboard/AuditLogs';
import Profile from './pages/dashboard/Profile';
import Quotes from './pages/dashboard/Quotes';
import QuoteDetails from './pages/dashboard/QuoteDetails';
import Notifications from './pages/dashboard/Notifications';
import CalendarPage from './pages/dashboard/CalendarPage';
import TasksPage from './pages/dashboard/TasksPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import PcpDashboard from './pages/dashboard/PcpDashboard';
import PcpDetails from './pages/dashboard/PcpDetails';
import PrintOS from './pages/dashboard/PrintOS';

// Pages - Novos Módulos
import PosTerminal from './pages/pos/PosTerminal';
import PosHistory from './pages/dashboard/PosHistory';     // Certifique-se que existe
import HumanResources from './pages/dashboard/HumanResources'; // Certifique-se que existe

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* Rota do PDV (Sem Sidebar) */}
            <Route path="/pos" element={<PrivateRoute><PosTerminal /></PrivateRoute>} />

            {/* Rotas Dashboard Protegidas */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
            <Route path="/dashboard/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/dashboard/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
            <Route path="/dashboard/clients/:id" element={<PrivateRoute><ClientDetails /></PrivateRoute>} />
            <Route path="/dashboard/service-orders" element={<PrivateRoute><ServiceOrders /></PrivateRoute>} />
            <Route path="/dashboard/service-orders/:id" element={<PrivateRoute><ServiceOrderDetails /></PrivateRoute>} />
            <Route path="/dashboard/print-os/:id" element={<PrivateRoute><PrintOS /></PrivateRoute>} />
            <Route path="/dashboard/products" element={<PrivateRoute><Products /></PrivateRoute>} />
            <Route path="/dashboard/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
            <Route path="/dashboard/recurring" element={<PrivateRoute><Recurring /></PrivateRoute>} />
            <Route path="/dashboard/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/dashboard/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/dashboard/suppliers" element={<PrivateRoute><Suppliers /></PrivateRoute>} />
            <Route path="/dashboard/stock-entries" element={<PrivateRoute><StockEntries /></PrivateRoute>} />
            <Route path="/dashboard/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
            <Route path="/dashboard/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/dashboard/quotes" element={<PrivateRoute><Quotes /></PrivateRoute>} />
            <Route path="/dashboard/quotes/:id" element={<PrivateRoute><QuoteDetails /></PrivateRoute>} />
            <Route path="/dashboard/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/dashboard/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
            <Route path="/dashboard/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
            <Route path="/dashboard/pcp" element={<PrivateRoute><PcpDashboard /></PrivateRoute>} />
            <Route path="/dashboard/pcp/:id" element={<PrivateRoute><PcpDetails /></PrivateRoute>} />
            
            {/* Novas Rotas */}
            <Route path="/dashboard/pos-history" element={<PrivateRoute><PosHistory /></PrivateRoute>} />
            <Route path="/dashboard/hr" element={<PrivateRoute><HumanResources /></PrivateRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}