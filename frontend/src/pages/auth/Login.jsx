import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import styles from './Login.module.css';
import { Layers, Lock, Mail, ArrowRight, Loader2, User } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useContext(AuthContext);
  const { addToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
        addToast({ type: 'warning', title: 'Atenção', message: 'Preencha todos os campos.' });
        return;
    }
    
    setIsLoading(true);
    
    const result = await signIn(email, password);
    
    if (result.success) {
      // --- LÓGICA DE REDIRECIONAMENTO POR FUNÇÃO (ROLE) ---
      try {
          // Lemos do localStorage para garantir que pegamos os dados atualizados pós-login
          const storedUser = localStorage.getItem('saas_user');
          const userObj = storedUser ? JSON.parse(storedUser) : {};
          const role = userObj.role || 'admin'; // fallback para admin se não tiver role

          switch (role) {
              case 'caixa':
                  navigate('/dashboard/pos'); // Caixa vai direto pro PDV
                  break;
              case 'producao':
                  navigate('/dashboard/pcp'); // Produção vai direto pro PCP
                  break;
              case 'vendedor':
                  navigate('/dashboard/sales'); // Vendedor vai para Vendas
                  break;
              default:
                  navigate('/dashboard'); // Admin/RH/Outros vão para o Dashboard
                  break;
          }
      } catch (error) {
          console.error("Erro no redirecionamento:", error);
          navigate('/dashboard'); // Fallback de segurança
      }

    } else {
      addToast({ type: 'error', title: 'Erro no acesso', message: result.message });
    }
    
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.overlay}></div>
      <div className={styles.card}>
        
        <div className={styles.header}>
            <div className={styles.logoIcon}>
                <Layers size={32} color="white" />
            </div>
            <h2 className={styles.title}>MiniERP - <span style={{color:'var(--primary-color)'}}>Finance</span></h2>
            <p className={styles.subtitle}>Acesso Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email Corporativo</label>
            <div className={styles.inputWrapper}>
                <Mail size={20} className={styles.fieldIcon} />
                <input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={styles.input}
                  required
                />
            </div>
          </div>
          <div className={styles.inputGroup}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <label className={styles.label} htmlFor="password">Senha</label>
                <Link to="/forgot-password" className={styles.forgotLink}>Esqueceu a senha?</Link>
            </div>
            <div className={styles.inputWrapper}>
                <Lock size={20} className={styles.fieldIcon} />
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={styles.input}
                  required
                />
            </div>
          </div>
          
          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? <Loader2 className="spin" size={24} /> : <>Entrar na Plataforma <ArrowRight size={20} /></>}
          </button>
        </form>

        {/* --- ATALHO PARA O PORTAL DO COLABORADOR --- */}
        <div style={{marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb'}}>
            <Link 
                to="/portal/login" 
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    padding: '10px', borderRadius: '8px', backgroundColor: '#f1f5f9', 
                    color: '#475569', fontWeight: '600', textDecoration: 'none', transition: 'all 0.2s'
                }}
                onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#e2e8f0'; }}
                onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
            >
                <User size={18} />
                Acesso Portal do Colaborador
            </Link>
        </div>

        <div className={styles.footer}>
          Ainda não tem uma conta? <Link to="/register">Teste grátis por 7 dias</Link>
        </div>
      </div>
    </div>
  );
}