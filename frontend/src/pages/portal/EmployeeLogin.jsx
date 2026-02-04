import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { User, Lock, ArrowRight } from 'lucide-react';

export default function EmployeeLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. ROTA DA API: Deve bater com 'app.use(/api/portal)' no backend
      const response = await api.post('/portal/login', { email, password });
      
      const { token, user } = response.data;

      // 2. CHAVE DO TOKEN: Tem que ser igual ao que o 'api.js' e 'PortalPrivateRoute' buscam
      localStorage.setItem('employeeToken', token);
      localStorage.setItem('employeeUser', JSON.stringify(user));

      // 3. REDIRECIONAMENTO: Deve ser '/portal' (como está no App.jsx), e não '/portal/panel'
      navigate('/portal'); 

    } catch (err) {
      console.error(err);
      setError('Credenciais inválidas ou acesso não autorizado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9'}}>
      <div style={{background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', width: '100%', maxWidth: '400px'}}>
        <div style={{textAlign: 'center', marginBottom: '2rem'}}>
          <h2 style={{color: '#1e293b', margin: 0}}>Portal do Colaborador</h2>
          <p style={{color: '#64748b', fontSize: '0.9rem'}}>Acesse seu espelho de ponto e holerites</p>
        </div>

        {error && <div style={{background: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem', textAlign: 'center'}}>{error}</div>}

        <form onSubmit={handleLogin} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
          <div style={{position: 'relative'}}>
            <User size={20} style={{position: 'absolute', top: '12px', left: '12px', color: '#94a3b8'}} />
            <input 
              type="text" 
              placeholder="Email ou Código de Acesso" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required
              style={{width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}} 
            />
          </div>

          <div style={{position: 'relative'}}>
            <Lock size={20} style={{position: 'absolute', top: '12px', left: '12px', color: '#94a3b8'}} />
            <input 
              type="password" 
              placeholder="Sua Senha" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              style={{width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none'}} 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{
              background: '#3b82f6', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', 
              fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Entrando...' : (
              <>Acessar Portal <ArrowRight size={18} /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}