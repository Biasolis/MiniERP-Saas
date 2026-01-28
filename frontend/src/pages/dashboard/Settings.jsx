import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Settings.module.css';
import { UserPlus, Trash2, Save, Building, Users, Tags, Plus } from 'lucide-react';

export default function Settings() {
  const { addToast } = useContext(ToastContext);
  const [activeTab, setActiveTab] = useState('company'); // company | users | categories
  const [loading, setLoading] = useState(false);

  // Estados dos dados
  const [company, setCompany] = useState({ 
    name: '', 
    closing_day: 1,
    document: '',       // CNPJ
    phone: '',          // Telefone
    email_contact: '',  // Email público
    website: '',        // Site/Insta
    address: '',        // Endereço completo
    footer_message: ''  // Mensagem da impressão
  });
  
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  // Modais
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  
  // Forms
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [newCat, setNewCat] = useState({ name: '', type: 'expense' });

  // Carregamento inteligente baseado na aba
  useEffect(() => {
    if (activeTab === 'company') loadCompany();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'categories') loadCategories();
  }, [activeTab]);

  async function loadCompany() {
    setLoading(true);
    try {
      const response = await api.get('/tenant/settings');
      setCompany(response.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar dados da empresa.' });
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await api.get('/tenant/users');
      setUsers(response.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar equipe.' });
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) {
      console.error(error);
    }
  }

  // --- HANDLERS EMPRESA ---
  async function handleSaveCompany(e) {
    e.preventDefault();
    try {
      await api.put('/tenant/settings', company);
      addToast({ type: 'success', title: 'Dados da empresa atualizados!' });
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao salvar.' });
    }
  }

  // --- HANDLERS USUÁRIO ---
  async function handleAddUser(e) {
    e.preventDefault();
    try {
      await api.post('/tenant/users', newUser);
      addToast({ type: 'success', title: 'Usuário adicionado!' });
      setIsUserModalOpen(false);
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      loadUsers();
    } catch (error) {
      addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao criar usuário.' });
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm('Tem certeza que deseja remover este usuário?')) return;
    try {
      await api.delete(`/tenant/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
      addToast({ type: 'success', title: 'Usuário removido.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao remover.' });
    }
  }

  // --- HANDLERS CATEGORIA ---
  async function handleAddCat(e) {
    e.preventDefault();
    try {
      await api.post('/categories', newCat);
      addToast({ type: 'success', title: 'Categoria criada!' });
      setIsCatModalOpen(false);
      setNewCat({ name: '', type: 'expense' });
      loadCategories();
    } catch (error) {
      addToast({ type: 'error', title: 'Erro ao criar.' });
    }
  }

  async function handleDeleteCat(id) {
    if(!window.confirm("Deseja excluir esta categoria?")) return;
    try {
        await api.delete(`/categories/${id}`);
        setCategories(categories.filter(c => c.id !== id));
        addToast({ type: 'success', title: 'Categoria removida.' });
    } catch (error) {
        addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao remover.' });
    }
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <h2 style={{ marginBottom: '1.5rem' }}>Configurações</h2>

        {/* ABAS */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'company' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('company')}
          >
            <Building size={18} style={{verticalAlign: 'middle', marginRight: '5px'}}/>
            Dados da Empresa
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'categories' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <Tags size={18} style={{verticalAlign: 'middle', marginRight: '5px'}}/>
            Categorias Financeiras
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'users' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} style={{verticalAlign: 'middle', marginRight: '5px'}}/>
            Equipe
          </button>
        </div>

        <div className={styles.content}>
          
          {/* ABA EMPRESA (EXPANDIDA) */}
          {activeTab === 'company' && (
            <form onSubmit={handleSaveCompany}>
              <h3 className={styles.sectionTitle}>Informações Gerais</h3>
              
              {loading ? <p>Carregando dados...</p> : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                      <label className={styles.label}>Nome Fantasia / Razão Social</label>
                      <input className={styles.input} value={company.name} onChange={e => setCompany({...company, name: e.target.value})} required />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>CNPJ / CPF</label>
                      <input className={styles.input} value={company.document || ''} onChange={e => setCompany({...company, document: e.target.value})} placeholder="00.000.000/0000-00" />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Telefone / WhatsApp</label>
                      <input className={styles.input} value={company.phone || ''} onChange={e => setCompany({...company, phone: e.target.value})} placeholder="(00) 00000-0000" />
                    </div>

                    <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                      <label className={styles.label}>Endereço Completo (Para Impressão)</label>
                      <input className={styles.input} value={company.address || ''} onChange={e => setCompany({...company, address: e.target.value})} placeholder="Rua, Número, Bairro, Cidade - UF" />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Email de Contato</label>
                      <input className={styles.input} value={company.email_contact || ''} onChange={e => setCompany({...company, email_contact: e.target.value})} />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Site / Instagram</label>
                      <input className={styles.input} value={company.website || ''} onChange={e => setCompany({...company, website: e.target.value})} />
                    </div>
                    
                    <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                      <label className={styles.label}>Mensagem de Rodapé (Cupom/OS)</label>
                      <textarea 
                        className={styles.input} 
                        style={{ minHeight: '80px', resize: 'vertical' }}
                        value={company.footer_message || ''} 
                        onChange={e => setCompany({...company, footer_message: e.target.value})} 
                        placeholder="Ex: Obrigado pela preferência! Volte sempre."
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.label}>Dia de Fechamento (Financeiro)</label>
                      <input type="number" min="1" max="31" className={styles.input} value={company.closing_day} onChange={e => setCompany({...company, closing_day: e.target.value})} required />
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <button type="submit" className={styles.btnSave}>
                      <Save size={18} style={{verticalAlign:'middle', marginRight:'5px'}}/> Salvar Configurações
                    </button>
                  </div>
                </>
              )}
            </form>
          )}

          {/* ABA CATEGORIAS */}
          {activeTab === 'categories' && (
             <div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                   <h3 className={styles.sectionTitle}>Plano de Contas</h3>
                   <button className={styles.btnAddUser} onClick={() => setIsCatModalOpen(true)}>
                      <Plus size={18} /> Nova Categoria
                   </button>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem'}}>
                    {/* Lista Receitas */}
                    <div>
                        <h4 style={{marginBottom:'10px', color:'#166534', borderBottom:'2px solid #bbf7d0', paddingBottom:'5px'}}>Receitas</h4>
                        <ul className={styles.userList}>
                            {categories.filter(c => c.type === 'income').map(cat => (
                                <li key={cat.id} className={styles.userItem}>
                                    <span>{cat.name}</span>
                                    <button onClick={() => handleDeleteCat(cat.id)} className={styles.btnDelete}><Trash2 size={16}/></button>
                                </li>
                            ))}
                            {categories.filter(c => c.type === 'income').length === 0 && <small style={{color:'#999'}}>Nenhuma cadastrada.</small>}
                        </ul>
                    </div>
                    {/* Lista Despesas */}
                    <div>
                        <h4 style={{marginBottom:'10px', color:'#991b1b', borderBottom:'2px solid #fecaca', paddingBottom:'5px'}}>Despesas</h4>
                        <ul className={styles.userList}>
                            {categories.filter(c => c.type === 'expense').map(cat => (
                                <li key={cat.id} className={styles.userItem}>
                                    <span>{cat.name}</span>
                                    <button onClick={() => handleDeleteCat(cat.id)} className={styles.btnDelete}><Trash2 size={16}/></button>
                                </li>
                            ))}
                            {categories.filter(c => c.type === 'expense').length === 0 && <small style={{color:'#999'}}>Nenhuma cadastrada.</small>}
                        </ul>
                    </div>
                </div>
             </div>
          )}

          {/* ABA USUÁRIOS */}
          {activeTab === 'users' && (
            <div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                 <h3 className={styles.sectionTitle}>Gerenciar Equipe</h3>
                 <button className={styles.btnAddUser} onClick={() => setIsUserModalOpen(true)}>
                    <UserPlus size={18} /> Adicionar Membro
                 </button>
              </div>
              
              {loading ? <p>Carregando equipe...</p> : (
                <ul className={styles.userList}>
                  {users.map(user => (
                    <li key={user.id} className={styles.userItem}>
                      <div className={styles.userInfo}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                            <div style={{width:'32px', height:'32px', background:'#e0e7ff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', color:'#4338ca', fontWeight:'bold'}}>
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h4 style={{margin:0}}>{user.name} {user.role === 'admin' && <span className={styles.roleBadge}>Admin</span>}</h4>
                                <span style={{fontSize:'0.8rem', color:'#666'}}>{user.email}</span>
                            </div>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteUser(user.id)} className={styles.btnDelete} title="Remover Acesso"><Trash2 size={18}/></button>
                    </li>
                  ))}
                  {users.length === 0 && <p>Nenhum usuário encontrado.</p>}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODAL USUÁRIO */}
      <Modal isOpen={isUserModalOpen} onClose={() => setIsUserModalOpen(false)} title="Novo Membro da Equipe">
        <form onSubmit={handleAddUser} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
           <div>
               <label className={styles.label}>Nome Completo</label>
               <input className={styles.input} value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
           </div>
           <div>
               <label className={styles.label}>Email de Acesso</label>
               <input type="email" className={styles.input} value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
           </div>
           <div>
               <label className={styles.label}>Senha Provisória</label>
               <input type="password" className={styles.input} value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
           </div>
           <div>
               <label className={styles.label}>Nível de Acesso</label>
               <select className={styles.input} value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                   <option value="user">Usuário (Operacional)</option>
                   <option value="admin">Administrador (Acesso Total)</option>
               </select>
           </div>
           <button type="submit" className={styles.btnSave}>Criar Acesso</button>
        </form>
      </Modal>

      {/* MODAL CATEGORIA */}
      <Modal isOpen={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title="Nova Categoria Financeira">
        <form onSubmit={handleAddCat} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
           <div>
               <label className={styles.label}>Nome da Categoria</label>
               <input className={styles.input} value={newCat.name} onChange={e => setNewCat({...newCat, name: e.target.value})} required placeholder="Ex: Combustível, Vendas, Serviços" />
           </div>
           <div>
               <label className={styles.label}>Tipo de Lançamento</label>
               <select className={styles.input} value={newCat.type} onChange={e => setNewCat({...newCat, type: e.target.value})}>
                   <option value="expense">Despesa (Saída)</option>
                   <option value="income">Receita (Entrada)</option>
               </select>
           </div>
           <button type="submit" className={styles.btnSave}>Salvar Categoria</button>
        </form>
      </Modal>

    </DashboardLayout>
  );
}