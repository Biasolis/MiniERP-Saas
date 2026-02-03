import { useState, useEffect, useContext } from 'react';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api';
import { Clock, LogOut, Coffee, Calendar, Plus, Ticket, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Modal from '../../components/ui/Modal'; // Se você tiver o componente Modal genérico, senão usamos um simples aqui

export default function EmployeePanel() {
  const navigate = useNavigate();
  const { addToast } = useContext(ToastContext);
  
  // Estados Ponto
  const [time, setTime] = useState(new Date());
  const [timesheet, setTimesheet] = useState({ daily_records: [], bank_balance: "0.00" });
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({});

  // Estados Tickets
  const [tickets, setTickets] = useState([]);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', category: 'rh' });
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    // 1. Configura Token e Usuário
    const token = localStorage.getItem('employee_token');
    const storedUser = localStorage.getItem('employee_user');

    if (!token) {
        navigate('/portal/login');
        return;
    }

    // Força o header Authorization para garantir
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    if (storedUser) setUser(JSON.parse(storedUser));

    // 2. Relógio
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // 3. Carrega dados iniciais
    fetchTimesheet();
    fetchTickets();

    return () => clearInterval(timer);
  }, []);

  // --- FUNÇÕES DE PONTO ---
  const fetchTimesheet = async () => {
    const today = new Date();
    try {
        const res = await api.get(`/portal/me/timesheet?month=${today.getMonth() + 1}&year=${today.getFullYear()}`);
        setTimesheet(res.data);
    } catch (error) {
        console.error("Erro ao carregar espelho", error);
    }
  };

  const handleClockIn = async (type) => {
    setLoading(true);
    try {
        let location = 'N/A';
        if (navigator.geolocation) {
            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                location = `${position.coords.latitude},${position.coords.longitude}`;
            } catch (e) {
                console.warn("Geolocalização não permitida ou timeout");
            }
        }
        await api.post('/portal/clockin', { record_type: type, location });
        addToast({ type: 'success', title: 'Sucesso', message: 'Ponto registrado!' });
        await fetchTimesheet(); 
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Erro', message: 'Falha ao registrar ponto.' });
    } finally {
        setLoading(false);
    }
  };

  // --- FUNÇÕES DE TICKET ---
  const fetchTickets = async () => {
      try {
          // Endpoint que retorna os tickets deste usuário
          const res = await api.get('/portal/tickets');
          setTickets(res.data);
      } catch (error) {
          console.error("Erro ao carregar tickets", error);
      }
  };

  const handleCreateTicket = async (e) => {
      e.preventDefault();
      setLoadingTickets(true);
      try {
          await api.post('/portal/tickets', newTicket);
          addToast({ type: 'success', title: 'Ticket aberto!' });
          setIsTicketModalOpen(false);
          setNewTicket({ title: '', description: '', category: 'rh' });
          fetchTickets();
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao abrir ticket.' });
      } finally {
          setLoadingTickets(false);
      }
  };

  // --- LOGOUT ---
  const handleLogout = () => {
      localStorage.removeItem('employee_token');
      localStorage.removeItem('employee_user');
      navigate('/portal/login');
  };

  // --- ESTILOS ---
  const btnStyle = (color) => ({
    background: color, color: 'white', border: 'none', padding: '20px', borderRadius: '12px', 
    fontWeight: 'bold', fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', 
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
    opacity: loading ? 0.7 : 1, transition: 'transform 0.1s', boxShadow: '0 4px 0 rgba(0,0,0,0.1)'
  });

  const getStatusBadge = (status) => {
      const colors = { 
          'open': {bg:'#e0f2fe', color:'#0369a1', label:'Aberto'}, 
          'in_progress': {bg:'#fff7ed', color:'#c2410c', label:'Em Andamento'},
          'closed': {bg:'#dcfce7', color:'#15803d', label:'Concluído'} 
      };
      const curr = colors[status] || colors['open'];
      return <span style={{backgroundColor:curr.bg, color:curr.color, padding:'4px 10px', borderRadius:'12px', fontSize:'0.75rem', fontWeight:'bold'}}>{curr.label}</span>;
  };

  return (
    <div style={{minHeight:'100vh', background:'#f1f5f9', padding:'2rem'}}>
      {/* HEADER */}
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem', background:'white', padding:'15px 25px', borderRadius:'12px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)'}}>
        <div>
            <h2 style={{color:'#1e293b', margin:0}}>Olá, {user.name || 'Colaborador'}</h2>
            <small style={{color:'#64748b'}}>Portal do Colaborador</small>
        </div>
        <button onClick={handleLogout} style={{background:'#fee2e2', border:'none', color:'#ef4444', padding:'8px 16px', borderRadius:'8px', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center', fontWeight:'600'}}>
            <LogOut size={18}/> Sair
        </button>
      </header>

      {/* GRID PRINCIPAL (Ponto Esquerda | Espelho Direita) */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'2rem', marginBottom:'2rem'}}>
        
        {/* COLUNA 1: RELÓGIO */}
        <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
            <div style={{background:'white', padding:'2rem', borderRadius:'16px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)', textAlign:'center'}}>
                <div style={{fontSize:'3.5rem', fontWeight:'800', color:'#1e293b', lineHeight: 1}}>
                    {time.toLocaleTimeString()}
                </div>
                <div style={{color:'#64748b', marginTop:'5px', fontSize:'1.1rem'}}>
                    {time.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}
                </div>
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                <button onClick={() => handleClockIn('entry')} style={btnStyle('#22c55e')}>
                    <Clock size={24}/> Entrada
                </button>
                <button onClick={() => handleClockIn('exit')} style={btnStyle('#ef4444')}>
                    <LogOut size={24}/> Saída
                </button>
                <button onClick={() => handleClockIn('lunch_out')} style={btnStyle('#f59e0b')}>
                    <Coffee size={24}/> Pausa
                </button>
                <button onClick={() => handleClockIn('lunch_in')} style={btnStyle('#3b82f6')}>
                    <Coffee size={24}/> Retorno
                </button>
            </div>
        </div>

        {/* COLUNA 2: ESPELHO DE PONTO */}
        <div style={{background:'white', padding:'2rem', borderRadius:'16px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)', height:'fit-content'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
                <h3 style={{margin:0, color:'#1e293b', display:'flex', alignItems:'center', gap:'10px'}}>
                    <Calendar size={20}/> Espelho de Ponto
                </h3>
                <div style={{
                    background: parseFloat(timesheet.bank_balance) >= 0 ? '#dcfce7' : '#fee2e2', 
                    color: parseFloat(timesheet.bank_balance) >= 0 ? '#166534' : '#991b1b', 
                    padding:'6px 15px', borderRadius:'20px', fontWeight:'bold', fontSize:'0.9rem'
                }}>
                    Banco: {timesheet.bank_balance}h
                </div>
            </div>
            
            <div style={{overflowY:'auto', maxHeight:'300px'}}>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                        <tr style={{textAlign:'left', color:'#94a3b8', borderBottom:'1px solid #e2e8f0', fontSize:'0.85rem'}}>
                            <th style={{padding:'10px'}}>Data</th>
                            <th style={{padding:'10px'}}>Marcações</th>
                            <th style={{padding:'10px', textAlign:'right'}}>Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {timesheet.daily_records.length === 0 && (
                            <tr><td colSpan="3" style={{padding:'20px', textAlign:'center', color:'#999'}}>Nenhum registro este mês.</td></tr>
                        )}
                        {timesheet.daily_records.map((day, idx) => (
                            <tr key={idx} style={{borderBottom:'1px solid #f1f5f9'}}>
                                <td style={{padding:'12px 10px', fontWeight:'600', color:'#334155'}}>{day.date}</td>
                                <td style={{padding:'12px 10px'}}>
                                    <div style={{display:'flex', gap:'5px', flexWrap:'wrap'}}>
                                        {day.punches.map((p, i) => (
                                            <span key={i} style={{background:'#f1f5f9', padding:'2px 8px', borderRadius:'6px', fontSize:'0.8rem', color:'#475569', border:'1px solid #e2e8f0'}}>
                                                {p.time}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td style={{padding:'12px 10px', textAlign:'right', fontWeight:'bold', color: parseFloat(day.balance) >= 0 ? '#166534' : '#991b1b'}}>
                                    {day.balance}h
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {/* --- SEÇÃO DE TICKETS (MEUS CHAMADOS) --- */}
      <div style={{background:'white', padding:'2rem', borderRadius:'16px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
              <div>
                  <h3 style={{margin:0, color:'#1e293b', display:'flex', alignItems:'center', gap:'10px'}}>
                      <Ticket size={20}/> Meus Chamados
                  </h3>
                  <small style={{color:'#64748b'}}>Solicitações para RH, TI ou Manutenção</small>
              </div>
              <button onClick={() => setIsTicketModalOpen(true)} style={{background:'#3b82f6', color:'white', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', fontWeight:'600', display:'flex', alignItems:'center', gap:'8px'}}>
                  <Plus size={18}/> Novo Chamado
              </button>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'20px'}}>
              {tickets.length === 0 && (
                  <div style={{gridColumn:'1/-1', textAlign:'center', padding:'30px', color:'#94a3b8', border:'1px dashed #e2e8f0', borderRadius:'12px'}}>
                      Nenhum chamado aberto.
                  </div>
              )}
              {tickets.map(ticket => (
                  <div key={ticket.id} onClick={() => navigate(`/portal/ticket/${ticket.id}`)} style={{border:'1px solid #e2e8f0', borderRadius:'12px', padding:'15px', cursor:'pointer', transition:'0.2s', background:'white'}}>
                      <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'10px'}}>
                          <span style={{fontSize:'0.8rem', fontWeight:'bold', color:'#64748b', textTransform:'uppercase', background:'#f1f5f9', padding:'2px 8px', borderRadius:'4px'}}>
                              {ticket.category}
                          </span>
                          {getStatusBadge(ticket.status)}
                      </div>
                      <h4 style={{margin:'0 0 5px 0', color:'#1e293b'}}>{ticket.title}</h4>
                      <p style={{margin:0, color:'#64748b', fontSize:'0.9rem', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden'}}>
                          {ticket.description}
                      </p>
                      <div style={{marginTop:'10px', paddingTop:'10px', borderTop:'1px solid #f1f5f9', fontSize:'0.8rem', color:'#94a3b8'}}>
                          Aberto em {new Date(ticket.created_at).toLocaleDateString()}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* MODAL NOVO TICKET */}
      {isTicketModalOpen && (
          <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000}}>
              <div style={{background:'white', width:'90%', maxWidth:'500px', borderRadius:'12px', padding:'25px', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                      <h3 style={{margin:0}}>Novo Chamado</h3>
                      <button onClick={() => setIsTicketModalOpen(false)} style={{background:'transparent', border:'none', cursor:'pointer', color:'#64748b'}}><X size={20}/></button>
                  </div>
                  
                  <form onSubmit={handleCreateTicket}>
                      <div style={{marginBottom:'15px'}}>
                          <label style={{display:'block', marginBottom:'5px', fontWeight:'600', fontSize:'0.9rem', color:'#475569'}}>Assunto</label>
                          <input required 
                              value={newTicket.title} onChange={e => setNewTicket({...newTicket, title: e.target.value})}
                              placeholder="Ex: Erro no Holerite, Computador Lento..."
                              style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'0.95rem'}} 
                          />
                      </div>
                      
                      <div style={{marginBottom:'15px'}}>
                          <label style={{display:'block', marginBottom:'5px', fontWeight:'600', fontSize:'0.9rem', color:'#475569'}}>Departamento</label>
                          <select 
                              value={newTicket.category} onChange={e => setNewTicket({...newTicket, category: e.target.value})}
                              style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'0.95rem', background:'white'}}
                          >
                              <option value="rh">Recursos Humanos (RH)</option>
                              <option value="ti">Tecnologia (TI)</option>
                              <option value="manutencao">Manutenção / Predial</option>
                              <option value="operacional">Operacional</option>
                          </select>
                      </div>

                      <div style={{marginBottom:'20px'}}>
                          <label style={{display:'block', marginBottom:'5px', fontWeight:'600', fontSize:'0.9rem', color:'#475569'}}>Descrição Detalhada</label>
                          <textarea required rows="4"
                              value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})}
                              placeholder="Descreva o que está acontecendo..."
                              style={{width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'0.95rem', resize:'vertical'}} 
                          />
                      </div>

                      <div style={{display:'flex', gap:'10px', justifyContent:'flex-end'}}>
                          <button type="button" onClick={() => setIsTicketModalOpen(false)} style={{padding:'10px 20px', borderRadius:'8px', border:'1px solid #cbd5e1', background:'white', cursor:'pointer', fontWeight:'600', color:'#475569'}}>Cancelar</button>
                          <button type="submit" disabled={loadingTickets} style={{padding:'10px 20px', borderRadius:'8px', border:'none', background:'#3b82f6', cursor:'pointer', fontWeight:'600', color:'white', opacity: loadingTickets ? 0.7 : 1}}>
                              {loadingTickets ? 'Enviando...' : 'Abrir Chamado'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
}