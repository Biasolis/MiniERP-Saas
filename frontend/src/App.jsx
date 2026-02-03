import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import PrivateRoute from './components/layout/PrivateRoute';

// --- Páginas de Autenticação ---
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// --- Páginas do Dashboard (Core) ---
import DashboardHome from './pages/dashboard/DashboardHome';
import Transactions from './pages/dashboard/Transactions';
import Clients from './pages/dashboard/Clients';
import ClientDetails from './pages/dashboard/ClientDetails';
import Products from './pages/dashboard/Products';
import Settings from './pages/dashboard/Settings';
import Reports from './pages/dashboard/Reports';
import Recurring from './pages/dashboard/Recurring';
import Suppliers from './pages/dashboard/Suppliers';
import StockEntries from './pages/dashboard/StockEntries';
import AuditLogs from './pages/dashboard/AuditLogs';
import Profile from './pages/dashboard/Profile';
import Notifications from './pages/dashboard/Notifications';
import CalendarPage from './pages/dashboard/CalendarPage';
import TasksPage from './pages/dashboard/TasksPage';

// --- Módulos Específicos ---
import ServiceOrders from './pages/dashboard/ServiceOrders';
import ServiceOrderDetails from './pages/dashboard/ServiceOrderDetails';
import PrintOS from './pages/dashboard/PrintOS';
import Sales from './pages/dashboard/Sales';
import SaleDetails from './pages/dashboard/SaleDetails'; // <--- Importe o novo arquivo
import Quotes from './pages/dashboard/Quotes';
import QuoteDetails from './pages/dashboard/QuoteDetails';
import PcpDashboard from './pages/dashboard/PcpDashboard';
import PcpDetails from './pages/dashboard/PcpDetails';

// --- Novos Módulos (PDV, RH, Históricos) ---
import PosTerminal from './pages/pos/PosTerminal';
import PosHistory from './pages/dashboard/PosHistory';
import HumanResources from './pages/dashboard/HumanResources';

// --- Modulos de Tickets ---
import Tickets from './pages/dashboard/Tickets';
import TicketConfig from './pages/dashboard/TicketConfig';
import HelpdeskLogin from './pages/helpdesk/HelpdeskLogin';
import HelpdeskPanel from './pages/helpdesk/HelpdeskPanel';
import HelpdeskTicket from './pages/helpdesk/HelpdeskTicket'; 

// --- NOVOS MÓDULOS (Folha e Portal) ---
import Payroll from './pages/dashboard/Payroll';
import EmployeeLogin from './pages/portal/EmployeeLogin';
import EmployeePanel from './pages/portal/EmployeePanel';
import EmployeeTicket from './pages/portal/EmployeeTicket';

// --- Admin ---
import AdminDashboard from './pages/admin/AdminDashboard';

// CSS REMOVIDO AQUI

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Routes>
            {/* ========================================================
               ROTAS PÚBLICAS
               ======================================================== */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/portal/login" element={<EmployeeLogin />} />

            {/* ========================================================
               ROTA PDV (Tela Cheia / Sem Sidebar)
               ======================================================== */}
            <Route path="/pos" element={<PrivateRoute><PosTerminal /></PrivateRoute>} />

            {/* ========================================================
               ROTAS DO PORTAL DO COLABORADOR
               ======================================================== */}
            <Route path="/portal/panel" element={<EmployeePanel />} />
            <Route path="/portal/ticket/:id" element={<EmployeeTicket />} />

            {/* ========================================================
               ROTAS PROTEGIDAS DO DASHBOARD (SaaS Admin)
               ======================================================== */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardHome /></PrivateRoute>} />
            <Route path="/dashboard/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            
            {/* Gestão de Clientes */}
            <Route path="/dashboard/clients" element={<PrivateRoute><Clients /></PrivateRoute>} />
            <Route path="/dashboard/clients/:id" element={<PrivateRoute><ClientDetails /></PrivateRoute>} />
            
            {/* Ordens de Serviço */}
            <Route path="/dashboard/service-orders" element={<PrivateRoute><ServiceOrders /></PrivateRoute>} />
            <Route path="/dashboard/service-orders/:id" element={<PrivateRoute><ServiceOrderDetails /></PrivateRoute>} />
            
            {/* --- ROTA DE IMPRESSÃO (SEM PrivateRoute e SEM CSS global afetando) --- */}
            <Route path="/dashboard/print-os/:id" element={<PrintOS />} />
            
            {/* Produtos e Estoque */}
            <Route path="/dashboard/products" element={<PrivateRoute><Products /></PrivateRoute>} />
            <Route path="/dashboard/stock-entries" element={<PrivateRoute><StockEntries /></PrivateRoute>} />
            <Route path="/dashboard/suppliers" element={<PrivateRoute><Suppliers /></PrivateRoute>} />
            
            {/* Vendas e Orçamentos */}
            <Route path="/dashboard/sales" element={<PrivateRoute><Sales /></PrivateRoute>} />
            <Route path="/dashboard/sales/:id" element={<PrivateRoute><SaleDetails /></PrivateRoute>} />
            <Route path="/dashboard/recurring" element={<PrivateRoute><Recurring /></PrivateRoute>} />
            <Route path="/dashboard/quotes" element={<PrivateRoute><Quotes /></PrivateRoute>} />
            <Route path="/dashboard/quotes/:id" element={<PrivateRoute><QuoteDetails /></PrivateRoute>} />
            <Route path="/dashboard/pos-history" element={<PrivateRoute><PosHistory /></PrivateRoute>} />

            {/* RH e Departamento Pessoal */}
            <Route path="/dashboard/hr" element={<PrivateRoute><HumanResources /></PrivateRoute>} />
            <Route path="/dashboard/payroll" element={<PrivateRoute><Payroll /></PrivateRoute>} />
            
            {/* Planejamento e Controle de Produção (PCP) */}
            <Route path="/dashboard/pcp" element={<PrivateRoute><PcpDashboard /></PrivateRoute>} />
            <Route path="/dashboard/pcp/:id" element={<PrivateRoute><PcpDetails /></PrivateRoute>} />
            
            {/* Utilitários e Configurações */}
            <Route path="/dashboard/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/dashboard/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
            <Route path="/dashboard/audit" element={<PrivateRoute><AuditLogs /></PrivateRoute>} />
            <Route path="/dashboard/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/dashboard/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
            <Route path="/dashboard/calendar" element={<PrivateRoute><CalendarPage /></PrivateRoute>} />
            <Route path="/dashboard/tasks" element={<PrivateRoute><TasksPage /></PrivateRoute>} />

            {/* Módulo de Tickets (Admin) */}
            <Route path="/dashboard/tickets" element={<PrivateRoute><Tickets /></PrivateRoute>} />
            <Route path="/dashboard/tickets/config" element={<PrivateRoute><TicketConfig /></PrivateRoute>} />

            {/* Portal Externo de Ajuda (Público/Cliente) */}
            <Route path="/helpdesk/:slug" element={<HelpdeskLogin />} />
            <Route path="/helpdesk/:slug/panel" element={<HelpdeskPanel />} />
            <Route path="/helpdesk/:slug/ticket/:id" element={<HelpdeskTicket />} />

            {/* Super Admin */}
            <Route path="/admin" element={<PrivateRoute><AdminDashboard /></PrivateRoute>} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}