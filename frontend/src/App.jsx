import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

// Guards (Proteção de Rotas)
import PrivateRoute from './components/layout/PrivateRoute';
import PortalPrivateRoute from './components/layout/PortalPrivateRoute';
import HelpdeskPrivateRoute from './components/layout/HelpdeskPrivateRoute';
import SuperAdminRoute from './components/layout/SuperAdminRoute'; // <--- NOVO GUARD IMPORTADO

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard Geral
import DashboardHome from './pages/dashboard/DashboardHome';
import Settings from './pages/dashboard/Settings';
import Profile from './pages/dashboard/Profile';
import Notifications from './pages/dashboard/Notifications';
import AuditLogs from './pages/dashboard/AuditLogs';

// Módulos Específicos
import Clients from './pages/dashboard/Clients';
import ClientDetails from './pages/dashboard/ClientDetails';
import Products from './pages/dashboard/Products'; // Estoque
import StockEntries from './pages/dashboard/StockEntries';
import Suppliers from './pages/dashboard/Suppliers';

import ServiceOrders from './pages/dashboard/ServiceOrders'; // Produção/Serviço
import ServiceOrderDetails from './pages/dashboard/ServiceOrderDetails';
import PcpDashboard from './pages/dashboard/PcpDashboard';
import PcpDetails from './pages/dashboard/PcpDetails';

import Sales from './pages/dashboard/Sales'; // Vendas
import SaleDetails from './pages/dashboard/SaleDetails';
import PosTerminal from './pages/pos/PosTerminal';
import PosHistory from './pages/dashboard/PosHistory';
import Quotes from './pages/dashboard/Quotes';
import QuoteDetails from './pages/dashboard/QuoteDetails';

import Transactions from './pages/dashboard/Transactions'; // Financeiro
import Recurring from './pages/dashboard/Recurring';
import Reports from './pages/dashboard/Reports';

import HumanResources from './pages/dashboard/HumanResources'; // RH
import Payroll from './pages/dashboard/Payroll';
import CalendarPage from './pages/dashboard/CalendarPage';
import TasksPage from './pages/dashboard/TasksPage';

import PrintOS from './pages/dashboard/PrintOS';

// Helpdesk Interno
import Tickets from './pages/dashboard/Tickets'; 
import TicketConfig from './pages/dashboard/TicketConfig';

// Helpdesk Externo & Portal
import HelpdeskLogin from './pages/helpdesk/HelpdeskLogin';
import HelpdeskPanel from './pages/helpdesk/HelpdeskPanel';
import HelpdeskTicket from './pages/helpdesk/HelpdeskTicket';
import EmployeeLogin from './pages/portal/EmployeeLogin';
import EmployeePanel from './pages/portal/EmployeePanel';
import EmployeeTicket from './pages/portal/EmployeeTicket';

// Super Admin
import AdminDashboard from './pages/admin/AdminDashboard';

const AdminContextWrapper = () => {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
};

function App() {
  return (
    <Router>
      <ToastProvider>
        <Routes>
          
          {/* --- EXTERNOS (Helpdesk/Portal) --- */}
          <Route path="/helpdesk/login" element={<HelpdeskLogin />} />
          <Route path="/helpdesk/:slug" element={<HelpdeskLogin />} />
          <Route path="/helpdesk" element={<HelpdeskPrivateRoute><HelpdeskPanel /></HelpdeskPrivateRoute>} />
          <Route path="/helpdesk/ticket/:id" element={<HelpdeskPrivateRoute><HelpdeskTicket /></HelpdeskPrivateRoute>} />

          <Route path="/portal/login" element={<EmployeeLogin />} />
          <Route path="/portal" element={<PortalPrivateRoute><EmployeePanel /></PortalPrivateRoute>} />
          <Route path="/portal/ticket/:id" element={<PortalPrivateRoute><EmployeeTicket /></PortalPrivateRoute>} />

          {/* --- SISTEMA INTERNO (ERP) --- */}
          <Route element={<AdminContextWrapper />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* DASHBOARD & COMUM (Acesso Geral) */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
            <Route path="/dashboard/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/dashboard/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/dashboard/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
            <Route path="/dashboard/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />

            {/* COMERCIAL (Vendas/Caixa) */}
            <Route path="/dashboard/pos" element={
                <PrivateRoute allowedRoles={['admin', 'vendedor', 'caixa']}><PosTerminal /></PrivateRoute>
            } />
            <Route path="/dashboard/pos/history" element={
                <PrivateRoute allowedRoles={['admin', 'vendedor', 'caixa', 'financeiro']}><PosHistory /></PrivateRoute>
            } />
            <Route path="/dashboard/sales" element={
                <PrivateRoute allowedRoles={['admin', 'vendedor', 'financeiro']}><Sales /></PrivateRoute>
            } />
            <Route path="/dashboard/sales/:id" element={
                <PrivateRoute allowedRoles={['admin', 'vendedor', 'financeiro']}><SaleDetails /></PrivateRoute>
            } />
            <Route path="/dashboard/quotes" element={
                <PrivateRoute allowedRoles={['admin', 'vendedor']}><Quotes /></PrivateRoute>
            } />
            <Route path="/dashboard/quotes/:id" element={
                <PrivateRoute allowedRoles={['admin', 'vendedor']}><QuoteDetails /></PrivateRoute>
            } />
            <Route path="/dashboard/clients" element={
                <PrivateRoute allowedRoles={['admin', 'vendedor', 'financeiro', 'caixa']}><Clients /></PrivateRoute>
            } />
            <Route path="/dashboard/clients/:id" element={
                <PrivateRoute allowedRoles={['admin', 'vendedor', 'financeiro', 'caixa']}><ClientDetails /></PrivateRoute>
            } />

            {/* FINANCEIRO */}
            <Route path="/dashboard/transactions" element={
                <PrivateRoute allowedRoles={['admin', 'financeiro']}><Transactions /></PrivateRoute>
            } />
            <Route path="/dashboard/recurring" element={
                <PrivateRoute allowedRoles={['admin', 'financeiro']}><Recurring /></PrivateRoute>
            } />
            
            {/* PRODUÇÃO & ESTOQUE */}
            <Route path="/dashboard/products" element={
                <PrivateRoute allowedRoles={['admin', 'producao', 'vendedor']}><Products /></PrivateRoute>
            } />
            <Route path="/dashboard/entries" element={
                <PrivateRoute allowedRoles={['admin', 'producao']}><StockEntries /></PrivateRoute>
            } />
            <Route path="/dashboard/suppliers" element={
                <PrivateRoute allowedRoles={['admin', 'producao', 'financeiro']}><Suppliers /></PrivateRoute>
            } />
            <Route path="/dashboard/service-orders" element={
                <PrivateRoute allowedRoles={['admin', 'producao', 'vendedor']}><ServiceOrders /></PrivateRoute>
            } />
            <Route path="/dashboard/service-orders/:id" element={
                <PrivateRoute allowedRoles={['admin', 'producao', 'vendedor']}><ServiceOrderDetails /></PrivateRoute>
            } />
            <Route path="/dashboard/print/os/:id" element={
                <PrivateRoute allowedRoles={['admin', 'producao', 'vendedor']}><PrintOS /></PrivateRoute>
            } />
            <Route path="/dashboard/pcp" element={
                <PrivateRoute allowedRoles={['admin', 'producao']}><PcpDashboard /></PrivateRoute>
            } />
            <Route path="/dashboard/pcp/:id" element={
                <PrivateRoute allowedRoles={['admin', 'producao']}><PcpDetails /></PrivateRoute>
            } />

            {/* RH & PESSOAL */}
            <Route path="/dashboard/hr" element={
                <PrivateRoute allowedRoles={['admin', 'rh']}><HumanResources /></PrivateRoute>
            } />
            <Route path="/dashboard/payroll" element={
                <PrivateRoute allowedRoles={['admin', 'rh', 'financeiro']}><Payroll /></PrivateRoute>
            } />

            {/* SUPORTE & ADMINISTRAÇÃO */}
            <Route path="/dashboard/tickets" element={
                <PrivateRoute allowedRoles={['admin', 'suporte']}><Tickets /></PrivateRoute>
            } />
            <Route path="/dashboard/tickets/config" element={
                <PrivateRoute allowedRoles={['admin']}><TicketConfig /></PrivateRoute>
            } />
            <Route path="/dashboard/reports" element={
                <PrivateRoute allowedRoles={['admin', 'financeiro']}><Reports /></PrivateRoute>
            } />
            <Route path="/dashboard/audit" element={
                <PrivateRoute allowedRoles={['admin']}><AuditLogs /></PrivateRoute>
            } />
            <Route path="/dashboard/settings" element={
                <PrivateRoute allowedRoles={['admin']}><Settings /></PrivateRoute>
            } />

            {/* --- ROTA SUPER ADMIN (Protegida) --- */}
            <Route path="/admin" element={
                <SuperAdminRoute>
                    <AdminDashboard />
                </SuperAdminRoute>
            } />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>

        </Routes>
      </ToastProvider>
    </Router>
  );
}

export default App;