import { useState, useEffect, useContext, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ToastContext } from '../../context/ToastContext';
import { ArrowLeft, Send, User, Clock, CheckCircle } from 'lucide-react';

export default function HelpdeskTicket() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useContext(ToastContext);
  const messagesEndRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
      // 1. Verifica Usuário Local
      const userStr = localStorage.getItem('clientUser');
      if (userStr) setCurrentUser(JSON.parse(userStr));
      
      // 2. Carrega Dados
      loadTicketData();
  }, [id]);

  useEffect(() => {
      scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadTicketData = async () => {
      try {
          // Usa a rota PÚBLICA correta: /tickets/public/ticket/:id
          const res = await api.get(`/tickets/public/ticket/${id}`);
          setTicket(res.data.ticket);
          setMessages(res.data.messages);
      } catch (error) {
          console.error(error);
          addToast({ type: 'error', title: 'Erro', message: 'Não foi possível carregar o ticket.' });
          // Se der 401 ou 403, o api.js já vai redirecionar
      } finally {
          setLoading(false);
      }
  };

  const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!newMessage.trim()) return;
      
      setSending(true);
      try {
          await api.post(`/tickets/public/ticket/${id}/messages`, {
              message: newMessage,
              sender_id: currentUser?.id // Envia ID para garantir
          });
          setNewMessage('');
          loadTicketData(); // Recarrega para ver a msg nova
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao enviar' });
      } finally {
          setSending(false);
      }
  };

  if (loading) return <div style={{padding:'2rem', textAlign:'center', color:'#64748b'}}>Carregando conversa...</div>;
  if (!ticket) return <div style={{padding:'2rem', textAlign:'center'}}>Ticket não encontrado.</div>;

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc', display:'flex', flexDirection:'column'}}>
        {/* Header */}
        <header style={{background:'white', padding:'1rem 2rem', borderBottom:'1px solid #e2e8f0', display:'flex', alignItems:'center', gap:'1rem', position:'sticky', top:0, zIndex:10}}>
            <button onClick={() => navigate('/helpdesk')} style={{background:'none', border:'none', cursor:'pointer', color:'#64748b', display:'flex', alignItems:'center'}}>
                <ArrowLeft size={20}/>
            </button>
            <div style={{flex:1}}>
                <h2 style={{margin:0, fontSize:'1.1rem', color:'#1e293b'}}>#{ticket.id} - {ticket.subject}</h2>
                <div style={{fontSize:'0.85rem', color:'#64748b', display:'flex', gap:'10px', alignItems:'center', marginTop:'4px'}}>
                    <span style={{display:'flex', alignItems:'center', gap:'4px'}}><Clock size={14}/> {new Date(ticket.created_at).toLocaleDateString()}</span>
                    {ticket.status === 'closed' && <span style={{color:'#16a34a', display:'flex', alignItems:'center', gap:'4px', background:'#dcfce7', padding:'2px 8px', borderRadius:'10px'}}><CheckCircle size={14}/> Resolvido</span>}
                </div>
            </div>
        </header>

        {/* Chat Area */}
        <div style={{flex:1, padding:'2rem', maxWidth:'800px', margin:'0 auto', width:'100%', overflowY:'auto'}}>
            {messages.map((msg, idx) => {
                // Se o sender_type for 'support_user', é o cliente (eu). Se for 'agent'/'admin', é o suporte.
                const isMe = msg.sender_type === 'support_user';
                
                return (
                    <div key={idx} style={{
                        display:'flex', 
                        justifyContent: isMe ? 'flex-end' : 'flex-start',
                        marginBottom:'1.5rem'
                    }}>
                        <div style={{maxWidth:'70%', display:'flex', flexDirection:'column', alignItems: isMe ? 'flex-end' : 'flex-start'}}>
                            <div style={{
                                background: isMe ? '#3b82f6' : 'white',
                                color: isMe ? 'white' : '#334155',
                                padding:'1rem',
                                borderRadius: isMe ? '12px 12px 0 12px' : '12px 12px 12px 0',
                                boxShadow: isMe ? 'none' : '0 1px 2px rgba(0,0,0,0.1)',
                                border: isMe ? 'none' : '1px solid #e2e8f0',
                                fontSize:'0.95rem',
                                lineHeight:'1.5'
                            }}>
                                {msg.message}
                            </div>
                            <span style={{fontSize:'0.75rem', color:'#94a3b8', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                                {!isMe && <User size={12}/>} 
                                {isMe ? 'Você' : (msg.sender_name || 'Suporte')} • {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{background:'white', padding:'1.5rem', borderTop:'1px solid #e2e8f0'}}>
            <form onSubmit={handleSendMessage} style={{maxWidth:'800px', margin:'0 auto', display:'flex', gap:'10px'}}>
                <input 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Escreva uma resposta..."
                    disabled={sending || ticket.status === 'closed'}
                    style={{flex:1, padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1', outline:'none'}}
                />
                <button 
                    type="submit" 
                    disabled={sending || !newMessage.trim() || ticket.status === 'closed'}
                    style={{
                        background: sending ? '#94a3b8' : '#3b82f6', color:'white', border:'none', 
                        padding:'0 20px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontWeight:'600'
                    }}
                >
                    <Send size={18}/> {sending ? '...' : 'Enviar'}
                </button>
            </form>
        </div>
    </div>
  );
}