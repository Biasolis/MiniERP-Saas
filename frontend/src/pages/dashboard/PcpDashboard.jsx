import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import styles from './ServiceOrders.module.css'; // Reusa CSS
import { Plus, Factory, Clock, CheckCircle } from 'lucide-react';

export default function PcpDashboard() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/pcp/orders')
           .then(res => setOrders(res.data))
           .finally(() => setLoading(false));
    }, []);

    const getStatusBadge = (s) => {
        const map = { 'planned': 'Planejado', 'in_production': 'Em Produção', 'completed': 'Concluído' };
        const colors = { 'planned': '#3b82f6', 'in_production': '#f59e0b', 'completed': '#10b981' };
        return <span style={{backgroundColor: colors[s], color:'white', padding:'2px 8px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'bold'}}>{map[s] || s}</span>;
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h2>Controle de Produção (PCP)</h2>
                        <p>Gerencie ordens de fabricação e custos industriais.</p>
                    </div>
                    <button onClick={() => navigate('/dashboard/pcp/new')} className={styles.btnPrimary}>
                        <Plus size={18}/> Nova Ordem (OP)
                    </button>
                </div>

                {loading ? <p>Carregando...</p> : (
                    <div className={styles.grid}>
                        {orders.map(o => (
                            <div key={o.id} className={styles.card} onClick={() => navigate(`/dashboard/pcp/${o.id}`)}>
                                <div className={styles.cardHeader}>
                                    <span className={styles.osId}>OP #{o.id}</span>
                                    {getStatusBadge(o.status)}
                                </div>
                                <div className={styles.cardBody}>
                                    <h3 className={styles.clientName}>{o.product_name || 'Produto s/ nome'}</h3>
                                    <p className={styles.desc}><strong>Qtd:</strong> {o.quantity} un</p>
                                    <p className={styles.desc}><strong>Custo Unit:</strong> R$ {Number(o.unit_cost).toFixed(2)}</p>
                                    <p className={styles.desc}><strong>Entrega:</strong> {o.due_date ? new Date(o.due_date).toLocaleDateString() : '-'}</p>
                                </div>
                                <div className={styles.cardFooter}>
                                    <div className={styles.meta}><Factory size={14}/> Total: R$ {Number(o.total_cost).toFixed(2)}</div>
                                </div>
                            </div>
                        ))}
                        {orders.length === 0 && <div className={styles.empty}>Nenhuma ordem de produção.</div>}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}