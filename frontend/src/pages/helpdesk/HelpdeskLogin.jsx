import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { LifeBuoy } from 'lucide-react';

export default function HelpdeskLogin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Busca branding da empresa
    api.get(`/tickets/config/${slug}`)
       .then(res => setConfig(res.data))
       .catch(() => alert('Central de ajuda não encontrada'));
  }, [slug]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
        const res = await api.post('/tickets/login', { email, password, slug });
        localStorage.setItem('helpdesk_token', res.data.token);
        localStorage.setItem('helpdesk_user', JSON.stringify(res.data.user));
        // Define header
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
        navigate(`/helpdesk/${slug}/panel`);
    } catch (err) {
        alert('Erro no login');
    }
  };

  if (!config) return <div style={{textAlign:'center', marginTop:'50px'}}>Carregando...</div>;

  return (
    <div style={{minHeight:'100vh', background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{background:'white', padding:'40px', borderRadius:'16px', boxShadow:'0 10px 25px rgba(0,0,0,0.1)', width:'400px', textAlign:'center', borderTop:`5px solid ${config.primary_color}`}}>
        <div style={{marginBottom:'20px'}}>
            <LifeBuoy size={40} color={config.primary_color} />
            <h2 style={{color:'#1e293b'}}>{config.portal_title}</h2>
        </div>
        
        <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <input type="email" placeholder="Seu Email" value={email} onChange={e => setEmail(e.target.value)} style={input} required />
            <input type="password" placeholder="Senha" value={password} onChange={e => setPassword(e.target.value)} style={input} required />
            <button type="submit" style={{background: config.primary_color, color:'white', padding:'12px', borderRadius:'8px', border:'none', fontWeight:'bold', cursor:'pointer'}}>
                Acessar Meus Tickets
            </button>
        </form>
      </div>
    </div>
  );
}

const input = { padding:'12px', borderRadius:'8px', border:'1px solid #cbd5e1' };