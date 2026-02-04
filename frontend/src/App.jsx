import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';

// Guards
import PrivateRoute from './components/layout/PrivateRoute';
import PortalPrivateRoute from './components/layout/PortalPrivateRoute';
import HelpdeskPrivateRoute from './components/layout/HelpdeskPrivateRoute';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboard
import DashboardHome from './pages/dashboard/DashboardHome';
import Clients from './pages/dashboard/Clients';
import ClientDetails from './pages/dashboard/ClientDetails';
import Products from './pages/dashboard/Products';
import ServiceOrders from './pages/dashboard/ServiceOrders';
import ServiceOrderDetails from './pages/dashboard/ServiceOrderDetails';
import Sales from './pages/dashboard/Sales';
import SaleDetails from './pages/dashboard/SaleDetails';
import Transactions from './pages/dashboard/Transactions';
import Suppliers from './pages/dashboard/Suppliers';
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import HumanResources from './pages/dashboard/HumanResources';
import CalendarPage from './pages/dashboard/CalendarPage';
import AuditLogs from './pages/dashboard/AuditLogs';
import Recurring from './pages/dashboard/Recurring';
import Quotes from './pages/dashboard/Quotes';
import QuoteDetails from './pages/dashboard/QuoteDetails';
import TasksPage from './pages/dashboard/TasksPage';
import Profile from './pages/dashboard/Profile';
import Notifications from './pages/dashboard/Notifications';
import Payroll from './pages/dashboard/Payroll';
import PcpDashboard from './pages/dashboard/PcpDashboard';
import PcpDetails from './pages/dashboard/PcpDetails';
import PosTerminal from './pages/pos/PosTerminal';
import PosHistory from './pages/dashboard/PosHistory';
import PrintOS from './pages/dashboard/PrintOS';
import StockEntries from './pages/dashboard/StockEntries';
import Tickets from './pages/dashboard/Tickets'; 
import TicketConfig from './pages/dashboard/TicketConfig';
import AdminDashboard from './pages/admin/AdminDashboard';

// Helpdesk & Portal
import HelpdeskLogin from './pages/helpdesk/HelpdeskLogin';
import HelpdeskPanel from './pages/helpdesk/HelpdeskPanel';
import HelpdeskTicket from './pages/helpdesk/HelpdeskTicket';
import EmployeeLogin from './pages/portal/EmployeeLogin';
import EmployeePanel from './pages/portal/EmployeePanel';
import EmployeeTicket from './pages/portal/EmployeeTicket';

// Wrapper para isolar Admin
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
          
          {/* --- HELPDESK (CLIENTE) --- */}
          {/* Rota padrão */}
          <Route path="/helpdesk/login" element={<HelpdeskLogin />} />
          {/* Rota com SLUG (ex: /helpdesk/tech-finance) */}
          <Route path="/helpdesk/:slug" element={<HelpdeskLogin />} />
          
          <Route path="/helpdesk" element={
              <HelpdeskPrivateRoute><HelpdeskPanel /></HelpdeskPrivateRoute>
          } />
          <Route path="/helpdesk/ticket/:id" element={
              <HelpdeskPrivateRoute><HelpdeskTicket /></HelpdeskPrivateRoute>
          } />

          {/* --- PORTAL (COLABORADOR) --- */}
          <Route path="/portal/login" element={<EmployeeLogin />} />
          <Route path="/portal" element={
              <PortalPrivateRoute><EmployeePanel /></PortalPrivateRoute>
          } />
          <Route path="/portal/ticket/:id" element={
              <PortalPrivateRoute><EmployeeTicket /></PortalPrivateRoute>
          } />

          {/* --- ADMIN / ERP --- */}
          <Route element={<AdminContextWrapper />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
            <Route path="/dashboard/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
            <Route path="/dashboard/clients/:id" element={<PrivateRoute><ClientDetails /></PrivateRoute>} />
            <Route path="/dashboard/products" element={<PrivateRoute><Products /></PrivateRoute>} />
            <Route path="/dashboard/entries" element={<PrivateRoute><StockEntries /></PrivateRoute>} />
            <Route path="/dashboard/service-orders" element={<PrivateRoute><ServiceOrders /></PrivateRoute>} />
            <Route path="/dashboard/service-orders/:id" element={<PrivateRoute><ServiceOrderDetails /></PrivateRoute>} />
            <Route path="/dashboard/print/os/:id" element={<PrivateRoute><PrintOS /></PrivateRoute>} />
            <Route path="/dashboard/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
            <Route path="/dashboard/sales/:id" element={<PrivateRoute><SaleDetails /></PrivateRoute>} />
            <Route path="/dashboard/pos" element={<PrivateRoute><PosTerminal /></PrivateRoute>} />
            <Route path="/dashboard/pos/history" element={<PrivateRoute><PosHistory /></PrivateRoute>} />
            <Route path="/dashboard/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/dashboard/recurring" element={<PrivateRoute><Recurring /></PrivateRoute>} />
            <Route path="/dashboard/quotes" element={<PrivateRoute><Quotes /></PrivateRoute>} />
            <Route path="/dashboard/quotes/:id" element={<PrivateRoute><QuoteDetails /></PrivateRoute>} />
            <Route path="/dashboard/suppliers" element={<PrivateRoute><Suppliers /></PrivateRoute>} />
            <Route path="/dashboard/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/dashboard/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
            <Route path="/dashboard/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />
            <Route path="/dashboard/hr" element={<PrivateRoute><HumanResources /></PrivateRoute>} />
            <Route path="/dashboard/payroll" element={<PrivateRoute><Payroll /></PrivateRoute>} />
            <Route path="/dashboard/pcp" element={<PrivateRoute><PcpDashboard /></PrivateRoute>} />
            <Route path="/dashboard/pcp/:id" element={<PrivateRoute><PcpDetails /></PrivateRoute>} />
            
            <Route path="/dashboard/tickets" element={<PrivateRoute><Tickets /></PrivateRoute>} />
            <Route path="/dashboard/tickets/config" element={<PrivateRoute><TicketConfig /></PrivateRoute>} />

            <Route path="/dashboard/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
            <Route path="/dashboard/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/dashboard/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/dashboard/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />

            <Route path="/admin" element={<AdminDashboard />} />
            
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Route>

        </Routes>
      </ToastProvider>
    </Router>
  );
}

export default App;