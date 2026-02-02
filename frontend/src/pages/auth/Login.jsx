import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { ToastContext } from '../../context/ToastContext';
import styles from './Login.module.css';
import { Layers, Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

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
      navigate('/dashboard');
    } else {
      addToast({ type: 'error', title: 'Erro no acesso', message: result.message });
    }
    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <div className={styles.overlay}></div> {/* Camada escura sobre a imagem */}
      <div className={styles.card}>
        
        {/* LOGO E TÍTULO ATUALIZADOS */}
        <div className={styles.header}>
            <div className={styles.logoIcon}>
                <Layers size={32} color="white" />
            </div>
            <h2 className={styles.title}>MiniERP - <span style={{color:'var(--primary-color)'}}>Finance</span></h2>
            <p className={styles.subtitle}>Acesse sua conta para continuar</p>
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
        <div className={styles.footer}>
          Ainda não tem uma conta? <Link to="/register">Teste grátis por 7 dias</Link>
        </div>
      </div>
    </div>
  );
}