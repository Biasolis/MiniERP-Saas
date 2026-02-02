import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api'; // Use a mesma instância, o backend separa as rotas
import { UserCheck, Lock } from 'lucide-react';

export default function EmployeeLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { addToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/portal/login', { email, password });
      const { token, employee } = response.data;
      
      // Salva token específico do portal
      localStorage.setItem('employee_token', token);
      localStorage.setItem('employee_user', JSON.stringify(employee));
      
      // Define header para requests futuros neste escopo
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      navigate('/portal/dashboard');
    } catch (error) {
      addToast({ type: 'error', title: 'Erro', message: 'Credenciais inválidas' });
    }
  };

  return (
    <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#f1f5f9'}}>
      <div style={{background:'white', padding:'40px', borderRadius:'16px', boxShadow:'0 10px 25px rgba(0,0,0,0.1)', width:'400px', textAlign:'center'}}>
        <div style={{background:'#eff6ff', width:'60px', height:'60px', borderRadius:'50%', display:'flex', justifyContent:'center', alignItems:'center', margin:'0 auto 20px'}}>
            <UserCheck size={32} color="#4f46e5" />
        </div>
        <h2 style={{marginBottom:'20px', color:'#1e293b'}}>Portal do Colaborador</h2>
        <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <input type="email" placeholder="Email Corporativo" value={email} onChange={e => setEmail(e.target.value)} style={{padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1'}} required />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={{padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1'}} required />
            <button type="submit" style={{background:'#4f46e5', color:'white', padding:'12px', borderRadius:'8px', border:'none', fontWeight:'bold', cursor:'pointer'}}>Entrar</button>
        </form>
      </div>
    </div>
  );
}