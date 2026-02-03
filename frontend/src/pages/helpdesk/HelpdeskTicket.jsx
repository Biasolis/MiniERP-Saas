import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ArrowLeft, Send, User, Clock, CheckCircle } from 'lucide-react';

export default function HelpdeskTicket() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verifica token
    const token = localStorage.getItem('helpdesk_token');
    if(!token) navigate(`/helpdesk/${slug}`);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

    loadTicket();
  }, [id]);

  const loadTicket = async () => {
    try {
        const res = await api.get(`/tickets/${id}`);
        setTicket(res.data.ticket);
        setMessages(res.data.messages);
    } catch (error) {
        alert('Erro ao carregar ticket');
        navigate(`/helpdesk/${slug}/panel`);
    } finally {
        setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if(!reply.trim()) return;

    try {
        await api.post(`/tickets/${id}/messages`, { message: reply });
        setReply('');
        loadTicket(); // Recarrega mensagens
    } catch (error) {
        alert('Erro ao enviar mensagem');
    }
  };

  if (loading) return <div style={{padding:'40px', textAlign:'center'}}>Carregando conversa...</div>;

  return (
    <div style={{minHeight:'100vh', background:'#f1f5f9', display:'flex', flexDirection:'column'}}>
        
        {/* HEADER */}
        <header style={{background:'white', padding:'15px 20px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', display:'flex', alignItems:'center', gap:'15px'}}>
            <button onClick={() => navigate(`/helpdesk/${slug}/panel`)} style={{border:'none', background:'none', cursor:'pointer', color:'#64748b'}}>
                <ArrowLeft size={24}/>
            </button>
            <div>
                <h2 style={{fontSize:'1.1rem', margin:0, color:'#1e293b'}}>#{ticket.ticket_number} - {ticket.subject}</h2>
                <span style={{fontSize:'0.8rem', color: ticket.status === 'resolved' ? '#10b981' : '#3b82f6', fontWeight:'bold', textTransform:'uppercase'}}>
                    {ticket.status === 'open' ? 'Aberto' : ticket.status === 'resolved' ? 'Resolvido' : 'Em Andamento'}
                </span>
            </div>
        </header>

        {/* CONTEÚDO */}
        <div style={{flex:1, maxWidth:'800px', width:'100%', margin:'0 auto', padding:'20px', display:'flex', flexDirection:'column'}}>
            
            {/* Descrição Original */}
            <div style={{background:'white', padding:'20px', borderRadius:'12px', marginBottom:'20px', boxShadow:'0 2px 4px rgba(0,0,0,0.05)'}}>
                <strong style={{display:'block', color:'#64748b', fontSize:'0.8rem', marginBottom:'5px'}}>DESCRIÇÃO DO PROBLEMA</strong>
                <p style={{color:'#334155', whiteSpace:'pre-wrap'}}>{ticket.description}</p>
                <div style={{marginTop:'10px', fontSize:'0.75rem', color:'#94a3b8', display:'flex', alignItems:'center', gap:'5px'}}>
                    <Clock size={14}/> {new Date(ticket.created_at).toLocaleString()}
                </div>
            </div>

            {/* Lista de Mensagens */}
            <div style={{flex:1, display:'flex', flexDirection:'column', gap:'15px', marginBottom:'20px'}}>
                {messages.map(msg => {
                    const isMe = msg.sender_type === 'support_user'; // Sou eu (cliente)?
                    return (
                        <div key={msg.id} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '80%',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{
                                background: isMe ? '#3b82f6' : 'white',
                                color: isMe ? 'white' : '#1e293b',
                                padding: '12px 16px',
                                borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                border: isMe ? 'none' : '1px solid #e2e8f0'
                            }}>
                                {msg.message}
                            </div>
                            <span style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'4px'}}>
                                {isMe ? 'Você' : msg.sender_name || 'Agente'} • {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Input de Resposta */}
            {ticket.status !== 'closed' && (
                <form onSubmit={handleSend} style={{background:'white', padding:'15px', borderRadius:'12px', boxShadow:'0 -2px 10px rgba(0,0,0,0.05)', display:'flex', gap:'10px'}}>
                    <textarea 
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder="Digite sua resposta..."
                        style={{flex:1, border:'1px solid #e2e8f0', borderRadius:'8px', padding:'10px', resize:'none', height:'50px', fontFamily:'inherit'}}
                    />
                    <button type="submit" style={{background:'#3b82f6', color:'white', border:'none', borderRadius:'8px', width:'50px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <Send size={20}/>
                    </button>
                </form>
            )}
        </div>
    </div>
  );
}