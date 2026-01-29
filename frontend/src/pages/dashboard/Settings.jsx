import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Settings.module.css';
import { UserPlus, Trash2, Save, Building, Users, Tags, Plus, PenTool } from 'lucide-react';

export default function Settings() {
  const { addToast } = useContext(ToastContext);
  const [activeTab, setActiveTab] = useState('company'); 
  const [loading, setLoading] = useState(false);

  // Estados
  const [company, setCompany] = useState({ name: '', closing_day: 1, document: '', phone: '', email_contact: '', website: '', address: '', footer_message: '' });
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customFields, setCustomFields] = useState([]);

  // Modais
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  
  // Forms
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [newCat, setNewCat] = useState({ name: '', type: 'expense' });
  const [newField, setNewField] = useState({ label: '', module: 'service_order', type: 'text' });

  useEffect(() => {
    if (activeTab === 'company') loadCompany();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'categories') loadCategories();
    if (activeTab === 'custom_fields') loadCustomFields();
  }, [activeTab]);

  async function loadCompany() {
    setLoading(true);
    try { const res = await api.get('/tenant/settings'); setCompany(res.data); } catch(e){} finally { setLoading(false); }
  }
  async function loadUsers() { try { const res = await api.get('/tenant/users'); setUsers(res.data); } catch(e){} }
  async function loadCategories() { try { const res = await api.get('/categories'); setCategories(res.data); } catch(e){} }
  async function loadCustomFields() { try { const res = await api.get('/tenant/custom-fields?module=service_order'); setCustomFields(res.data); } catch(e){} }

  // Handlers
  async function handleSaveCompany(e) { e.preventDefault(); try { await api.put('/tenant/settings', company); addToast({type:'success', title:'Salvo!'}); } catch(e){ addToast({type:'error', title:'Erro'}); } }
  async function handleAddUser(e) { e.preventDefault(); try { await api.post('/tenant/users', newUser); setIsUserModalOpen(false); loadUsers(); addToast({type:'success', title:'Criado'}); } catch(e){ addToast({type:'error', title:'Erro'}); } }
  async function handleDeleteUser(id) { if(!confirm('Remover?')) return; try { await api.delete(`/tenant/users/${id}`); setUsers(users.filter(u=>u.id!==id)); } catch(e){} }
  async function handleAddCat(e) { e.preventDefault(); try { await api.post('/categories', newCat); setIsCatModalOpen(false); loadCategories(); } catch(e){} }
  async function handleDeleteCat(id) { if(!confirm('Remover?')) return; try { await api.delete(`/categories/${id}`); setCategories(categories.filter(c=>c.id!==id)); } catch(e){} }
  
  // Custom Fields Handler
  async function handleAddField(e) {
      e.preventDefault();
      try {
          await api.post('/tenant/custom-fields', newField);
          addToast({type:'success', title:'Campo criado!'});
          setIsFieldModalOpen(false);
          setNewField({ label: '', module: 'service_order', type: 'text' });
          loadCustomFields();
      } catch (e) { addToast({type:'error', title:'Erro'}); }
  }
  async function handleDeleteField(id) {
      if(!confirm('Remover campo?')) return;
      try { await api.delete(`/tenant/custom-fields/${id}`); setCustomFields(customFields.filter(f=>f.id!==id)); } catch(e){}
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <h2 style={{ marginBottom: '1.5rem', padding: '0 2rem', paddingTop: '2rem' }}>Configurações</h2>
        
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab==='company'?styles.activeTab:''}`} onClick={()=>setActiveTab('company')}><Building size={18} style={{marginRight:'5px'}}/> Empresa</button>
          <button className={`${styles.tab} ${activeTab==='categories'?styles.activeTab:''}`} onClick={()=>setActiveTab('categories')}><Tags size={18} style={{marginRight:'5px'}}/> Finanças</button>
          <button className={`${styles.tab} ${activeTab==='custom_fields'?styles.activeTab:''}`} onClick={()=>setActiveTab('custom_fields')}><PenTool size={18} style={{marginRight:'5px'}}/> Campos OS</button>
          <button className={`${styles.tab} ${activeTab==='users'?styles.activeTab:''}`} onClick={()=>setActiveTab('users')}><Users size={18} style={{marginRight:'5px'}}/> Equipe</button>
        </div>

        <div className={styles.content}>
          {activeTab === 'company' && (
             <form onSubmit={handleSaveCompany}>
                 <div className={styles.formGroup}><label className={styles.label}>Nome</label><input className={styles.input} value={company.name||''} onChange={e=>setCompany({...company, name:e.target.value})} /></div>
                 <div className={styles.formGroup}><label className={styles.label}>CNPJ/CPF</label><input className={styles.input} value={company.document||''} onChange={e=>setCompany({...company, document:e.target.value})} /></div>
                 <div className={styles.formGroup}><label className={styles.label}>Telefone</label><input className={styles.input} value={company.phone||''} onChange={e=>setCompany({...company, phone:e.target.value})} /></div>
                 <div className={styles.formGroup}><label className={styles.label}>Endereço</label><input className={styles.input} value={company.address||''} onChange={e=>setCompany({...company, address:e.target.value})} /></div>
                 <div className={styles.formGroup}><label className={styles.label}>Rodapé Impressão</label><textarea className={styles.input} value={company.footer_message||''} onChange={e=>setCompany({...company, footer_message:e.target.value})} /></div>
                 <button className={styles.btnSave}><Save size={16}/> Salvar</button>
             </form>
          )}

          {activeTab === 'custom_fields' && (
              <div>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}><h3>Campos Personalizados (OS)</h3><button className={styles.btnAddUser} onClick={()=>setIsFieldModalOpen(true)}><Plus size={16}/> Novo</button></div>
                  <p style={{color:'#666', marginBottom:'1rem'}}>Defina campos extras para a OS (Ex: Placa, KM, Marca).</p>
                  <ul className={styles.userList}>
                      {customFields.map(f => <li key={f.id} className={styles.userItem}><span>{f.label} <small>({f.type})</small></span><button onClick={()=>handleDeleteField(f.id)} className={styles.btnDelete}><Trash2 size={16}/></button></li>)}
                  </ul>
              </div>
          )}

          {activeTab === 'categories' && (
              <div>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}><h3>Plano de Contas</h3><button className={styles.btnAddUser} onClick={()=>setIsCatModalOpen(true)}><Plus size={16}/> Nova</button></div>
                  <ul className={styles.userList}>{categories.map(c => <li key={c.id} className={styles.userItem}><span>{c.name}</span><button onClick={()=>handleDeleteCat(c.id)} className={styles.btnDelete}><Trash2 size={16}/></button></li>)}</ul>
              </div>
          )}
          
          {activeTab === 'users' && (
              <div>
                  <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1rem'}}><h3>Equipe</h3><button className={styles.btnAddUser} onClick={()=>setIsUserModalOpen(true)}><UserPlus size={16}/> Novo</button></div>
                  <ul className={styles.userList}>{users.map(u => <li key={u.id} className={styles.userItem}><span>{u.name}</span><button onClick={()=>handleDeleteUser(u.id)} className={styles.btnDelete}><Trash2 size={16}/></button></li>)}</ul>
              </div>
          )}
        </div>
      </div>

      <Modal isOpen={isFieldModalOpen} onClose={()=>setIsFieldModalOpen(false)} title="Novo Campo"><form onSubmit={handleAddField}><label className={styles.label}>Nome</label><input className={styles.input} value={newField.label} onChange={e=>setNewField({...newField, label:e.target.value})} required /><button className={styles.btnSave} style={{marginTop:'10px'}}>Criar</button></form></Modal>
      <Modal isOpen={isUserModalOpen} onClose={()=>setIsUserModalOpen(false)} title="Novo Usuário"><form onSubmit={handleAddUser}><input className={styles.input} placeholder="Nome" value={newUser.name} onChange={e=>setNewUser({...newUser, name:e.target.value})}/><input className={styles.input} placeholder="Email" value={newUser.email} onChange={e=>setNewUser({...newUser, email:e.target.value})}/><input className={styles.input} type="password" placeholder="Senha" value={newUser.password} onChange={e=>setNewUser({...newUser, password:e.target.value})}/><button className={styles.btnSave} style={{marginTop:'10px'}}>Salvar</button></form></Modal>
      <Modal isOpen={isCatModalOpen} onClose={()=>setIsCatModalOpen(false)} title="Categoria"><form onSubmit={handleAddCat}><input className={styles.input} placeholder="Nome" value={newCat.name} onChange={e=>setNewCat({...newCat, name:e.target.value})}/><button className={styles.btnSave} style={{marginTop:'10px'}}>Salvar</button></form></Modal>
    </DashboardLayout>
  );
}