import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import { Clock } from 'lucide-react';

export default function PosHistory() {
    const { addToast } = useContext(ToastContext);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/pos/history')
           .then(res => setHistory(res.data))
           .catch(e => console.error(e)) 
           .finally(() => setLoading(false));
    }, []);

    const fmt = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const fmtDate = (d) => new Date(d).toLocaleString('pt-BR');

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={28} /> Histórico de Caixas
                </h2>
                {loading ? <p>Carregando...</p> : (
                    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Abertura</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Fechamento</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Operador</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>Fundo</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>Fechamento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map(session => (
                                    <tr key={session.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '15px' }}>{fmtDate(session.opened_at)}</td>
                                        <td style={{ padding: '15px' }}>{session.closed_at ? fmtDate(session.closed_at) : 'Aberto'}</td>
                                        <td style={{ padding: '15px' }}>{session.user_name}</td>
                                        <td style={{ padding: '15px', textAlign: 'right' }}>{fmt(session.opening_balance)}</td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold' }}>{session.closing_balance ? fmt(session.closing_balance) : '-'}</td>
                                    </tr>
                                ))}
                                {history.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Nenhum histórico.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}