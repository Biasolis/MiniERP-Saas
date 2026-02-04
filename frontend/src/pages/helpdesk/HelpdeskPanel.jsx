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
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Novo Ticket Form
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', priority: 'medium' });

  useEffect(() => {
    // 1. Verifica Autenticação do Cliente
    const token = localStorage.getItem('clientToken');
    const userData = localStorage.getItem('clientUser');

    if (!token || !userData) {
        navigate('/helpdesk/login');
        return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    // 2. Carrega Tickets
    loadTickets(parsedUser.id);
  }, []);

  const loadTickets = async (clientId) => {
    try {
        // Usa a rota pública de listagem
        const res = await api.get(`/tickets/public/list/${clientId}`);
        setTickets(res.data);
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Erro ao carregar chamados' });
    } finally {
        setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    try {
        if (!user) return;

        // Recupera configuração do tenant (opcional, ou manda fixo se seu sistema for multi-tenant pelo subdominio)
        // Aqui assumimos que o user já tem o tenant_id vinculado no backend
        await api.post('/tickets/public/create', {
            tenant_id: user.tenant_id || 1, // Fallback se não vier no login
            client_id: user.id,
            subject: newTicket.subject,
            description: newTicket.description,
            priority: newTicket.priority
        });

        addToast({ type: 'success', title: 'Chamado aberto com sucesso!' });
        setIsModalOpen(false);
        setNewTicket({ subject: '', description: '', priority: 'medium' });
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

  const getStatusBadge = (status) => {
      const styles = {
          open: { bg: '#dbeafe', color: '#1d4ed8', label: 'Aberto' },
          pending: { bg: '#fef3c7', color: '#d97706', label: 'Em Andamento' },
          closed: { bg: '#dcfce7', color: '#15803d', label: 'Resolvido' }
      };
      const s = styles[status] || styles.open;
      return <span style={{background: s.bg, color: s.color, padding:'4px 10px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'600'}}>{s.label}</span>;
  };

  if (!user) return null;

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc'}}>
        {/* Navbar */}
        <nav style={{background:'white', borderBottom:'1px solid #e2e8f0', padding:'1rem 2rem', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <h2 style={{margin:0, color:'#3b82f6'}}>Central de Suporte</h2>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
                <span style={{color:'#64748b'}}>Olá, <strong>{user.name}</strong></span>
                <button onClick={handleLogout} style={{border:'none', background:'transparent', color:'#ef4444', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}>
                    <LogOut size={18}/> Sair
                </button>
            </div>
        </nav>

        {/* Conteúdo */}
        <div style={{maxWidth:'1000px', margin:'2rem auto', padding:'0 1rem'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem'}}>
                <h1 style={{fontSize:'1.8rem', color:'#1e293b', margin:0}}>Meus Chamados</h1>
                <button onClick={() => setIsModalOpen(true)} style={{background:'#3b82f6', color:'white', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontWeight:'600'}}>
                    <Plus size={20}/> Novo Chamado
                </button>
            </div>

            {loading ? <p>Carregando...</p> : (
                <div style={{background:'white', borderRadius:'12px', boxShadow:'0 1px 3px rgba(0,0,0,0.1)', overflow:'hidden'}}>
                    {tickets.length === 0 ? (
                        <div style={{padding:'3rem', textAlign:'center', color:'#94a3b8'}}>
                            <MessageSquare size={48} style={{opacity:0.2, marginBottom:'1rem'}}/>
                            <p>Você ainda não abriu nenhum chamado.</p>
                        </div>
                    ) : (
                        <table style={{width:'100%', borderCollapse:'collapse'}}>
                            <thead style={{background:'#f1f5f9'}}>
                                <tr style={{textAlign:'left', color:'#64748b', fontSize:'0.9rem'}}>
                                    <th style={{padding:'1rem'}}>Assunto</th>
                                    <th style={{padding:'1rem'}}>Status</th>
                                    <th style={{padding:'1rem'}}>Data</th>
                                    <th style={{padding:'1rem'}}>Última Atualização</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map(ticket => (
                                    <tr key={ticket.id} onClick={() => navigate(`/helpdesk/ticket/${ticket.id}`)} style={{borderBottom:'1px solid #f1f5f9', cursor:'pointer', transition:'background 0.1s'}}>
                                        <td style={{padding:'1rem', fontWeight:'500', color:'#334155'}}>{ticket.subject}</td>
                                        <td style={{padding:'1rem'}}>{getStatusBadge(ticket.status)}</td>
                                        <td style={{padding:'1rem', color:'#64748b', fontSize:'0.9rem'}}>{new Date(ticket.created_at).toLocaleDateString()}</td>
                                        <td style={{padding:'1rem', color:'#64748b', fontSize:'0.9rem'}}>{new Date(ticket.updated_at || ticket.created_at).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>

        {/* Modal Novo Ticket */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Abrir Novo Chamado">
            <form onSubmit={handleCreateTicket} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                <div>
                    <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Assunto</label>
                    <input 
                        required 
                        value={newTicket.subject} 
                        onChange={e => setNewTicket({...newTicket, subject: e.target.value})}
                        placeholder="Resumo do problema"
                        style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1'}}
                    />
                </div>
                <div>
                    <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Prioridade</label>
                    <select 
                        value={newTicket.priority} 
                        onChange={e => setNewTicket({...newTicket, priority: e.target.value})}
                        style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1'}}
                    >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                        <option value="urgent">Urgente</option>
                    </select>
                </div>
                <div>
                    <label style={{display:'block', marginBottom:'5px', fontWeight:'500'}}>Descrição Detalhada</label>
                    <textarea 
                        required 
                        rows="5"
                        value={newTicket.description} 
                        onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                        placeholder="Descreva o que aconteceu..."
                        style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', resize:'vertical'}}
                    />
                </div>
                <div style={{display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'10px'}}>
                    <button type="button" onClick={() => setIsModalOpen(false)} style={{padding:'10px 20px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', cursor:'pointer'}}>Cancelar</button>
                    <button type="submit" style={{padding:'10px 20px', borderRadius:'8px', border:'none', background:'#3b82f6', color:'white', fontWeight:'600', cursor:'pointer'}}>Enviar Chamado</button>
                </div>
            </form>
        </Modal>
    </div>
  );
}