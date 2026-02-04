import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Settings.module.css';
import { 
    UserPlus, Trash2, Save, Building, Users, Tags, 
    Plus, PenTool, Factory, Loader2, Shield, Edit // <--- Adicionado Edit
} from 'lucide-react';

export default function Settings() {
    const { addToast } = useContext(ToastContext);
    const [activeTab, setActiveTab] = useState('company'); 
    const [loading, setLoading] = useState(false);

    // --- ESTADOS DE DADOS ---
    const [company, setCompany] = useState({});
    const [users, setUsers] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customFieldsOS, setCustomFieldsOS] = useState([]);
    
    // Estados PCP
    const [drivers, setDrivers] = useState([]);
    const [customFieldsPCP, setCustomFieldsPCP] = useState([]);

    // --- MODAIS ---
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [isFieldModalOpen, setIsFieldModalOpen] = useState(false); 
    
    // --- FORMS & ESTADOS DE EDIÇÃO ---
    const [editingUserId, setEditingUserId] = useState(null); // <--- ID do usuário sendo editado
    const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'vendedor' });
    
    const [newCat, setNewCat] = useState({ name: '', type: 'expense' });
    const [newField, setNewField] = useState({ label: '', module: 'service_order', type: 'text' });
    const [newDriver, setNewDriver] = useState({ name: '', unit: 'R$', default_value: 0 });

    // --- EFEITOS (CARREGAMENTO) ---
    useEffect(() => {
        loadDataForTab(activeTab);
    }, [activeTab]);

    async function loadDataForTab(tab) {
        setLoading(true);
        try {
            if (tab === 'company') await loadCompany();
            if (tab === 'users') await loadUsers();
            if (tab === 'categories') await loadCategories();
            if (tab === 'custom_fields') await loadCustomFields('service_order');
            if (tab === 'pcp') await loadPCP();
        } catch (error) {
            console.error("Erro ao carregar aba:", error);
        } finally {
            setLoading(false);
        }
    }

    // --- FUNÇÕES DE BUSCA ---
    async function loadCompany() {
        try { 
            const res = await api.get('/tenant/settings'); 
            setCompany(res.data || {}); 
        } catch(e) { 
            addToast({type:'error', title:'Erro ao carregar dados da empresa'});
        }
    }

    async function loadUsers() { 
        try { 
            const res = await api.get('/tenant/users'); 
            setUsers(res.data || []); 
        } catch(e){ 
            addToast({type:'error', title:'Erro ao carregar equipe'});
        } 
    }
    
    async function loadCategories() { 
        try { 
            const res = await api.get('/categories'); 
            setCategories(res.data || []); 
        } catch(e){ 
            addToast({type:'error', title:'Erro ao carregar categorias'});
        } 
    }
    
    async function loadCustomFields(module) { 
        try { 
            const res = await api.get(`/tenant/custom-fields?module=${module}`); 
            if(module === 'service_order') setCustomFieldsOS(res.data);
            if(module === 'pcp') setCustomFieldsPCP(res.data);
        } catch(e){} 
    }

    async function loadPCP() {
        try {
            const res = await api.get('/pcp/settings');
            setDrivers(res.data.drivers || []);
            loadCustomFields('pcp'); 
        } catch(e){}
    }

    // --- HANDLERS ---
    async function handleSaveCompany(e) { 
        e.preventDefault(); 
        try { await api.put('/tenant/settings', company); addToast({type:'success', title:'Salvo!'}); } 
        catch(e){ addToast({type:'error', title:'Erro ao salvar'}); } 
    }

    // --- LÓGICA DE USUÁRIOS (CRIAR E EDITAR) ---
    
    // Abre o modal (Limpa se for criar, Preenche se for editar)
    function handleOpenUserModal(user = null) {
        if (user) {
            setEditingUserId(user.id);
            setNewUser({
                name: user.name,
                email: user.email,
                role: user.role,
                password: '' // Senha vazia na edição (só preenche se quiser trocar)
            });
        } else {
            setEditingUserId(null);
            setNewUser({ name: '', email: '', password: '', role: 'vendedor' });
        }
        setIsUserModalOpen(true);
    }

    async function handleSaveUser(e) { 
        e.preventDefault(); 
        
        // Validação básica
        if (!newUser.name || !newUser.email) {
            addToast({type:'warning', title:'Preencha nome e email'});
            return;
        }
        // Se for criação, senha é obrigatória. Se for edição, é opcional.
        if (!editingUserId && !newUser.password) {
            addToast({type:'warning', title:'Senha é obrigatória para novos usuários'});
            return;
        }

        try { 
            if (editingUserId) {
                // EDITAR (PUT)
                await api.put(`/tenant/users/${editingUserId}`, newUser);
                addToast({type:'success', title:'Usuário Atualizado'}); 
            } else {
                // CRIAR (POST)
                await api.post('/tenant/users', newUser); 
                addToast({type:'success', title:'Usuário Criado'}); 
            }
            
            setIsUserModalOpen(false); 
            await loadUsers(); 
            setNewUser({name:'', email:'', password:'', role:'vendedor'}); 
            setEditingUserId(null);

        } catch(e){ 
            addToast({type:'error', title: e.response?.data?.message || 'Erro ao salvar'}); 
        } 
    }

    async function handleDeleteUser(id) { 
        if(!confirm('Remover usuário permanentemente?')) return; 
        try { await api.delete(`/tenant/users/${id}`); setUsers(users.filter(u=>u.id!==id)); } catch(e){} 
    }

    async function handleAddCat(e) { 
        e.preventDefault(); 
        try { await api.post('/categories', newCat); setIsCatModalOpen(false); loadCategories(); setNewCat({name:'', type:'expense'}); } catch(e){} 
    }
    async function handleDeleteCat(id) { 
        if(!confirm('Remover?')) return; 
        try { await api.delete(`/categories/${id}`); setCategories(categories.filter(c=>c.id!==id)); } catch(e){} 
    }
    
    const openFieldModal = (module) => { setNewField({ label: '', module, type: 'text' }); setIsFieldModalOpen(true); };
    async function handleAddField(e) {
        e.preventDefault();
        try { await api.post('/tenant/custom-fields', newField); addToast({type:'success', title:'Criado!'}); setIsFieldModalOpen(false); loadCustomFields(newField.module); } catch (e) {}
    }
    async function handleDeleteField(id, module) {
        if(!confirm('Remover?')) return;
        try { await api.delete(`/tenant/custom-fields/${id}`); if(module === 'service_order') setCustomFieldsOS(customFieldsOS.filter(f=>f.id!==id)); if(module === 'pcp') setCustomFieldsPCP(customFieldsPCP.filter(f=>f.id!==id)); } catch(e){}
    }

    async function handleAddDriver() {
        if(!newDriver.name) return;
        try { await api.post('/pcp/settings/drivers', newDriver); addToast({type:'success', title:'Adicionado'}); setNewDriver({ name: '', unit: 'R$', default_value: 0 }); loadPCP(); } catch(e) {}
    }
    async function handleDeleteDriver(id) {
        if(!confirm('Remover?')) return;
        try { await api.delete(`/pcp/settings/drivers/${id}`); loadPCP(); } catch(e){}
    }

    // Helper para traduzir roles
    const getRoleLabel = (role) => {
        const roles = {
            'admin': 'Admin',
            'vendedor': 'Vendedor',
            'caixa': 'Caixa PDV',
            'producao': 'Produção',
            'financeiro': 'Financeiro',
            'rh': 'RH',
            'suporte': 'Suporte'
        };
        return roles[role] || role;
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <h2 style={{ marginBottom: '1.5rem', padding: '0 2rem', paddingTop: '2rem' }}>Configurações</h2>
                
                <div className={styles.tabs}>
                    <button className={`${styles.tab} ${activeTab==='company'?styles.activeTab:''}`} onClick={()=>setActiveTab('company')}>
                        <Building size={18} style={{marginRight:'5px'}}/> Empresa
                    </button>
                    <button className={`${styles.tab} ${activeTab==='categories'?styles.activeTab:''}`} onClick={()=>setActiveTab('categories')}>
                        <Tags size={18} style={{marginRight:'5px'}}/> Finanças
                    </button>
                    <button className={`${styles.tab} ${activeTab==='custom_fields'?styles.activeTab:''}`} onClick={()=>setActiveTab('custom_fields')}>
                        <PenTool size={18} style={{marginRight:'5px'}}/> Campos OS
                    </button>
                    <button className={`${styles.tab} ${activeTab==='pcp'?styles.activeTab:''}`} onClick={()=>setActiveTab('pcp')}>
                        <Factory size={18} style={{marginRight:'5px'}}/> PCP & Fábrica
                    </button>
                    <button className={`${styles.tab} ${activeTab==='users'?styles.activeTab:''}`} onClick={()=>setActiveTab('users')}>
                        <Users size={18} style={{marginRight:'5px'}}/> Equipe
                    </button>
                </div>

                <div className={styles.content}>
                    
                    {loading ? (
                        <div style={{textAlign:'center', padding:'3rem', color:'#666'}}>
                            <Loader2 className="spin" size={32} />
                            <p style={{marginTop:'10px'}}>Carregando informações...</p>
                        </div>
                    ) : (
                        <>
                            {/* ABA EMPRESA */}
                            {activeTab === 'company' && (
                                <form onSubmit={handleSaveCompany}>
                                    <div className={styles.formGroup}><label className={styles.label}>Nome da Empresa</label><input className={styles.input} value={company.name||''} onChange={e=>setCompany({...company, name:e.target.value})} /></div>
                                    <div className={styles.formGroup}><label className={styles.label}>CNPJ/CPF</label><input className={styles.input} value={company.document||''} onChange={e=>setCompany({...company, document:e.target.value})} /></div>
                                    <div className={styles.row}>
                                        <div className={styles.formGroup}><label className={styles.label}>Telefone</label><input className={styles.input} value={company.phone||''} onChange={e=>setCompany({...company, phone:e.target.value})} /></div>
                                        <div className={styles.formGroup}><label className={styles.label}>Email Contato</label><input className={styles.input} value={company.email_contact||''} onChange={e=>setCompany({...company, email_contact:e.target.value})} /></div>
                                    </div>
                                    <div className={styles.row}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Cor Primária</label>
                                            <input type="color" className={styles.colorInput} value={company.primary_color || '#000000'} onChange={e=>setCompany({...company, primary_color:e.target.value})} style={{width:'100%', height:'40px'}} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Cor Secundária</label>
                                            <input type="color" className={styles.colorInput} value={company.secondary_color || '#ffffff'} onChange={e=>setCompany({...company, secondary_color:e.target.value})} style={{width:'100%', height:'40px'}} />
                                        </div>
                                    </div>
                                    <div className={styles.formGroup}><label className={styles.label}>Endereço</label><input className={styles.input} value={company.address||''} onChange={e=>setCompany({...company, address:e.target.value})} /></div>
                                    
                                    <div style={{marginTop:'1.5rem', borderTop:'1px solid #eee', paddingTop:'1rem'}}>
                                        <h4 style={{marginBottom:'10px'}}>Configurações de Impressão (OS)</h4>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Mensagem de Observação Padrão</label>
                                            <textarea className={styles.input} style={{height:'80px'}} placeholder="Ex: Equipamento sujeito a análise..." value={company.os_observation_message||''} onChange={e=>setCompany({...company, os_observation_message:e.target.value})} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Termos de Garantia</label>
                                            <textarea className={styles.input} style={{height:'80px'}} placeholder="Ex: Garantia de 90 dias sobre mão de obra..." value={company.os_warranty_terms||''} onChange={e=>setCompany({...company, os_warranty_terms:e.target.value})} />
                                        </div>
                                        <div className={styles.formGroup}>
                                            <label className={styles.label}>Rodapé Fixo</label>
                                            <textarea className={styles.input} style={{height:'60px'}} placeholder="Ex: Obrigado pela preferência!" value={company.footer_message||''} onChange={e=>setCompany({...company, footer_message:e.target.value})} />
                                        </div>
                                    </div>

                                    <button className={styles.btnSave}><Save size={16}/> Salvar Configurações</button>
                                </form>
                            )}

                            {/* ABA CAMPOS OS */}
                            {activeTab === 'custom_fields' && (
                                <div>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}><h3>Campos Personalizados (OS)</h3><button className={styles.btnAddUser} onClick={()=>openFieldModal('service_order')}><Plus size={16}/> Novo</button></div>
                                    <ul className={styles.userList}>
                                        {customFieldsOS.length === 0 && <li style={{padding:'1rem', color:'#666', fontStyle:'italic'}}>Nenhum campo cadastrado.</li>}
                                        {customFieldsOS.map(f => <li key={f.id} className={styles.userItem}><span>{f.label} <small>({f.type})</small></span><button onClick={()=>handleDeleteField(f.id, 'service_order')} className={styles.btnDelete}><Trash2 size={16}/></button></li>)}
                                    </ul>
                                </div>
                            )}

                            {/* ABA PCP */}
                            {activeTab === 'pcp' && (
                                <div>
                                    <div style={{marginBottom:'2rem', paddingBottom:'1rem', borderBottom:'1px solid #eee'}}>
                                        <h3>Base de Cálculo (Custos)</h3>
                                        <div style={{display:'flex', gap:'10px', marginBottom:'1rem'}}>
                                            <input placeholder="Nome (Ex: Hora Máquina)" className={styles.input} value={newDriver.name} onChange={e=>setNewDriver({...newDriver, name:e.target.value})}/>
                                            <select className={styles.input} style={{width:'100px'}} value={newDriver.unit} onChange={e=>setNewDriver({...newDriver, unit:e.target.value})}><option value="R$">R$</option><option value="h">h</option><option value="%">%</option></select>
                                            <input type="number" placeholder="Valor" className={styles.input} style={{width:'100px'}} value={newDriver.default_value} onChange={e=>setNewDriver({...newDriver, default_value:e.target.value})}/>
                                            <button onClick={handleAddDriver} className={styles.btnAddUser}><Plus size={18}/></button>
                                        </div>
                                        <ul className={styles.userList}>
                                            {drivers.map(d => <li key={d.id} className={styles.userItem}><span><strong>{d.name}</strong> ({d.unit}) - Padrão: {d.default_value}</span><button onClick={()=>handleDeleteDriver(d.id)} className={styles.btnDelete}><Trash2 size={16}/></button></li>)}
                                        </ul>
                                    </div>
                                    <div>
                                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}><h3>Campos Personalizados (PCP)</h3><button className={styles.btnAddUser} onClick={()=>openFieldModal('pcp')}><Plus size={16}/> Novo</button></div>
                                        <ul className={styles.userList}>
                                            {customFieldsPCP.map(f => <li key={f.id} className={styles.userItem}><span>{f.label} <small>({f.type})</small></span><button onClick={()=>handleDeleteField(f.id, 'pcp')} className={styles.btnDelete}><Trash2 size={16}/></button></li>)}
                                        </ul>
                                    </div>
                                </div>
                            )}

                            {/* ABA FINANÇAS */}
                            {activeTab === 'categories' && (
                                <div>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}><h3>Plano de Contas</h3><button className={styles.btnAddUser} onClick={()=>setIsCatModalOpen(true)}><Plus size={16}/> Nova</button></div>
                                    <ul className={styles.userList}>
                                        {categories.length === 0 && <li style={{padding:'1rem', color:'#666'}}>Nenhuma categoria encontrada.</li>}
                                        {categories.map(c => <li key={c.id} className={styles.userItem}><span>{c.name}</span><button onClick={()=>handleDeleteCat(c.id)} className={styles.btnDelete}><Trash2 size={16}/></button></li>)}
                                    </ul>
                                </div>
                            )}
                            
                            {/* ABA EQUIPE (USUÁRIOS) */}
                            {activeTab === 'users' && (
                                <div>
                                    <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}>
                                        <h3>Equipe</h3>
                                        {/* Botão abre modal limpo */}
                                        <button className={styles.btnAddUser} onClick={() => handleOpenUserModal(null)}>
                                            <UserPlus size={16}/> Novo Usuário
                                        </button>
                                    </div>
                                    <ul className={styles.userList}>
                                        {users.length === 0 && (
                                            <li style={{padding:'20px', textAlign:'center', background:'#f9fafb', borderRadius:'8px', color:'#666'}}>
                                                Nenhum usuário encontrado.
                                            </li>
                                        )}
                                        {users.map(u => (
                                            <li key={u.id} className={styles.userItem}>
                                                <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                                    <div style={{width:'36px', height:'36px', background:'#f1f5f9', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'bold', color:'#475569'}}>
                                                        {u.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div style={{fontWeight:600, color:'#334155'}}>{u.name} {u.is_super_admin && <Shield size={12} color="#2563eb" style={{marginLeft:4, display:'inline'}}/>}</div>
                                                        <div style={{fontSize:'0.8rem', color:'#64748b'}}>
                                                            {u.email}
                                                            <span style={{
                                                                marginLeft:'8px', background: u.role==='admin'?'#1e293b':'#e2e8f0', color: u.role==='admin'?'white':'#475569', 
                                                                padding:'2px 6px', borderRadius:'4px', fontSize:'0.7rem', fontWeight:'bold', textTransform:'uppercase'
                                                            }}>
                                                                {getRoleLabel(u.role)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div style={{display:'flex', gap:'8px'}}>
                                                    {/* Botão de Editar */}
                                                    <button onClick={() => handleOpenUserModal(u)} className={styles.btnDelete} style={{color:'#2563eb'}} title="Editar">
                                                        <Edit size={16}/>
                                                    </button>
                                                    {!u.is_super_admin && (
                                                        <button onClick={()=>handleDeleteUser(u.id)} className={styles.btnDelete} title="Remover acesso"><Trash2 size={16}/></button>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* MODAL USUÁRIO (CRIAR/EDITAR) */}
            <Modal isOpen={isUserModalOpen} onClose={()=>setIsUserModalOpen(false)} title={editingUserId ? "Editar Usuário" : "Novo Usuário"}>
                <form onSubmit={handleSaveUser}>
                    <div style={{marginBottom:10}}>
                        <label className={styles.label}>Nome Completo</label>
                        <input className={styles.input} placeholder="Ex: João Silva" value={newUser.name} onChange={e=>setNewUser({...newUser, name:e.target.value})} required/>
                    </div>
                    <div style={{marginBottom:10}}>
                        <label className={styles.label}>Email de Acesso</label>
                        <input className={styles.input} placeholder="joao@empresa.com" type="email" value={newUser.email} onChange={e=>setNewUser({...newUser, email:e.target.value})} required/>
                    </div>
                    <div style={{marginBottom:10}}>
                        <label className={styles.label}>{editingUserId ? "Nova Senha (Opcional)" : "Senha Provisória"}</label>
                        <input 
                            className={styles.input} 
                            type="password" 
                            placeholder={editingUserId ? "Deixe em branco para manter" : "******"} 
                            value={newUser.password} 
                            onChange={e=>setNewUser({...newUser, password:e.target.value})} 
                            required={!editingUserId} // Obrigatório apenas na criação
                        />
                    </div>
                    <div style={{marginBottom:15}}>
                        <label className={styles.label}>Cargo / Permissão</label>
                        <select className={styles.input} value={newUser.role} onChange={e=>setNewUser({...newUser, role:e.target.value})} required>
                            <option value="admin">Administrador (Acesso Total)</option>
                            <option value="vendedor">Vendedor (Vendas e Clientes)</option>
                            <option value="caixa">Operador de Caixa (Apenas PDV)</option>
                            <option value="producao">Produção / Técnico (OS e Estoque)</option>
                            <option value="financeiro">Financeiro (Contas e Relatórios)</option>
                            <option value="rh">Recursos Humanos (Ponto e Folha)</option>
                            <option value="suporte">Agente de Suporte (Helpdesk)</option>
                        </select>
                    </div>
                    <button className={styles.btnSave} style={{marginTop:'10px', width:'100%'}}>
                        {editingUserId ? "Salvar Alterações" : "Criar Usuário"}
                    </button>
                </form>
            </Modal>
            
            {/* OUTROS MODAIS MANTIDOS */}
            <Modal isOpen={isFieldModalOpen} onClose={()=>setIsFieldModalOpen(false)} title={`Novo Campo`}>
                <form onSubmit={handleAddField}>
                    <label className={styles.label}>Nome</label><input className={styles.input} value={newField.label} onChange={e=>setNewField({...newField, label:e.target.value})} required />
                    <div style={{marginTop:'10px'}}><label className={styles.label}>Tipo</label><select className={styles.input} value={newField.type} onChange={e=>setNewField({...newField, type:e.target.value})}><option value="text">Texto</option><option value="number">Número</option><option value="date">Data</option></select></div>
                    <button className={styles.btnSave} style={{marginTop:'15px'}}>Criar</button>
                </form>
            </Modal>
            
            <Modal isOpen={isCatModalOpen} onClose={()=>setIsCatModalOpen(false)} title="Nova Categoria">
                <form onSubmit={handleAddCat}>
                    <input className={styles.input} placeholder="Nome (Ex: Aluguel)" value={newCat.name} onChange={e=>setNewCat({...newCat, name:e.target.value})} autoFocus/>
                    <button className={styles.btnSave} style={{marginTop:'10px'}}>Salvar</button>
                </form>
            </Modal>
        </DashboardLayout>
    );
}