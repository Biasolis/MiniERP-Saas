import { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api';
import { MessageSquare, CheckCircle, Clock, AlertCircle } from 'lucide-react';

export default function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  
  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const res = await api.get('/tickets');
    setTickets(res.data);
  };

  const handleSelect = async (ticket) => {
    const res = await api.get(`/tickets/${ticket.id}`);
    setSelectedTicket(res.data);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if(!newMessage.trim()) return;
    await api.post(`/tickets/${selectedTicket.ticket.id}/messages`, { message: newMessage });
    setNewMessage('');
    handleSelect(selectedTicket.ticket); // Reload messages
  };

  const changeStatus = async (status) => {
      await api.patch(`/tickets/${selectedTicket.ticket.id}/status`, { status });
      loadTickets();
      setSelectedTicket(prev => ({ ...prev, ticket: { ...prev.ticket, status } }));
  };

  return (
    <DashboardLayout>
      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px', height:'calc(100vh - 100px)'}}>
        
        {/* LISTA DE TICKETS */}
        <div style={{background:'white', borderRadius:'12px', overflowY:'auto', border:'1px solid #e5e7eb'}}>
            <div style={{padding:'15px', borderBottom:'1px solid #eee'}}>
                <h3>Fila de Atendimento</h3>
            </div>
            {tickets.map(t => (
                <div key={t.id} onClick={() => handleSelect(t)} style={{padding:'15px', borderBottom:'1px solid #f9fafb', cursor:'pointer', background: selectedTicket?.ticket?.id === t.id ? '#f0f9ff' : 'white'}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                        <strong>#{t.ticket_number} {t.subject}</strong>
                        <span style={statusBadge(t.status)}>{t.status}</span>
                    </div>
                    <p style={{fontSize:'0.85rem', color:'#666', margin:'5px 0'}}>{t.requester_name}</p>
                    <div style={{fontSize:'0.75rem', color:'#999'}}>{t.category_name}</div>
                </div>
            ))}
        </div>

        {/* DETALHES E CHAT */}
        <div style={{background:'white', borderRadius:'12px', display:'flex', flexDirection:'column', border:'1px solid #e5e7eb'}}>
            {selectedTicket ? (
                <>
                    <div style={{padding:'20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <div>
                            <h2>{selectedTicket.ticket.subject}</h2>
                            <p style={{color:'#666'}}>{selectedTicket.ticket.requester_name} - {selectedTicket.ticket.requester_type}</p>
                        </div>
                        <div style={{display:'flex', gap:'10px'}}>
                            <button onClick={() => changeStatus('in_progress')} style={btnAction('#3b82f6')}>Assumir</button>
                            <button onClick={() => changeStatus('resolved')} style={btnAction('#10b981')}>Resolver</button>
                        </div>
                    </div>

                    <div style={{flex:1, overflowY:'auto', padding:'20px', background:'#f8fafc'}}>
                        {/* Descrição Original */}
                        <div style={{background:'white', padding:'15px', borderRadius:'8px', marginBottom:'20px', border:'1px solid #e2e8f0'}}>
                            <strong style={{display:'block', marginBottom:'5px', color:'#334155'}}>Descrição do Problema:</strong>
                            {selectedTicket.ticket.description}
                        </div>

                        {/* Mensagens */}
                        {selectedTicket.messages.map(m => (
                            <div key={m.id} style={{
                                display:'flex', flexDirection:'column', 
                                alignItems: m.sender_type === 'agent' || m.sender_type === 'user' ? 'flex-end' : 'flex-start',
                                marginBottom:'15px'
                            }}>
                                <div style={{
                                    maxWidth:'70%', padding:'10px 15px', borderRadius:'12px',
                                    background: m.sender_type === 'agent' || m.sender_type === 'user' ? '#dbeafe' : 'white',
                                    border: m.sender_type !== 'agent' ? '1px solid #e2e8f0' : 'none',
                                    color: '#1e293b'
                                }}>
                                    {m.message}
                                </div>
                                <small style={{color:'#94a3b8', fontSize:'0.75rem', marginTop:'2px'}}>
                                    {m.sender_name} • {new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                    {m.is_internal_note && <span style={{color:'#f59e0b', marginLeft:'5px'}}>(Nota Interna)</span>}
                                </small>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleSend} style={{padding:'20px', borderTop:'1px solid #eee', background:'white'}}>
                        <textarea 
                            value={newMessage} onChange={e => setNewMessage(e.target.value)}
                            placeholder="Escreva uma resposta..."
                            style={{width:'100%', height:'80px', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', resize:'none'}}
                        />
                        <div style={{display:'flex', justifyContent:'flex-end', marginTop:'10px'}}>
                            <button type="submit" style={{background:'#4f46e5', color:'white', padding:'8px 20px', borderRadius:'6px', border:'none', cursor:'pointer', fontWeight:'bold'}}>Enviar</button>
                        </div>
                    </form>
                </>
            ) : (
                <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#94a3b8'}}>
                    Selecione um ticket para visualizar
                </div>
            )}
        </div>

      </div>
    </DashboardLayout>
  );
}

const statusBadge = (status) => {
    const colors = { open: '#ef4444', in_progress: '#3b82f6', resolved: '#10b981', closed: '#64748b' };
    return { background: colors[status] || '#ccc', color:'white', padding:'2px 8px', borderRadius:'10px', fontSize:'0.7rem', textTransform:'uppercase' };
};
const btnAction = (bg) => ({ background: bg, color:'white', border:'none', padding:'8px 12px', borderRadius:'6px', cursor:'pointer', fontSize:'0.85rem' });