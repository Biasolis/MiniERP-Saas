import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { ToastContext } from '../../context/ToastContext';
import { Plus, MessageSquare, Clock, CheckCircle, LogOut, Search } from 'lucide-react';
import Modal from '../../components/ui/Modal';

export default function HelpdeskPanel() {
  const navigate = useNavigate();
  const { addToast } = useContext(ToastContext);
  
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]); // Nova State
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium', category_id: '' });

  useEffect(() => {
    const token = localStorage.getItem('clientToken');
    const userData = localStorage.getItem('clientUser');

    if (!token || !userData) {
        navigate('/helpdesk/login');
        return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    loadTickets(parsedUser.id);
    loadCategories(parsedUser.tenant_id); // Carrega categorias
  }, []);

  const loadTickets = async (clientId) => {
    try {
        const res = await api.get(`/tickets/public/list/${clientId}`);
        setTickets(res.data);
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Erro ao carregar chamados' });
    } finally {
        setLoading(false);
    }
  };

  const loadCategories = async (tenantId) => {
      if(!tenantId) return;
      try {
          const res = await api.get(`/tickets/public/categories/${tenantId}`);
          setCategories(res.data);
      } catch (error) {
          console.error("Erro ao carregar categorias", error);
      }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
        if (!user) return;

        if (!newTicket.category_id) {
            addToast({ type: 'warning', title: 'Selecione uma categoria' });
            return;
        }

        await api.post('/tickets/public/create', {
            tenant_id: user.tenant_id,
            client_id: user.id,
            subject: newTicket.subject,
            description: newTicket.description,
            priority: newTicket.priority,
            category_id: newTicket.category_id || null // Envia categoria
        });

        addToast({ type: 'success', title: 'Chamado aberto com sucesso!' });
        setIsModalOpen(false);
        setNewTicket({ subject: '', description: '', priority: 'medium', category_id: '' });
        loadTickets(user.id);

    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao abrir chamado' });
    }
  };

  const handleLogout = () => {
      localStorage.removeItem('clientToken');
      localStorage.removeItem('clientUser');
      navigate('/helpdesk/login');
  };

  // --- CORREÇÃO DE STATUS ---
  const getStatusBadge = (status) => {
      // Normaliza para lowercase para evitar erros de case sensitive
      const normalizedStatus = status ? status.toLowerCase() : 'open';

      const styles = {
          'open': { bg: '#dbeafe', color: '#1d4ed8', label: 'Aberto' },
          'pending': { bg: '#fef3c7', color: '#d97706', label: 'Em Andamento' },
          'in_progress': { bg: '#fef3c7', color: '#d97706', label: 'Em Andamento' }, // Alias
          'waiting': { bg: '#f3e8ff', color: '#7e22ce', label: 'Aguardando' },
          'resolved': { bg: '#dcfce7', color: '#15803d', label: 'Resolvido' },
          'solved': { bg: '#dcfce7', color: '#15803d', label: 'Resolvido' }, // Alias
          'closed': { bg: '#f1f5f9', color: '#475569', label: 'Fechado' }
      };

      const s = styles[normalizedStatus] || styles.open;
      
      return (
        <span style={{
            background: s.bg, 
            color: s.color, 
            padding:'4px 10px', 
            borderRadius:'12px', 
            fontSize:'0.75rem', 
            fontWeight:'700',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
        }}>
            {s.label}
        </span>
      );
  };

  if (!user) return null;

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc', fontFamily:'Inter, sans-serif'}}>
        {/* NAVBAR */}
        <nav style={{background:'white', borderBottom:'1px solid #e2e8f0', padding:'1rem 2rem', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:10}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <div style={{width:32, height:32, background:'#eff6ff', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>
                    <MessageSquare size={20} color="#3b82f6" />
                </div>
                <h2 style={{margin:0, color:'#1e293b', fontSize:'1.2rem'}}>Central de Suporte</h2>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                <span style={{color:'#64748b', fontSize:'0.9rem'}}>Olá, <strong style={{color:'#334155'}}>{user.name}</strong></span>
                <button onClick={handleLogout} style={{border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontSize:'0.9rem', fontWeight:500}}>
                    <LogOut size={16}/> Sair
                </button>
            </div>
        </nav>

        {/* CONTEÚDO */}
        <div style={{maxWidth:'1000px', margin:'2rem auto', padding:'0 1rem'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem'}}>
                <div>
                    <h1 style={{fontSize:'1.8rem', color:'#1e293b', margin:'0 0 5px 0'}}>Meus Chamados</h1>
                    <p style={{margin:0, color:'#64748b', fontSize:'0.9rem'}}>Acompanhe o status das suas solicitações</p>
                </div>
                <button onClick={() => setIsModalOpen(true)} style={{background:'#3b82f6', color:'white', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontWeight:'600', transition:'background 0.2s', boxShadow:'0 2px 4px rgba(59, 130, 246, 0.3)'}}>
                    <Plus size={20}/> Novo Chamado
                </button>
            </div>

            {loading ? <div style={{textAlign:'center', padding:'40px', color:'#94a3b8'}}>Carregando...</div> : (
                <div style={{background:'white', borderRadius:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', border:'1px solid #e2e8f0', overflow:'hidden'}}>
                    {tickets.length === 0 ? (
                        <div style={{padding:'4rem 2rem', textAlign:'center', color:'#94a3b8'}}>
                            <div style={{background:'#f8fafc', width:80, height:80, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem auto'}}>
                                <MessageSquare size={40} style={{opacity:0.3}}/>
                            </div>
                            <h3 style={{color:'#475569', margin:'0 0 5px 0'}}>Nenhum chamado encontrado</h3>
                            <p style={{margin:0, fontSize:'0.9rem'}}>Precisa de ajuda? Clique no botão acima para abrir um novo ticket.</p>
                        </div>
                    ) : (
                        <table style={{width:'100%', borderCollapse:'collapse'}}>
                            <thead style={{background:'#f8fafc', borderBottom:'1px solid #e2e8f0'}}>
                                <tr style={{textAlign:'left', color:'#64748b', fontSize:'0.8rem', textTransform:'uppercase', letterSpacing:'0.5px'}}>
                                    <th style={{padding:'12px 20px'}}>Assunto</th>
                                    <th style={{padding:'12px 20px'}}>Categoria</th>
                                    <th style={{padding:'12px 20px'}}>Status</th>
                                    <th style={{padding:'12px 20px'}}>Data Criação</th>
                                    <th style={{padding:'12px 20px'}}>Última Atualização</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map(ticket => (
                                    <tr key={ticket.id} onClick={() => navigate(`/helpdesk/ticket/${ticket.id}`)} style={{borderBottom:'1px solid #f1f5f9', cursor:'pointer', transition:'background 0.1s'}} onMouseOver={e => e.currentTarget.style.background = '#f8fafc'} onMouseOut={e => e.currentTarget.style.background = 'white'}>
                                        <td style={{padding:'16px 20px'}}>
                                            <div style={{fontWeight:'600', color:'#334155'}}>{ticket.subject}</div>
                                            <div style={{fontSize:'0.8rem', color:'#94a3b8', marginTop:2}}>#{ticket.ticket_code || ticket.id.substring(0,8)}</div>
                                        </td>
                                        <td style={{padding:'16px 20px', color:'#64748b', fontSize:'0.9rem'}}>
                                            {ticket.category_name || '-'}
                                        </td>
                                        <td style={{padding:'16px 20px'}}>{getStatusBadge(ticket.status)}</td>
                                        <td style={{padding:'16px 20px', color:'#64748b', fontSize:'0.9rem'}}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                                        <td style={{padding:'16px 20px', color:'#64748b', fontSize:'0.9rem'}}>{new Date(ticket.updated_at || ticket.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>

        {/* MODAL */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Abrir Novo Chamado">
            <form onSubmit={handleCreateTicket} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                <div>
                    <label style={{display:'block', marginBottom:'6px', fontWeight:'500', fontSize:'0.9rem', color:'#334155'}}>Assunto</label>
                    <input 
                        required 
                        value={newTicket.subject} 
                        onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                        placeholder="Ex: Erro ao emitir nota fiscal"
                        style={{width:'100%', padding:'10px 12px', borderRadius:'6px', border:'1px solid #cbd5e1', fontSize:'0.95rem'}}
                    />
                </div>
                
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                    <div>
                        <label style={{display:'block', marginBottom:'6px', fontWeight:'500', fontSize:'0.9rem', color:'#334155'}}>Categoria</label>
                        <select 
                            required
                            value={newTicket.category_id} 
                            onChange={e => setNewTicket({...newTicket, category_id: e.target.value})}
                            style={{width:'100%', padding:'10px 12px', borderRadius:'6px', border:'1px solid #cbd5e1', background:'white', fontSize:'0.95rem'}}
                        >
                            <option value="">Selecione...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{display:'block', marginBottom:'6px', fontWeight:'500', fontSize:'0.9rem', color:'#334155'}}>Prioridade</label>
                        <select 
                            value={newTicket.priority} 
                            onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                            style={{width:'100%', padding:'10px 12px', borderRadius:'6px', border:'1px solid #cbd5e1', background:'white', fontSize:'0.95rem'}}
                        >
                            <option value="low">Baixa (Pode esperar)</option>
                            <option value="medium">Média (Normal)</option>
                            <option value="high">Alta (Urgente)</option>
                            <option value="urgent">Crítica (Sistema parado)</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label style={{display:'block', marginBottom:'6px', fontWeight:'500', fontSize:'0.9rem', color:'#334155'}}>Descrição Detalhada</label>
                    <textarea 
                        required 
                        rows="5"
                        value={newTicket.description} 
                        onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                        placeholder="Descreva o problema com o máximo de detalhes possível..."
                        style={{width:'100%', padding:'10px 12px', borderRadius:'6px', border:'1px solid #cbd5e1', resize:'vertical', fontSize:'0.95rem', fontFamily:'inherit'}}
                    />
                </div>
                
                <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'15px', borderTop:'1px solid #f1f5f9', paddingTop:'15px'}}>
                    <button type="button" onClick={() => setIsModalOpen(false)} style={{padding:'10px 20px', borderRadius:'6px', border:'1px solid #e2e8f0', background:'white', color:'#475569', cursor:'pointer', fontWeight:500}}>Cancelar</button>
                    <button type="submit" style={{padding:'10px 20px', borderRadius:'6px', border:'none', background:'#3b82f6', color:'white', fontWeight:'600', cursor:'pointer', boxShadow:'0 2px 4px rgba(59, 130, 246, 0.3)'}}>Enviar Chamado</button>
                </div>
            </form>
        </Modal>
    </div>
  );
}