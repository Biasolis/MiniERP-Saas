import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api'; // O api.js já injeta o token automaticamente
import { ToastContext } from '../../context/ToastContext';
import { ArrowLeft, Send, Clock, User, CheckCircle } from 'lucide-react';

export default function EmployeeTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useContext(ToastContext);
  const messagesEndRef = useRef(null);
  
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    // 1. Validação de Token (CORREÇÃO DE CHAVE)
    const token = localStorage.getItem('employeeToken');
    if(!token) {
        navigate('/portal/login');
        return;
    }

    loadTicket();
  }, [id]);

  useEffect(() => {
      scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadTicket = async () => {
    try {
        // CORREÇÃO DE ROTA: Usa /portal/tickets/ID
        const res = await api.get(`/portal/tickets/${id}`);
        setTicket(res.data.ticket);
        setMessages(res.data.messages);
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Erro', message: 'Erro ao carregar ticket.' });
        navigate('/portal');
    } finally {
        setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if(!reply.trim()) return;

    setSending(true);
    try {
        // CORREÇÃO DE ROTA: Usa /portal/tickets/ID/messages
        await api.post(`/portal/tickets/${id}/messages`, { message: reply });
        setReply('');
        loadTicket(); // Recarrega para ver a nova mensagem
    } catch (error) {
        addToast({ type: 'error', title: 'Erro', message: 'Erro ao enviar mensagem.' });
    } finally {
        setSending(false);
    }
  };

  if (loading) return <div style={{padding:'40px', textAlign:'center', color:'#64748b'}}>Carregando detalhes...</div>;
  if (!ticket) return null;

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc', display:'flex', flexDirection:'column'}}>
        {/* Header */}
        <header style={{background:'white', padding:'15px 20px', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:'15px', position:'sticky', top:0, zIndex:10}}>
            <button onClick={() => navigate('/portal')} style={{border:'none', background:'none', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center'}}>
                <ArrowLeft size={24}/>
            </button>
            <div style={{flex:1}}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                    <h2 style={{fontSize:'1.1rem', margin:0, color:'#1e293b'}}>#{ticket.id} - {ticket.subject || ticket.title}</h2>
                    <span style={{
                        fontSize:'0.75rem', fontWeight:'bold', textTransform:'uppercase', padding:'2px 8px', borderRadius:'6px',
                        background: ticket.status === 'resolved' || ticket.status === 'closed' ? '#dcfce7' : '#e0f2fe',
                        color: ticket.status === 'resolved' || ticket.status === 'closed' ? '#166534' : '#0369a1'
                    }}>
                        {ticket.status === 'open' ? 'Aberto' : ticket.status === 'closed' ? 'Concluído' : 'Em Andamento'}
                    </span>
                </div>
                <div style={{marginTop:'5px', fontSize:'0.8rem', color:'#64748b', display:'flex', alignItems:'center', gap:'5px'}}>
                    <Clock size={14}/> Aberto em {new Date(ticket.created_at).toLocaleDateString()} às {new Date(ticket.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                </div>
            </div>
        </header>

        {/* Chat Container */}
        <div style={{flex:1, maxWidth:'800px', width:'100%', margin:'0 auto', padding:'20px', display:'flex', flexDirection:'column', overflowY:'auto'}}>
            
            {/* Descrição Inicial */}
            <div style={{background:'white', padding:'20px', borderRadius:'12px', marginBottom:'20px', boxShadow:'0 1px 2px rgba(0,0,0,0.05)', border:'1px solid #e2e8f0'}}>
                <strong style={{display:'block', color:'#64748b', fontSize:'0.75rem', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'0.5px'}}>Descrição do Problema</strong>
                <p style={{color:'#334155', whiteSpace:'pre-wrap', lineHeight:'1.6', margin:0}}>{ticket.description}</p>
            </div>

            {/* Mensagens */}
            <div style={{flex:1, display:'flex', flexDirection:'column', gap:'15px', paddingBottom:'20px'}}>
                {messages.map((msg, idx) => {
                    // Identifica se a mensagem é do próprio colaborador
                    // O backend pode retornar 'employee', 'support_user' ou ID. 
                    // Assumimos aqui que se não for 'agent' ou 'admin', é o usuário.
                    const isMe = msg.sender_type === 'employee' || msg.sender_type === 'support_user'; 
                    
                    return (
                        <div key={idx} style={{
                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                            maxWidth: '85%',
                            display: 'flex', flexDirection: 'column',
                            alignItems: isMe ? 'flex-end' : 'flex-start'
                        }}>
                            <div style={{
                                background: isMe ? '#3b82f6' : 'white',
                                color: isMe ? 'white' : '#1e293b',
                                padding: '12px 16px',
                                borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                boxShadow: isMe ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
                                border: isMe ? 'none' : '1px solid #e2e8f0',
                                lineHeight: '1.5'
                            }}>
                                {msg.message}
                            </div>
                            <span style={{fontSize:'0.7rem', color:'#94a3b8', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                                {!isMe && <User size={12}/>}
                                {isMe ? 'Você' : (msg.sender_name || 'Suporte')} • {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input Area */}
        {ticket.status !== 'closed' && (
            <div style={{background:'white', borderTop:'1px solid #e2e8f0', padding:'20px'}}>
                <form onSubmit={handleSend} style={{maxWidth:'800px', margin:'0 auto', display:'flex', gap:'10px'}}>
                    <input 
                        value={reply}
                        onChange={e => setReply(e.target.value)}
                        placeholder="Digite sua resposta..."
                        disabled={sending}
                        style={{flex:1, border:'1px solid #cbd5e1', borderRadius:'8px', padding:'12px', outline:'none', fontSize:'0.95rem'}}
                    />
                    <button type="submit" disabled={sending || !reply.trim()} style={{background:'#3b82f6', color:'white', border:'none', borderRadius:'8px', padding:'0 20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight:'600', opacity: sending ? 0.7 : 1}}>
                        <Send size={18}/> {sending ? 'Enviando' : 'Enviar'}
                    </button>
                </form>
            </div>
        )}
    </div>
  );
}