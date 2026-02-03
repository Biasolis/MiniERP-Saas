import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Plus, LogOut, MessageSquare } from 'lucide-react';

export default function HelpdeskPanel() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', description: '', category_id: '' });

  useEffect(() => {
    const token = localStorage.getItem('helpdesk_token');
    if(!token) navigate(`/helpdesk/${slug}`);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    loadData();
  }, []);

  const loadData = async () => {
    try {
        const [tRes, cRes] = await Promise.all([
            api.get('/tickets'),
            api.get('/tickets/public/categories?slug=' + slug)
        ]);
        setTickets(tRes.data);
        setCategories(cRes.data);
    } catch(e) {
        console.error(e);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/tickets', newTicket);
    setShowForm(false);
    setNewTicket({ subject: '', description: '', category_id: '' });
    loadData();
  };

  const logout = () => {
      localStorage.removeItem('helpdesk_token');
      navigate(`/helpdesk/${slug}`);
  };

  // Função para abrir o ticket
  const openTicket = (id) => {
      navigate(`/helpdesk/${slug}/ticket/${id}`);
  };

  return (
    <div style={{minHeight:'100vh', background:'#f1f5f9'}}>
        <header style={{background:'white', padding:'15px 40px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h2 style={{color:'#1e293b'}}>Central de Ajuda</h2>
            <button onClick={logout} style={{background:'none', border:'none', cursor:'pointer', color:'#ef4444', display:'flex', alignItems:'center', gap:'5px', fontWeight:'600'}}>
                <LogOut size={18}/> Sair
            </button>
        </header>

        <div style={{maxWidth:'1000px', margin:'40px auto', padding:'0 20px'}}>
            <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
                <h3 style={{color:'#334155'}}>Meus Chamados</h3>
                <button onClick={() => setShowForm(!showForm)} style={{background:'#2563eb', color:'white', padding:'10px 20px', borderRadius:'8px', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontWeight:'bold'}}>
                    <Plus size={18}/> Novo Chamado
                </button>
            </div>

            {showForm && (
                <div style={{background:'white', padding:'25px', borderRadius:'12px', marginBottom:'25px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>
                    <form onSubmit={handleCreate} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        <input placeholder="Assunto (Ex: Erro no Login)" value={newTicket.subject} onChange={e => setNewTicket({...newTicket, subject: e.target.value})} style={input} required />
                        <select value={newTicket.category_id} onChange={e => setNewTicket({...newTicket, category_id: e.target.value})} style={input} required>
                            <option value="">Selecione o Serviço...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <textarea placeholder="Descreva detalhadamente o que aconteceu..." value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} style={{...input, height:'100px'}} required />
                        <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                            <button type="button" onClick={() => setShowForm(false)} style={{padding:'10px 20px', borderRadius:'8px', border:'1px solid #ddd', background:'white', cursor:'pointer'}}>Cancelar</button>
                            <button type="submit" style={{background:'#10b981', color:'white', padding:'10px 20px', borderRadius:'8px', border:'none', cursor:'pointer', fontWeight:'bold'}}>Abrir Chamado</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                {tickets.length === 0 && <p style={{textAlign:'center', color:'#999'}}>Você ainda não tem chamados.</p>}
                
                {tickets.map(t => (
                    <div 
                        key={t.id} 
                        onClick={() => openTicket(t.id)} // CLIQUE AQUI
                        style={{
                            background:'white', padding:'20px', borderRadius:'12px', 
                            borderLeft:`5px solid ${t.status === 'resolved' ? '#10b981' : '#3b82f6'}`,
                            cursor:'pointer', transition:'transform 0.1s', boxShadow:'0 2px 4px rgba(0,0,0,0.02)'
                        }}
                        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <div>
                                <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                                    <strong style={{color:'#1e293b', fontSize:'1.05rem'}}>#{t.ticket_number} {t.subject}</strong>
                                    <span style={{fontSize:'0.75rem', background:'#f1f5f9', padding:'2px 8px', borderRadius:'10px', color:'#64748b'}}>{t.category_name}</span>
                                </div>
                                <p style={{color:'#64748b', margin:'5px 0 0 0', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'5px'}}>
                                    <MessageSquare size={14}/> Clique para interagir
                                </p>
                            </div>
                            <span style={{
                                fontSize:'0.8rem', textTransform:'uppercase', fontWeight:'bold', 
                                color: t.status === 'resolved' ? '#10b981' : '#3b82f6',
                                background: t.status === 'resolved' ? '#dcfce7' : '#dbeafe',
                                padding:'5px 10px', borderRadius:'6px'
                            }}>
                                {t.status === 'open' ? 'Aberto' : t.status === 'resolved' ? 'Resolvido' : 'Em Andamento'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}

const input = { padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1', width:'100%', fontSize:'0.95rem' };