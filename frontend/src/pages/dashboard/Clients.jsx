import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import { Plus, Search, Phone } from 'lucide-react';
import styles from './Clients.module.css';

export default function Clients() {
  const { addToast } = useContext(ToastContext);
  const navigate = useNavigate();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estado do formulário
  const [newClient, setNewClient] = useState({
    name: '', 
    email: '', 
    phone: '', 
    document: '', 
    city: '', 
    status: 'lead', 
    source: 'indication'
  });

  useEffect(() => { 
      loadClients(); 
  }, []);

  async function loadClients() {
    setLoading(true);
    try {
        // Busca todos os clientes. O backend já retorna o campo 'code'.
        const res = await api.get('/clients');
        setClients(res.data);
    } catch (error) {
        addToast({ type: 'error', title: 'Erro', message: 'Erro ao carregar clientes' });
    } finally {
        setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
        await api.post('/clients', newClient);
        addToast({ type: 'success', title: 'Sucesso', message: 'Cliente cadastrado!' });
        setIsModalOpen(false);
        // Limpa o formulário
        setNewClient({ name: '', email: '', phone: '', document: '', city: '', status: 'lead', source: 'indication' });
        loadClients();
    } catch (error) {
        addToast({ type: 'error', title: 'Erro', message: 'Erro ao cadastrar cliente' });
    }
  }

  // Filtro local: Busca por Nome, Email ou CÓDIGO
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.code && c.code.includes(searchTerm)) // Permite buscar pelo código
  );

  const getStatusBadge = (status) => {
      switch(status) {
          case 'lead': return <span style={{background:'#fef3c7', color:'#d97706', padding:'2px 8px', borderRadius:'10px', fontSize:'0.75rem', fontWeight:'600'}}>Lead</span>;
          case 'active': return <span style={{background:'#d1fae5', color:'#059669', padding:'2px 8px', borderRadius:'10px', fontSize:'0.75rem', fontWeight:'600'}}>Cliente</span>;
          case 'inactive': return <span style={{background:'#f3f4f6', color:'#6b7280', padding:'2px 8px', borderRadius:'10px', fontSize:'0.75rem', fontWeight:'600'}}>Inativo</span>;
          default: return null;
      }
  };

  return (
    <DashboardLayout>
      <div className={styles.header}>
        <div>
            <h2 style={{margin:0}}>Gestão de Clientes & Leads</h2>
            <p style={{margin:0, color:'#6b7280', fontSize:'0.9rem'}}>Gerencie sua carteira de clientes</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Novo Cadastro
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
            <Search size={18} color="#9ca3af" />
            <input 
                placeholder="Buscar por nome, código ou email..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th style={{width:'80px'}}>Cód.</th>
                        <th>Nome / Empresa</th>
                        <th>Contato</th>
                        <th>Cidade</th>
                        <th>Status</th>
                        <th>Origem</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredClients.map(client => (
                        <tr key={client.id} onClick={() => navigate(`/dashboard/clients/${client.id}`)} style={{cursor:'pointer'}}>
                            <td>
                                {/* Exibe o código gerado pelo backend */}
                                <strong style={{color:'#4f46e5'}}>#{client.code || '---'}</strong>
                            </td>
                            <td>
                                <div style={{fontWeight:600, color:'#374151'}}>{client.name}</div>
                                <div style={{fontSize:'0.8rem', color:'#9ca3af'}}>{client.document}</div>
                            </td>
                            <td>
                                <div style={{display:'flex', alignItems:'center', gap:'5px', fontSize:'0.9rem'}}><Phone size={12}/> {client.phone}</div>
                                <div style={{fontSize:'0.8rem', color:'#6b7280'}}>{client.email}</div>
                            </td>
                            <td>{client.city || '-'}</td>
                            <td>{getStatusBadge(client.status)}</td>
                            <td style={{fontSize:'0.85rem', color:'#6b7280', textTransform:'capitalize'}}>{client.source}</td>
                        </tr>
                    ))}
                    {filteredClients.length === 0 && (
                        <tr>
                            <td colSpan="6" style={{textAlign:'center', padding:'20px', color:'#9ca3af'}}>
                                Nenhum cliente encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      )}

      {/* MODAL NOVO CLIENTE */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Cliente/Lead">
        <form onSubmit={handleCreate} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
            <div>
                <label className={styles.label}>Nome Completo / Razão Social</label>
                <input required className={styles.input} value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} placeholder="Ex: João Silva ou Empresa Ltda" />
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div>
                    <label className={styles.label}>Telefone / WhatsApp</label>
                    <input className={styles.input} value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} placeholder="(00) 00000-0000" />
                </div>
                <div>
                    <label className={styles.label}>Email</label>
                    <input type="email" className={styles.input} value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} placeholder="cliente@email.com" />
                </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div>
                    <label className={styles.label}>CPF / CNPJ</label>
                    <input className={styles.input} value={newClient.document} onChange={e => setNewClient({...newClient, document: e.target.value})} />
                </div>
                <div>
                    <label className={styles.label}>Cidade</label>
                    <input className={styles.input} value={newClient.city} onChange={e => setNewClient({...newClient, city: e.target.value})} />
                </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div>
                    <label className={styles.label}>Status Inicial</label>
                    <select className={styles.input} value={newClient.status} onChange={e => setNewClient({...newClient, status: e.target.value})}>
                        <option value="lead">Lead (Prospecção)</option>
                        <option value="active">Cliente Ativo</option>
                    </select>
                </div>
                <div>
                    <label className={styles.label}>Origem (Marketing)</label>
                    <select className={styles.input} value={newClient.source} onChange={e => setNewClient({...newClient, source: e.target.value})}>
                        <option value="indication">Indicação</option>
                        <option value="google">Google</option>
                        <option value="instagram">Instagram</option>
                        <option value="other">Outros</option>
                    </select>
                </div>
            </div>

            <div style={{marginTop:'10px', display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                <button type="button" onClick={() => setIsModalOpen(false)} style={{padding:'10px 20px', background:'white', border:'1px solid #ddd', borderRadius:'8px', cursor:'pointer'}}>Cancelar</button>
                <button type="submit" className={styles.btnPrimary}>Salvar Cadastro</button>
            </div>
        </form>
      </Modal>

    </DashboardLayout>
  );
}