import { useState, useEffect, useContext } from 'react';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api';
import { Clock, LogOut, Coffee, MapPin, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EmployeePanel() {
  const navigate = useNavigate();
  const { addToast } = useContext(ToastContext);
  const [time, setTime] = useState(new Date());
  const [timesheet, setTimesheet] = useState({ daily_records: [], bank_balance: 0 });
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('employee_user') || '{}'));

  useEffect(() => {
    // Relógio em tempo real
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // Configura token se perdeu no reload
    const token = localStorage.getItem('employee_token');
    if(token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    else navigate('/portal/login');

    fetchTimesheet();

    return () => clearInterval(timer);
  }, []);

  const fetchTimesheet = async () => {
    const today = new Date();
    try {
        const res = await api.get(`/portal/me/timesheet?month=${today.getMonth() + 1}&year=${today.getFullYear()}`);
        setTimesheet(res.data);
    } catch (error) {
        console.error("Erro ao carregar espelho");
    }
  };

  const handleClockIn = async (type) => {
    try {
        // Simples geolocalização (opcional)
        let location = '';
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                location = `${position.coords.latitude},${position.coords.longitude}`;
                await sendPunch(type, location);
            }, async () => {
                await sendPunch(type, 'Localização negada');
            });
        } else {
            await sendPunch(type, 'N/A');
        }
    } catch (error) {
        addToast({ type: 'error', title: 'Erro', message: 'Falha ao registrar ponto' });
    }
  };

  const sendPunch = async (type, location) => {
    await api.post('/portal/clockin', { record_type: type, location });
    addToast({ type: 'success', title: 'Registrado', message: `Ponto: ${type} registrado!` });
    fetchTimesheet();
  };

  const handleLogout = () => {
      localStorage.removeItem('employee_token');
      localStorage.removeItem('employee_user');
      navigate('/portal/login');
  };

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc', padding:'2rem'}}>
      {/* HEADER */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem'}}>
        <div>
            <h1 style={{color:'#1e293b'}}>Olá, {user.name}</h1>
            <p style={{color:'#64748b'}}>Portal do Colaborador</p>
        </div>
        <button onClick={handleLogout} style={{background:'white', border:'1px solid #fee2e2', color:'#ef4444', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center'}}>
            <LogOut size={18}/> Sair
        </button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 2fr', gap:'2rem'}}>
        
        {/* WIDGET DE PONTO */}
        <div style={{background:'white', padding:'2rem', borderRadius:'16px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)', textAlign:'center'}}>
            <div style={{fontSize:'3rem', fontWeight:'800', color:'#1e293b', marginBottom:'10px'}}>
                {time.toLocaleTimeString()}
            </div>
            <div style={{color:'#64748b', marginBottom:'2rem'}}>{time.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'})}</div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <button onClick={() => handleClockIn('entry')} style={clockBtn('#22c55e')}>Entrada</button>
                <button onClick={() => handleClockIn('exit')} style={clockBtn('#ef4444')}>Saída</button>
                <button onClick={() => handleClockIn('lunch_out')} style={clockBtn('#f59e0b')}><Coffee size={16}/> Almoço (Ida)</button>
                <button onClick={() => handleClockIn('lunch_in')} style={clockBtn('#3b82f6')}><Coffee size={16}/> Almoço (Volta)</button>
            </div>
        </div>

        {/* ESPELHO DE PONTO */}
        <div style={{background:'white', padding:'2rem', borderRadius:'16px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                <h3>Espelho de Ponto (Mês Atual)</h3>
                <div style={{background: parseFloat(timesheet.bank_balance) >= 0 ? '#dcfce7' : '#fee2e2', color: parseFloat(timesheet.bank_balance) >= 0 ? '#166534' : '#991b1b', padding:'5px 15px', borderRadius:'20px', fontWeight:'bold'}}>
                    Banco: {timesheet.bank_balance}h
                </div>
            </div>
            
            <div style={{maxHeight:'400px', overflowY:'auto'}}>
                <table style={{width:'100%', borderCollapse:'collapse'}}>
                    <thead>
                        <tr style={{textAlign:'left', color:'#94a3b8', borderBottom:'1px solid #e2e8f0'}}>
                            <th style={{padding:'10px'}}>Data</th>
                            <th style={{padding:'10px'}}>Registros</th>
                            <th style={{padding:'10px'}}>Saldo Dia</th>
                        </tr>
                    </thead>
                    <tbody>
                        {timesheet.daily_records.map((day, idx) => (
                            <tr key={idx} style={{borderBottom:'1px solid #f1f5f9'}}>
                                <td style={{padding:'10px', fontWeight:'600'}}>{day.date}</td>
                                <td style={{padding:'10px'}}>
                                    {day.punches.map((p, i) => (
                                        <span key={i} style={{background:'#f1f5f9', padding:'2px 6px', borderRadius:'4px', marginRight:'5px', fontSize:'0.85rem'}}>
                                            {p.time}
                                        </span>
                                    ))}
                                </td>
                                <td style={{padding:'10px', color: parseFloat(day.balance) >= 0 ? 'green' : 'red'}}>
                                    {day.balance}h
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
}

const clockBtn = (color) => ({
    background: color, color:'white', border:'none', padding:'15px', borderRadius:'12px', 
    fontWeight:'bold', fontSize:'1rem', cursor:'pointer', display:'flex', justifyContent:'center', alignItems:'center', gap:'5px',
    transition:'transform 0.1s', boxShadow:'0 4px 0 rgba(0,0,0,0.1)'
});