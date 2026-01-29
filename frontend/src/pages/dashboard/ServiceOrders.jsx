import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import { Plus, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import styles from './ServiceOrders.module.css'; // Agora aponta para o CSS certo

export default function ServiceOrders() {
  const { addToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [clients, setClients] = useState([]);
  const [customFields, setCustomFields] = useState([]); // Campos configurados

  // Estado da Nova OS
  const [newOS, setNewOS] = useState({
      client_id: '', client_name: '', 
      equipment: '', description: '', priority: 'normal',
      customValues: {} // Valores dos campos { "uuid": "ABC-123" }
  });

  useEffect(() => { 
      loadOrders(); 
      loadClients();
      loadCustomFields();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try { 
        const res = await api.get('/service-orders'); 
        setOrders(res.data); 
    } catch(e){
        addToast({ type: 'error', title: 'Erro ao carregar OS' });
    } finally { 
        setLoading(false); 
    }
  }

  async function loadClients() { try { const res = await api.get('/clients'); setClients(res.data); } catch(e){} }
  async function loadCustomFields() { try { const res = await api.get('/tenant/custom-fields?module=service_order'); setCustomFields(res.data); } catch(e){} }

  async function handleCreate(e) {
    e.preventDefault();
    try {
        let clientName = newOS.client_name;
        if(newOS.client_id) {
            const selected = clients.find(c => c.id === Number(newOS.client_id));
            if(selected) clientName = selected.name;
        }

        const payload = { ...newOS, client_name: clientName };
        const res = await api.post('/service-orders', payload);
        
        addToast({ type: 'success', title: 'OS Criada!' });
        setIsModalOpen(false);
        navigate(`/dashboard/service-orders/${res.data.id}`);
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao criar OS' });
    }
  }

  // Handler para inputs dinâmicos
  const handleCustomChange = (fieldId, value) => {
      setNewOS(prev => ({
          ...prev,
          customValues: { ...prev.customValues, [fieldId]: value }
      }));
  };

  const getStatusBadge = (status) => {
      const map = { 
          'open': { label: 'Aberta', style: styles.open }, 
          'in_progress': { label: 'Andamento', style: styles.in_progress }, 
          'completed': { label: 'Finalizada', style: styles.completed }, 
          'waiting': { label: 'Aguardando', style: styles.waiting } 
      };
      const s = map[status] || map['open'];
      return <span className={`${styles.badge} ${s.style}`}>{s.label}</span>;
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
                            <td>R$ {Number(os.total_amount).toFixed(2)}</td>
                            <td>{getStatusBadge(os.status)}</td>
                        </tr>
                    ))}
                    {orders.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem', color:'#666'}}>Nenhuma OS encontrada.</td></tr>}
                </tbody>
            </table>
        </div>
      )}

      {/* MODAL NOVA OS */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Ordem de Serviço">
        <form onSubmit={handleCreate} style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            <div>
                <label className={styles.label}>Cliente</label>
                <select className={styles.input} value={newOS.client_id} onChange={e => setNewOS({...newOS, client_id: e.target.value, client_name: ''})}>
                    <option value="">-- Cliente Avulso --</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            {!newOS.client_id && (
                <div>
                    <label className={styles.label}>Nome do Cliente (Avulso)</label>
                    <input required className={styles.input} value={newOS.client_name} onChange={e => setNewOS({...newOS, client_name: e.target.value})} />
                </div>
            )}
            
            <div>
                <label className={styles.label}>Objeto / Equipamento</label>
                <input required className={styles.input} value={newOS.equipment} onChange={e => setNewOS({...newOS, equipment: e.target.value})} placeholder="Ex: Notebook Dell, Honda Civic" />
            </div>

            {/* RENDERIZAÇÃO DOS CAMPOS DINÂMICOS (PLACA, KM, ETC) */}
            {customFields.length > 0 && (
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', background:'#f9fafb', padding:'10px', borderRadius:'6px', border:'1px solid #e5e7eb'}}>
                    {customFields.map(field => (
                        <div key={field.id}>
                            <label className={styles.label}>{field.label}</label>
                            <input 
                                className={styles.input} 
                                value={newOS.customValues[field.id] || ''} 
                                onChange={e => handleCustomChange(field.id, e.target.value)} 
                                placeholder={field.label}
                            />
                        </div>
                    ))}
                </div>
            )}

            <div>
                <label className={styles.label}>Descrição do Problema</label>
                <textarea className={styles.input} style={{minHeight:'80px'}} value={newOS.description} onChange={e => setNewOS({...newOS, description: e.target.value})} />
            </div>
            
            <button type="submit" className={styles.btnPrimary} style={{marginTop:'10px', width:'100%', justifyContent:'center'}}>
                Criar OS
            </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}