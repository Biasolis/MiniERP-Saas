import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './ClientDetails.module.css'; // CSS Novo
import { 
    ArrowLeft, Phone, Mail, MapPin, Edit, Trash2, 
    MessageSquare, CheckCircle, Clock, DollarSign, Calendar 
} from 'lucide-react';

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [interactionText, setInteractionText] = useState('');
    const [interactionType, setInteractionType] = useState('note');

    useEffect(() => { loadData(); }, [id]);

    async function loadData() {
        try {
            const res = await api.get(`/clients/${id}`);
            setData(res.data);
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao carregar cliente' });
            navigate('/dashboard/clients');
        } finally {
            setLoading(false);
        }
    }

    async function handleAddInteraction(e) {
        e.preventDefault();
        if(!interactionText) return;
        try {
            await api.post(`/clients/${id}/interactions`, {
                type: interactionType,
                description: interactionText
            });
            setInteractionText('');
            loadData(); // Recarrega para mostrar a nova interação
            addToast({type:'success', title: 'Histórico salvo'});
        } catch (error) {
            addToast({type:'error', title: 'Erro ao salvar'});
        }
    }

    async function handleDelete() {
        if(!confirm('Tem certeza? Isso apagará todas as OS e Vendas deste cliente.')) return;
        try {
            await api.delete(`/clients/${id}`);
            addToast({type:'success', title: 'Cliente removido'});
            navigate('/dashboard/clients');
        } catch(e) {
            addToast({type:'error', title: 'Erro ao remover'});
        }
    }

    if (loading) return <DashboardLayout>Carregando...</DashboardLayout>;
    if (!data) return null;

    const { client, financial, history, last_os } = data;

    return (
        <DashboardLayout>
            <button onClick={() => navigate('/dashboard/clients')} className={styles.backBtn}>
                <ArrowLeft size={16} /> Voltar
            </button>

            <div className={styles.gridContainer}>
                {/* COLUNA ESQUERDA: INFO BÁSICA */}
                <div className={styles.leftCol}>
                    <div className={styles.card}>
                        <div className={styles.avatarCircle}>{client.name.charAt(0)}</div>
                        <h2 style={{textAlign:'center', margin:'10px 0 5px 0'}}>{client.name}</h2>
                        <div className={styles.statusBadge}>{client.status === 'lead' ? 'Lead' : 'Cliente Ativo'}</div>
                        
                        <div className={styles.divider}></div>
                        
                        <div className={styles.infoRow}><Phone size={16}/> {client.phone || '-'}</div>
                        <div className={styles.infoRow}><Mail size={16}/> {client.email || '-'}</div>
                        <div className={styles.infoRow}><MapPin size={16}/> {client.city}/{client.state}</div>
                        
                        <div className={styles.divider}></div>
                        
                        <div className={styles.statBox}>
                            <small>LTV (Total Comprado)</small>
                            <div style={{color:'#10b981', fontWeight:'bold', fontSize:'1.1rem'}}>
                                R$ {Number(financial.total_spent).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </div>
                        </div>
                        <div className={styles.statBox}>
                            <small>Em Aberto (Dívida)</small>
                            <div style={{color:'#ef4444', fontWeight:'bold', fontSize:'1.1rem'}}>
                                R$ {Number(financial.total_debt).toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                            </div>
                        </div>

                        <button onClick={handleDelete} className={styles.deleteBtn}>
                            <Trash2 size={14} /> Excluir Cliente
                        </button>
                    </div>
                </div>

                {/* COLUNA DIREITA: TIMELINE E OS */}
                <div className={styles.rightCol}>
                    
                    {/* INPUT DE INTERAÇÃO */}
                    <div className={styles.card}>
                        <h3 style={{marginBottom:'10px', fontSize:'1rem'}}>Registrar Interação</h3>
                        <form onSubmit={handleAddInteraction}>
                            <div style={{display:'flex', gap:'10px', marginBottom:'10px'}}>
                                <select 
                                    className={styles.select} 
                                    value={interactionType} 
                                    onChange={e => setInteractionType(e.target.value)}
                                >
                                    <option value="note">Nota</option>
                                    <option value="call">Ligação</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="meeting">Reunião</option>
                                </select>
                                <input 
                                    className={styles.input} 
                                    placeholder="O que foi conversado?" 
                                    value={interactionText}
                                    onChange={e => setInteractionText(e.target.value)}
                                />
                                <button type="submit" className={styles.btnAction}>Salvar</button>
                            </div>
                        </form>

                        <div className={styles.timeline}>
                            {history.map(item => (
                                <div key={item.id} className={styles.timelineItem}>
                                    <div className={styles.timelineIcon}>
                                        {item.type === 'call' && <Phone size={14} />}
                                        {item.type === 'whatsapp' && <MessageSquare size={14} />}
                                        {item.type === 'meeting' && <User size={14} />}
                                        {item.type === 'note' && <Edit size={14} />}
                                    </div>
                                    <div className={styles.timelineContent}>
                                        <div style={{fontWeight:600, fontSize:'0.9rem'}}>{item.description}</div>
                                        <small style={{color:'#9ca3af'}}>
                                            {new Date(item.date).toLocaleString('pt-BR')} • por {item.user_name}
                                        </small>
                                    </div>
                                </div>
                            ))}
                            {history.length === 0 && <p style={{color:'#9ca3af', fontStyle:'italic'}}>Nenhuma interação registrada.</p>}
                        </div>
                    </div>

                    {/* ÚLTIMAS OS */}
                    <div className={styles.card}>
                        <h3 style={{marginBottom:'10px', fontSize:'1rem'}}>Ordens de Serviço Recentes</h3>
                        <table className={styles.miniTable}>
                            <thead>
                                <tr>
                                    <th>Equipamento</th>
                                    <th>Data</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {last_os.map(os => (
                                    <tr key={os.id}>
                                        <td>{os.equipment}</td>
                                        <td>{new Date(os.created_at).toLocaleDateString('pt-BR')}</td>
                                        <td>
                                            <span style={{
                                                fontSize:'0.75rem', padding:'2px 6px', borderRadius:'4px',
                                                background: os.status === 'completed' ? '#d1fae5' : '#fee2e2',
                                                color: os.status === 'completed' ? '#065f46' : '#991b1b'
                                            }}>
                                                {os.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {last_os.length === 0 && <tr><td colSpan="3">Nenhuma OS encontrada.</td></tr>}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </DashboardLayout>
    );
}