import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Usa o api.js inteligente
import { ToastContext } from '../../context/ToastContext';
import { Lock, Mail, ArrowRight, LifeBuoy } from 'lucide-react';

export default function HelpdeskLogin() {
  const navigate = useNavigate();
  const { addToast } = useContext(ToastContext);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Chama a rota pública de autenticação
      const response = await api.post('/tickets/public/auth', { email, password });
      
      const { token, user } = response.data;

      // Salva com chaves específicas do Helpdesk para não conflitar com o Admin
      localStorage.setItem('clientToken', token);
      localStorage.setItem('clientUser', JSON.stringify(user));

      addToast({ type: 'success', title: 'Bem-vindo(a)!' });
      navigate('/helpdesk');

    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Falha no login', message: error.response?.data?.error || 'Verifique suas credenciais' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f8fafc'}}>
      <div style={{width:'100%', maxWidth:'400px', padding:'2rem', background:'white', borderRadius:'16px', boxShadow:'0 4px 6px -1px rgba(0,0,0,0.1)'}}>
        
        <div style={{textAlign:'center', marginBottom:'2rem'}}>
            <div style={{width:'60px', height:'60px', background:'#eff6ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1rem'}}>
                <LifeBuoy size={32} color="#3b82f6" />
            </div>
            <h1 style={{fontSize:'1.5rem', fontWeight:'bold', color:'#1e293b'}}>Central de Ajuda</h1>
            <p style={{color:'#64748b'}}>Acesse seus chamados e suporte</p>
        </div>

        <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
          <div>
            <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem', fontWeight:'500', color:'#475569'}}>Email</label>
            <div style={{position:'relative'}}>
                <Mail size={18} style={{position:'absolute', left:'12px', top:'12px', color:'#94a3b8'}} />
                <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    style={{width:'100%', padding:'10px 10px 10px 40px', borderRadius:'8px', border:'1px solid #e2e8f0', outline:'none'}}
                />
            </div>
          </div>

          <div>
            <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem', fontWeight:'500', color:'#475569'}}>Senha</label>
            <div style={{position:'relative'}}>
                <Lock size={18} style={{position:'absolute', left:'12px', top:'12px', color:'#94a3b8'}} />
                <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    style={{width:'100%', padding:'10px 10px 10px 40px', borderRadius:'8px', border:'1px solid #e2e8f0', outline:'none'}}
                />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
                marginTop:'1rem', background:'#3b82f6', color:'white', border:'none', padding:'12px', 
                borderRadius:'8px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
                opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : <>Acessar Painel <ArrowRight size={18}/></>}
          </button>
        </form>
        
        <div style={{marginTop:'1.5rem', textAlign:'center', fontSize:'0.85rem', color:'#94a3b8'}}>
            Não tem uma conta? Entre em contato com o suporte.
        </div>
      </div>
    </div>
  );
}