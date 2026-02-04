import { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api';
import { Settings, Save, Link as LinkIcon, Plus, UserPlus, Users, Mail, Trash2 } from 'lucide-react';

export default function TicketConfig() {
  const { addToast } = useContext(ToastContext);
  
  // States
  const [config, setConfig] = useState({ slug: '', portal_title: '', primary_color: '#4f46e5' });
  const [categories, setCategories] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [supportUser, setSupportUser] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    loadConfig();
    loadCategories();
    loadUsers();
  }, []);

  const loadConfig = async () => {
      try {
          const res = await api.get('/tickets/config');
          if(res.data) {
              setConfig({
                  slug: res.data.slug || '',
                  portal_title: res.data.portal_title || 'Central de Ajuda',
                  primary_color: res.data.primary_color || '#4f46e5'
              });
          }
      } catch (e) { console.error(e); }
  };

  const loadCategories = async () => {
    try {
        // CORREÇÃO: URL da API ajustada
        const res = await api.get('/tickets/categories'); 
        setCategories(res.data);
    } catch (e) { console.error("Erro ao carregar categorias", e); }
  };

  const loadUsers = async () => {
    try {
        const res = await api.get('/tickets/users');
        setUsersList(res.data);
    } catch (e) { console.error(e); }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
        await api.post('/tickets/config', config);
        addToast({ type: 'success', title: 'Sucesso', message: 'Configurações salvas!' });
    } catch (error) {
        addToast({ type: 'error', title: 'Erro', message: error.response?.data?.error || 'Erro ao salvar' });
    }
  };

  const handleAddCategory = async () => {
    if(!newCat.name) return;
    try {
        await api.post('/tickets/categories', newCat);
        setNewCat({ name: '', description: '' });
        loadCategories();
        addToast({ type: 'success', title: 'Criado', message: 'Categoria adicionada' });
    } catch (e) {
        addToast({ type: 'error', title: 'Erro', message: 'Erro ao criar categoria' });
    }
  };

  const handleDeleteCategory = async (id) => {
      if(!confirm("Excluir categoria?")) return;
      try {
          await api.delete(`/tickets/categories/${id}`);
          loadCategories();
          addToast({ type: 'success', title: 'Excluído', message: 'Categoria removida.' });
      } catch (e) {
          addToast({ type: 'error', title: 'Erro', message: 'Erro ao excluir' });
      }
  };

  const handleAddSupportUser = async (e) => {
    e.preventDefault();
    try {
        await api.post('/tickets/users', supportUser);
        addToast({ type: 'success', title: 'Sucesso', message: 'Cliente cadastrado com acesso ao portal!' });
        setSupportUser({ name: '', email: '', password: '' });
        loadUsers(); 
    } catch (error) {
        addToast({ type: 'error', title: 'Erro', message: error.response?.data?.error || 'Erro ao cadastrar usuário' });
    }
  };

  return (
    <DashboardLayout>
      <h1>Configuração do Helpdesk</h1>
      
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(350px, 1fr))', gap:'20px', marginTop:'20px'}}>
        
        {/* COLUNA 1: PERSONALIZAÇÃO */}
        <div style={card}>
            <h3><Settings size={18}/> Personalização do Portal</h3>
            <form onSubmit={handleSaveConfig} style={{display:'flex', flexDirection:'column', gap:'15px', marginTop:'15px'}}>
                <div>
                    <label style={label}>Slug (URL única)</label>
                    <div style={{display:'flex', alignItems:'center', gap:'5px', background:'#f9fafb', padding:'5px', borderRadius:'8px', border:'1px solid #eee'}}>
                        <span style={{color:'#666', fontSize:'0.8rem', paddingLeft:'5px'}}>/helpdesk/</span>
                        <input required value={config.slug} onChange={e => setConfig({...config, slug: e.target.value})} style={{...input, border:'none', background:'transparent', padding:'5px'}} placeholder="minha-empresa" />
                    </div>
                </div>
                <div>
                    <label style={label}>Título do Portal</label>
                    <input required value={config.portal_title} onChange={e => setConfig({...config, portal_title: e.target.value})} style={input} placeholder="Ex: Central de Ajuda" />
                </div>
                <div>
                    <label style={label}>Cor da Marca</label>
                    <div style={{display:'flex', gap:'10px', alignItems:'center'}}>
                        <input type="color" value={config.primary_color} onChange={e => setConfig({...config, primary_color: e.target.value})} style={{width:'50px', height:'40px', border:'none', cursor:'pointer'}} />
                        <span style={{color:'#666'}}>{config.primary_color}</span>
                    </div>
                </div>
                <button type="submit" style={btnPrimary}><Save size={18}/> Salvar Aparência</button>
            </form>
            
            {config.slug && (
                <div style={{marginTop:'20px', padding:'15px', background:'#eff6ff', borderRadius:'8px', border:'1px solid #dbeafe'}}>
                    <strong style={{color:'#1e40af', fontSize:'0.9rem', display:'block', marginBottom:'5px'}}>Portal Ativo:</strong>
                    <a href={`/helpdesk/${config.slug}`} target="_blank" rel="noreferrer" style={{display:'flex', alignItems:'center', gap:'5px', color:'#2563eb', textDecoration:'none', fontWeight:'600'}}>
                        <LinkIcon size={16}/> Acessar Portal
                    </a>
                </div>
            )}
        </div>

        {/* COLUNA 2: CADASTRO E LISTAGEM DE CLIENTES */}
        <div style={card}>
            <h3><Users size={18}/> Acesso de Clientes</h3>
            <p style={{fontSize:'0.85rem', color:'#666', marginBottom:'15px'}}>
                Cadastre clientes para que eles possam abrir chamados.
            </p>
            
            <form onSubmit={handleAddSupportUser} style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px', borderBottom:'1px solid #eee', paddingBottom:'20px'}}>
                <input required value={supportUser.name} onChange={e => setSupportUser({...supportUser, name: e.target.value})} style={input} placeholder="Nome do Cliente" />
                <input required type="email" value={supportUser.email} onChange={e => setSupportUser({...supportUser, email: e.target.value})} style={input} placeholder="Email de Acesso" />
                <input required type="password" value={supportUser.password} onChange={e => setSupportUser({...supportUser, password: e.target.value})} style={input} placeholder="Senha Provisória" />
                <button type="submit" style={{...btnPrimary, background:'#10b981'}}>
                    <UserPlus size={18}/> Cadastrar
                </button>
            </form>

            <div style={{maxHeight:'250px', overflowY:'auto'}}>
                <h4 style={{fontSize:'0.9rem', color:'#334155', marginBottom:'10px'}}>Clientes Cadastrados ({usersList.length})</h4>
                {usersList.length === 0 && <p style={{color:'#999', fontSize:'0.8rem'}}>Nenhum cliente cadastrado.</p>}
                
                {usersList.map(u => (
                    <div key={u.id} style={{padding:'10px', background:'#f8fafc', borderRadius:'8px', marginBottom:'8px', border:'1px solid #e2e8f0'}}>
                        <div style={{fontWeight:'600', color:'#334155', fontSize:'0.9rem'}}>{u.name}</div>
                        <div style={{display:'flex', alignItems:'center', gap:'5px', color:'#64748b', fontSize:'0.8rem'}}>
                            <Mail size={14}/> {u.email}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* COLUNA 3: CARDÁPIO (CATEGORIAS) */}
        <div style={card}>
            <h3>Cardápio de Serviços</h3>
            <p style={{fontSize:'0.85rem', color:'#666', marginBottom:'15px'}}>Categorias para abertura de tickets.</p>
            
            <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                <input placeholder="Nova Categoria..." value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} style={input} />
                <button onClick={handleAddCategory} style={btnPrimary}><Plus size={18}/></button>
            </div>
            
            <div style={{maxHeight:'300px', overflowY:'auto', border:'1px solid #f1f5f9', borderRadius:'8px'}}>
                {categories.length === 0 && <p style={{padding:'15px', textAlign:'center', color:'#999', fontSize:'0.9rem'}}>Nenhuma categoria.</p>}
                {categories.map(cat => (
                    <div key={cat.id} style={{padding:'12px', borderBottom:'1px solid #f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span style={{fontWeight:'500', color:'#334155'}}>{cat.name}</span>
                        <button onClick={() => handleDeleteCategory(cat.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#ef4444'}}><Trash2 size={16}/></button>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

const card = { background:'white', padding:'25px', borderRadius:'12px', boxShadow:'0 4px 6px rgba(0,0,0,0.02)', border:'1px solid #e2e8f0' };
const input = { width:'100%', padding:'10px 12px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'0.95rem' };
const label = { display:'block', marginBottom:'5px', fontSize:'0.85rem', fontWeight:'600', color:'#475569' };
const btnPrimary = { background:'var(--primary-color)', color:'white', padding:'10px 20px', border:'none', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontWeight:'bold', transition:'opacity 0.2s', width:'100%' };