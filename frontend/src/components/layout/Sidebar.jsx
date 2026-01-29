import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useContext } from 'react';
import styles from './Sidebar.module.css';
import { 
  LayoutDashboard, Receipt, BarChart3, Settings as SettingsIcon, LogOut, 
  ClipboardList, Users, Repeat, Package, Shield, Bell, UserCircle, Download, 
  Calendar as CalendarIcon, CheckSquare, Layers, ShoppingCart, PackagePlus 
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

export default function Sidebar() {
  const location = useLocation();
  const { signOut, user } = useContext(AuthContext);
  
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstallBtn(true); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstallBtn(false);
    setDeferredPrompt(null);
  };

  return (
    <aside className={styles.sidebar}>
      {/* --- LOGO DO SISTEMA --- */}
      <div className={styles.logo} style={{ marginBottom: '2.5rem' }}>
        <div style={{
            width:'48px', height:'48px', 
            background:'linear-gradient(135deg, var(--primary-color) 0%, #4f46e5 100%)', 
            borderRadius:'12px', 
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            margin: '0 auto 10px auto'
        }}>
            <Layers size={28} color="white" />
        </div>
        <h2 style={{fontSize: '1.2rem', fontWeight: '800', letterSpacing: '-0.5px'}}>Mini ERP <span style={{color:'var(--primary-color)'}}>Finance</span></h2>
        <small style={{opacity:0.6, fontSize:'0.75rem', textTransform: 'uppercase', letterSpacing: '1px'}}>Gestão Inteligente</small>
      </div>

      <nav className={styles.nav}>
        <Link to="/dashboard" className={`${styles.link} ${isActive('/dashboard') ? styles.active : ''}`}>
          <LayoutDashboard size={20} /> Visão Geral
        </Link>
        
        {/* NOVO: Vendas / PDV */}
        <Link to="/dashboard/sales" className={`${styles.link} ${isActive('/dashboard/sales') ? styles.active : ''}`}>
          <ShoppingCart size={20} /> Vendas / PDV
        </Link>

        <Link to="/dashboard/calendar" className={`${styles.link} ${isActive('/dashboard/calendar') ? styles.active : ''}`}>
          <CalendarIcon size={20} /> Agenda
        </Link>

        <Link to="/dashboard/tasks" className={`${styles.link} ${isActive('/dashboard/tasks') ? styles.active : ''}`}>
          <CheckSquare size={20} /> Tarefas
        </Link>

        <Link to="/dashboard/notifications" className={`${styles.link} ${isActive('/dashboard/notifications') ? styles.active : ''}`}>
          <Bell size={20} /> Notificações
        </Link>

        <Link to="/dashboard/transactions" className={`${styles.link} ${isActive('/dashboard/transactions') ? styles.active : ''}`}>
          <Receipt size={20} /> Transações
        </Link>
        
        <Link to="/dashboard/recurring" className={`${styles.link} ${isActive('/dashboard/recurring') ? styles.active : ''}`}>
          <Repeat size={20} /> Recorrências
        </Link>

        <Link to="/dashboard/products" className={`${styles.link} ${isActive('/dashboard/products') ? styles.active : ''}`}>
          <Package size={20} /> Produtos e Serviços
        </Link>

        {/* NOVO: Entrada de Estoque */}
        <Link to="/dashboard/stock-entries" className={`${styles.link} ${isActive('/dashboard/stock-entries') ? styles.active : ''}`}>
          <PackagePlus size={20} /> Entrada de Estoque
        </Link>

        <Link to="/dashboard/clients" className={`${styles.link} ${isActive('/dashboard/clients') ? styles.active : ''}`}>
          <Users size={20} /> Clientes
        </Link>

        <Link to="/dashboard/service-orders" className={`${styles.link} ${isActive('/dashboard/service-orders') ? styles.active : ''}`}>
          <ClipboardList size={20} /> Ordens de Serviço
        </Link>
        
        <Link to="/dashboard/reports" className={`${styles.link} ${isActive('/dashboard/reports') ? styles.active : ''}`}>
          <BarChart3 size={20} /> Relatórios IA
        </Link>

        <div style={{borderTop:'1px solid rgba(255,255,255,0.1)', margin:'10px 0'}}></div>

        <Link to="/dashboard/profile" className={`${styles.link} ${isActive('/dashboard/profile') ? styles.active : ''}`}>
          <UserCircle size={20} /> Meu Perfil
        </Link>

        <Link to="/dashboard/audit" className={`${styles.link} ${isActive('/dashboard/audit') ? styles.active : ''}`}>
          <Shield size={20} /> Auditoria
        </Link>

        <Link to="/dashboard/settings" className={`${styles.link} ${isActive('/dashboard/settings') ? styles.active : ''}`}>
          <SettingsIcon size={20} /> Configurações
        </Link>

        {showInstallBtn && (
            <button onClick={handleInstallClick} className={styles.link} style={{background: 'rgba(255,255,255,0.1)', border: '1px dashed rgba(255,255,255,0.3)', marginTop: '10px', cursor: 'pointer', width: '100%', textAlign: 'left'}}>
                <Download size={20} /> Instalar App
            </button>
        )}
      </nav>

      <div className={styles.footer}>
        <div style={{marginBottom: '10px', fontSize: '0.8rem', opacity: 0.7, textAlign: 'center'}}>
          Logado como <strong>{user?.name?.split(' ')[0]}</strong>
        </div>
        <button onClick={signOut} className={styles.logoutBtn}>
          <LogOut size={18} /> Sair do Sistema
        </button>
      </div>
    </aside>
  );
}