import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './ServiceOrders.module.css'; // Reutilizando CSS de OS para manter padrão
import { Plus, FileText, ArrowRight, Trash2 } from 'lucide-react';

export default function Quotes() {
    const { addToast } = useContext(ToastContext);
    const navigate = useNavigate();
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/quotes')
           .then(res => setQuotes(res.data))
           .catch(() => addToast({type:'error', title:'Erro ao carregar orçamentos'}))
           .finally(() => setLoading(false));
    }, []);

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if(!confirm('Excluir este orçamento?')) return;
        try {
            await api.delete(`/quotes/${id}`);
            setQuotes(quotes.filter(q => q.id !== id));
            addToast({type:'success', title:'Excluído'});
        } catch(err) { addToast({type:'error', title:'Erro ao excluir'}); }
    };

    const getStatusBadge = (s) => {
        const map = { 'open': 'Aberto', 'approved': 'Aprovado', 'rejected': 'Rejeitado', 'converted': 'Convertido' };
        const colors = { 'open': '#3b82f6', 'approved': '#10b981', 'rejected': '#ef4444', 'converted': '#8b5cf6' };
        return <span style={{backgroundColor: colors[s] || '#999', color:'white', padding:'2px 8px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'bold', textTransform:'uppercase'}}>{map[s] || s}</span>;
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Orçamentos</h2>
                    <button onClick={() => navigate('/dashboard/quotes/new')} className={styles.btnPrimary}>
                        <Plus size={18}/> Novo Orçamento
                    </button>
                </div>

                {loading ? <p>Carregando...</p> : (
                    <div className={styles.grid}>
                        {quotes.map(q => (
                            <div key={q.id} className={styles.card} onClick={() => navigate(`/dashboard/quotes/${q.id}`)}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.osId}>#{q.id}</span>
                                    {getStatusBadge(q.status)}
                                </div>
                                <div className={styles.cardBody}>
                                    <h3 className={styles.clientName}>{q.client_name || q.client_real_name}</h3>
                                    <p className={styles.desc}>Total: R$ {Number(q.total_amount).toFixed(2)}</p>
                                    <p className={styles.desc} style={{fontSize:'0.8rem', color:'#666'}}>
                                        Válido até: {q.valid_until ? new Date(q.valid_until).toLocaleDateString() : 'Indefinido'}
                                    </p>
                                </div>
                                <div className={styles.cardFooter}>
                                    <div className={styles.meta}><FileText size={14}/> {new Date(q.created_at).toLocaleDateString()}</div>
                                    <button onClick={(e) => handleDelete(q.id, e)} className={styles.btnRemove}><Trash2 size={14}/></button>
                                </div>
                            </div>
                        ))}
                        {quotes.length === 0 && <div className={styles.empty}>Nenhum orçamento encontrado.</div>}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}