import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './ServiceOrders.module.css';
import { 
    Plus, Search, Wrench, Clock, CheckCircle, 
    AlertCircle, FileText, User 
} from 'lucide-react';

export default function ServiceOrders() {
    const { addToast } = useContext(ToastContext);
    const navigate = useNavigate();

    const [orders, setOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]); // Técnicos
    const [customFields, setCustomFields] = useState([]); // <--- NOVO: Campos Personalizados
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');

    // Modal Nova OS
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newOrder, setNewOrder] = useState({
        client_id: '',
        equipment: '',
        description: '',
        priority: 'normal',
        technician_id: '',
        customValues: {} // <--- NOVO: Valores dos campos extras
    });

    useEffect(() => {
        loadData();
        loadCustomFields(); // <--- NOVO
    }, [filterStatus]);

    async function loadData() {
        setLoading(true);
        try {
            // Carrega OS
            let url = '/service-orders';
            if (filterStatus !== 'all') url += `?status=${filterStatus}`;
            const res = await api.get(url);
            setOrders(res.data);

            // Carrega Clientes
            if (clients.length === 0) {
                const cliRes = await api.get('/clients');
                setClients(cliRes.data);
            }
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', title: 'Erro ao carregar dados.' });
        } finally {
            setLoading(false);
        }
    }

    // <--- NOVO: Busca definições de campos (Placa, KM, etc)
    async function loadCustomFields() {
        try {
            const res = await api.get('/tenant/custom-fields?module=service_order');
            setCustomFields(res.data);
        } catch (e) { console.error(e); }
    }

    // <--- NOVO: Handler para inputs dinâmicos
    const handleCustomChange = (fieldId, value) => {
        setNewOrder(prev => ({
            ...prev,
            customValues: { ...prev.customValues, [fieldId]: value }
        }));
    };

    const handleCreateOrder = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/service-orders', newOrder);
            addToast({ type: 'success', title: 'OS Aberta com sucesso!' });
            setIsModalOpen(false);
            // Redireciona para os detalhes para adicionar itens
            navigate(`/dashboard/service-orders/${res.data.id}`);
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao criar OS.' });
        }
    };

    // Helpers de UI
    const getStatusBadge = (status) => {
        switch(status) {
            case 'open': return <span className={`${styles.badge} ${styles.open}`}>Aberta</span>;
            case 'in_progress': return <span className={`${styles.badge} ${styles.progress}`}>Em Andamento</span>;
            case 'waiting': return <span className={`${styles.badge} ${styles.waiting}`}>Aguardando</span>;
            case 'completed': return <span className={`${styles.badge} ${styles.completed}`}>Concluída</span>;
            case 'cancelled': return <span className={`${styles.badge} ${styles.cancelled}`}>Cancelada</span>;
            default: return status;
        }
    };

    const getPriorityColor = (p) => {
        if (p === 'high') return '#ef4444';
        if (p === 'low') return '#10b981';
        return '#f59e0b'; // normal
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h2>Ordens de Serviço</h2>
                        <p>Gerencie manutenções e serviços técnicos.</p>
                    </div>
                    <button onClick={() => setIsModalOpen(true)} className={styles.btnPrimary}>
                        <Plus size={20} /> Nova OS
                    </button>
                </div>

                <div className={styles.filters}>
                    {['all', 'open', 'in_progress', 'waiting', 'completed'].map(s => (
                        <button 
                            key={s} 
                            className={`${styles.filterBtn} ${filterStatus === s ? styles.active : ''}`}
                            onClick={() => setFilterStatus(s)}
                        >
                            {s === 'all' ? 'Todas' : s.replace('_', ' ').toUpperCase()}
                        </button>
                    ))}
                </div>

                {loading ? <p>Carregando...</p> : (
                    <div className={styles.grid}>
                        {orders.map(os => (
                            <div key={os.id} className={styles.card} onClick={() => navigate(`/dashboard/service-orders/${os.id}`)}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.osId}>#{os.id}</span>
                                    {getStatusBadge(os.status)}
                                </div>
                                <div className={styles.cardBody}>
                                    <h3 className={styles.clientName}>{os.client_name}</h3>
                                    <p className={styles.equipment}><Wrench size={14}/> {os.equipment}</p>
                                    <p className={styles.desc}>{os.description}</p>
                                </div>
                                <div className={styles.cardFooter}>
                                    <div className={styles.meta}>
                                        <Clock size={14}/> {new Date(os.created_at).toLocaleDateString('pt-BR')}
                                    </div>
                                    <div className={styles.priority} style={{color: getPriorityColor(os.priority)}}>
                                        Prioridade {os.priority === 'normal' ? 'Normal' : os.priority === 'high' ? 'Alta' : 'Baixa'}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {orders.length === 0 && <div className={styles.empty}>Nenhuma OS encontrada.</div>}
                    </div>
                )}
            </div>

            {/* MODAL NOVA OS */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Ordem de Serviço">
                <form onSubmit={handleCreateOrder} className={styles.form}>
                    <div>
                        <label>Cliente</label>
                        <select 
                            required 
                            value={newOrder.client_id} 
                            onChange={e => setNewOrder({...newOrder, client_id: e.target.value})}
                            className={styles.input}
                        >
                            <option value="">-- Selecione o Cliente --</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    
                    <div>
                        <label>Equipamento / Veículo</label>
                        <input 
                            required 
                            placeholder="Ex: Notebook Dell, Ford Ka 2018..." 
                            value={newOrder.equipment} 
                            onChange={e => setNewOrder({...newOrder, equipment: e.target.value})}
                            className={styles.input}
                        />
                    </div>

                    {/* <--- NOVO: RENDERIZAÇÃO DOS CAMPOS PERSONALIZADOS ---> */}
                    {customFields.length > 0 && (
                        <div style={{
                            display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', 
                            background:'#f9fafb', padding:'10px', borderRadius:'6px', border:'1px solid #e5e7eb'
                        }}>
                            {customFields.map(field => (
                                <div key={field.id}>
                                    <label style={{fontSize:'0.85rem', fontWeight:600, color:'#374151', display:'block', marginBottom:'5px'}}>
                                        {field.label}
                                    </label>
                                    <input 
                                        className={styles.input}
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        placeholder={field.label}
                                        value={newOrder.customValues[field.id] || ''}
                                        onChange={e => handleCustomChange(field.id, e.target.value)}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                        <div>
                            <label>Prioridade</label>
                            <select 
                                value={newOrder.priority} 
                                onChange={e => setNewOrder({...newOrder, priority: e.target.value})}
                                className={styles.input}
                            >
                                <option value="low">Baixa</option>
                                <option value="normal">Normal</option>
                                <option value="high">Alta (Urgente)</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label>Descrição do Problema</label>
                        <textarea 
                            rows="3" 
                            placeholder="Descreva o defeito relatado..." 
                            value={newOrder.description} 
                            onChange={e => setNewOrder({...newOrder, description: e.target.value})}
                            className={styles.textarea}
                        ></textarea>
                    </div>

                    {/* <--- BOTÃO AJUSTADO PARA O PADRÃO (Primary, Largo, Centralizado) ---> */}
                    <button 
                        type="submit" 
                        className={styles.btnPrimary} 
                        style={{marginTop:'15px', width:'100%', justifyContent:'center'}}
                    >
                        Abrir OS
                    </button>
                </form>
            </Modal>
        </DashboardLayout>
    );
}