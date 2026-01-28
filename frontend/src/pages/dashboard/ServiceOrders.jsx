import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import { Plus, Search, Wrench, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import styles from './Clients.module.css'; // Reaproveitando CSS de Clientes por consistência

export default function ServiceOrders() {
  const { addToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState([]); // Para o select

  const [newOS, setNewOS] = useState({
      client_id: '', client_name: '', equipment: '', description: '', priority: 'normal'
  });

  useEffect(() => { 
      loadOrders(); 
      loadClients();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
        const res = await api.get('/service-orders');
        setOrders(res.data);
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao carregar OS' });
    } finally {
        setLoading(false);
    }
  }

  async function loadClients() {
      try {
          const res = await api.get('/clients');
          setClients(res.data);
      } catch (error) { console.error('Erro loading clients'); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
        // Encontra nome do cliente se selecionado
        let clientName = newOS.client_name;
        if(newOS.client_id) {
            const selected = clients.find(c => c.id === Number(newOS.client_id));
            if(selected) clientName = selected.name;
        }

        const res = await api.post('/service-orders', { ...newOS, client_name: clientName });
        addToast({ type: 'success', title: 'OS Criada!' });
        setIsModalOpen(false);
        // Redireciona para detalhes para adicionar itens
        navigate(`/dashboard/service-orders/${res.data.id}`);
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao criar OS' });
    }
  }

  const getStatusBadge = (status) => {
      const map = {
          'open': { label: 'Aberta', color: '#3b82f6', bg: '#dbeafe', icon: <AlertCircle size={14}/> },
          'in_progress': { label: 'Em Andamento', color: '#d97706', bg: '#fef3c7', icon: <Clock size={14}/> },
          'completed': { label: 'Finalizada', color: '#059669', bg: '#d1fae5', icon: <CheckCircle size={14}/> },
          'waiting': { label: 'Aguardando', color: '#6b7280', bg: '#f3f4f6', icon: <Clock size={14}/> }
      };
      const s = map[status] || map['open'];
      return (
          <span style={{
              background: s.bg, color: s.color, padding:'4px 8px', borderRadius:'12px',
              fontSize:'0.75rem', fontWeight:'600', display:'flex', alignItems:'center', gap:'4px', width:'fit-content'
          }}>
              {s.icon} {s.label}
          </span>
      );
  };

  return (
    <DashboardLayout>
      <div className={styles.header}>
        <h2>Ordens de Serviço</h2>
        <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Nova OS
        </button>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>#ID</th>
                        <th>Cliente</th>
                        <th>Equipamento</th>
                        <th>Prioridade</th>
                        <th>Total</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {orders.map(os => (
                        <tr key={os.id} onClick={() => navigate(`/dashboard/service-orders/${os.id}`)} style={{cursor:'pointer'}}>
                            <td style={{fontWeight:'bold'}}>#{os.id}</td>
                            <td>{os.client_name}</td>
                            <td>{os.equipment}</td>
                            <td style={{textTransform:'capitalize'}}>{os.priority === 'high' ? '🔥 Alta' : 'Normal'}</td>
                            <td>R$ {Number(os.total_amount).toFixed(2)}</td>
                            <td>{getStatusBadge(os.status)}</td>
                        </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan="6" style={{textAlign:'center', padding:'20px'}}>Nenhuma OS encontrada.</td></tr>}
                </tbody>
            </table>
        </div>
      )}

      {/* MODAL NOVA OS */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Ordem de Serviço">
        <form onSubmit={handleCreate} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            <div>
                <label className={styles.label}>Cliente</label>
                <select 
                    className={styles.input} 
                    value={newOS.client_id} 
                    onChange={e => setNewOS({...newOS, client_id: e.target.value, client_name: ''})}
                >
                    <option value="">-- Cliente Avulso --</option>
                    {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
            {!newOS.client_id && (
                <div>
                    <label className={styles.label}>Nome do Cliente (Avulso)</label>
                    <input required className={styles.input} value={newOS.client_name} onChange={e => setNewOS({...newOS, client_name: e.target.value})} />
                </div>
            )}
            <div>
                <label className={styles.label}>Equipamento / Veículo / Objeto</label>
                <input required className={styles.input} value={newOS.equipment} onChange={e => setNewOS({...newOS, equipment: e.target.value})} placeholder="Ex: Notebook Dell, Honda Civic..." />
            </div>
            <div>
                <label className={styles.label}>Problema Relatado</label>
                <textarea className={styles.input} style={{minHeight:'80px'}} value={newOS.description} onChange={e => setNewOS({...newOS, description: e.target.value})} />
            </div>
            <div>
                <label className={styles.label}>Prioridade</label>
                <select className={styles.input} value={newOS.priority} onChange={e => setNewOS({...newOS, priority: e.target.value})}>
                    <option value="low">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                </select>
            </div>
            <button type="submit" className={styles.btnPrimary} style={{marginTop:'10px', width:'100%', justifyContent:'center'}}>
                Criar e Adicionar Itens ➡
            </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}