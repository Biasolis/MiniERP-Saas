import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import styles from './Sidebar.module.css';
import { 
  LayoutDashboard, 
  ArrowRightLeft, 
  Users, 
  Settings, 
  LogOut, 
  Box, 
  FileText, 
  Briefcase, 
  ShoppingCart, 
  Repeat, 
  Truck, 
  Layers,
  ClipboardList,
  Calendar,
  Bell,
  ShieldCheck,
  Factory,
  Monitor,
  DollarSign,
  MessageSquare
} from 'lucide-react';

export default function Sidebar() {
  const { signOut, user } = useContext(AuthContext);

  // Helper para verificar permissão (RBAC Simples para visualização)
  const hasRole = (roles) => {
      if (!user) return false;
      if (user.role === 'admin' || user.isSuperAdmin) return true;
      return roles.includes(user.role);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <Layers size={40} color="var(--primary-color)" />
        <div>
            <h2>MiniERP</h2>
            <small>Finance</small>
        </div>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/dashboard" end className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
          <LayoutDashboard size={20} />
          <span>Visão Geral</span>
        </NavLink>

        {/* FINANCEIRO */}
        {(hasRole(['financeiro'])) && (
            <NavLink to="/dashboard/transactions" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <ArrowRightLeft size={20} />
            <span>Transações</span>
            </NavLink>
        )}

        <div style={{ margin: '10px 0 5px 15px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Gestão
        </div>

        {(hasRole(['vendedor', 'financeiro', 'caixa'])) && (
            <NavLink to="/dashboard/clients" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Users size={20} />
            <span>Clientes</span>
            </NavLink>
        )}

        {(hasRole(['vendedor', 'producao'])) && (
            <NavLink to="/dashboard/products" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Box size={20} />
            <span>Produtos</span>
            </NavLink>
        )}

        {(hasRole(['financeiro', 'producao'])) && (
            <NavLink to="/dashboard/suppliers" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Truck size={20} />
            <span>Fornecedores</span>
            </NavLink>
        )}

        {(hasRole(['producao'])) && (
            <NavLink to="/dashboard/entries" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <ClipboardList size={20} />
            <span>Entradas de Estoque</span>
            </NavLink>
        )}

        <div style={{ margin: '10px 0 5px 15px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Vendas & Serviços
        </div>

        {(hasRole(['vendedor', 'financeiro'])) && (
            <NavLink to="/dashboard/sales" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <ShoppingCart size={20} />
            <span>Vendas</span>
            </NavLink>
        )}
        
        {(hasRole(['vendedor', 'caixa'])) && (
            <NavLink to="/dashboard/pos" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Monitor size={20} />
            <span>PDV (Terminal)</span>
            </NavLink>
        )}

        {(hasRole(['financeiro', 'caixa'])) && (
            <NavLink to="/dashboard/pos/history" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <FileText size={20} />
            <span>Histórico de Caixa</span>
            </NavLink>
        )}

        {(hasRole(['vendedor', 'producao'])) && (
            <NavLink to="/dashboard/service-orders" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Briefcase size={20} />
            <span>Ordens de Serviço</span>
            </NavLink>
        )}

        {(hasRole(['vendedor'])) && (
            <NavLink to="/dashboard/quotes" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <FileText size={20} />
            <span>Orçamentos</span>
            </NavLink>
        )}

        {(hasRole(['financeiro'])) && (
            <NavLink to="/dashboard/recurring" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Repeat size={20} />
            <span>Recorrência</span>
            </NavLink>
        )}

        <div style={{ margin: '10px 0 5px 15px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Atendimento
        </div>

        {(hasRole(['suporte'])) && (
            <NavLink to="/dashboard/tickets" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <MessageSquare size={20} />
            <span>Tickets</span>
            </NavLink>
        )}
        
        {(hasRole(['admin'])) && ( // Só admin mexe na config
            <NavLink to="/dashboard/tickets/config" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Settings size={20} />
            <span>Config. Portal</span>
            </NavLink>
        )}

        <div style={{ margin: '10px 0 5px 15px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Corporativo
        </div>

        {(hasRole(['rh'])) && (
            <NavLink to="/dashboard/hr" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Users size={20} />
            <span>Recursos Humanos</span>
            </NavLink>
        )}

        {(hasRole(['rh', 'financeiro'])) && (
            <NavLink to="/dashboard/payroll" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <DollarSign size={20} />
            <span>Folha de Pagamento</span>
            </NavLink>
        )}

        {(hasRole(['producao'])) && (
            <NavLink to="/dashboard/pcp" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Factory size={20} />
            <span>PCP (Produção)</span>
            </NavLink>
        )}

        {(hasRole(['financeiro'])) && (
            <NavLink to="/dashboard/reports" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <FileText size={20} />
            <span>Relatórios</span>
            </NavLink>
        )}

        <NavLink to="/dashboard/calendar" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
          <Calendar size={20} />
          <span>Calendário</span>
        </NavLink>

        <div style={{ margin: '10px 0 5px 15px', fontSize: '0.75rem', color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' }}>
          Sistema
        </div>

        {/* --- PROTEÇÃO DO BOTÃO SUPER ADMIN --- */}
        {user?.isSuperAdmin && (
          <NavLink to="/admin" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <ShieldCheck size={20} color="#ef4444" /> {/* Destaque vermelho */}
            <span style={{color:'#ef4444', fontWeight:'bold'}}>Super Admin</span>
          </NavLink>
        )}

        <NavLink to="/dashboard/notifications" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
          <Bell size={20} />
          <span>Notificações</span>
        </NavLink>

        {(hasRole(['admin'])) && (
            <NavLink to="/dashboard/audit" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <ShieldCheck size={20} />
            <span>Auditoria</span>
            </NavLink>
        )}

        {(hasRole(['admin'])) && (
            <NavLink to="/dashboard/settings" className={({ isActive }) => isActive ? `${styles.link} ${styles.active}` : styles.link}>
            <Settings size={20} />
            <span>Configurações</span>
            </NavLink>
        )}
      </nav>

      <div className={styles.footer}>
        <button onClick={signOut} className={styles.logoutBtn}>
          <LogOut size={20} />
          <span>Sair da Conta</span>
        </button>
      </div>
    </aside>
  );
}