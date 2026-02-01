import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Suppliers.module.css'; // <--- Importa o CSS
import { Plus, Search, Edit, Trash2, Truck, Check } from 'lucide-react';

export default function Suppliers() {
    const { addToast } = useContext(ToastContext);
    const [suppliers, setSuppliers] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Estado para controlar o loading do botão de salvar
    const [saving, setSaving] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [formData, setFormData] = useState({ name: '', cnpj_cpf: '', email: '', phone: '', address: '' });

    useEffect(() => { loadSuppliers(); }, []);

    useEffect(() => {
        const lower = searchTerm.toLowerCase();
        setFiltered(suppliers.filter(s => s.name.toLowerCase().includes(lower)));
    }, [searchTerm, suppliers]);

    async function loadSuppliers() {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (e) { addToast({ type: 'error', title: 'Erro ao carregar fornecedores' }); }
        finally { setLoading(false); }
    }

    const handleOpenModal = (sup = null) => {
        if (sup) {
            setEditing(sup);
            setFormData({ 
                name: sup.name, 
                cnpj_cpf: sup.cnpj_cpf || '', 
                email: sup.email || '', 
                phone: sup.phone || '', 
                address: sup.address || '' 
            });
        } else {
            setEditing(null);
            setFormData({ name: '', cnpj_cpf: '', email: '', phone: '', address: '' });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            if (editing) await api.put(`/suppliers/${editing.id}`, formData);
            else await api.post('/suppliers', formData);
            
            addToast({ type: 'success', title: 'Salvo com sucesso!' });
            setIsModalOpen(false);
            loadSuppliers();
        } catch (e) { 
            addToast({ type: 'error', title: 'Erro ao salvar.' }); 
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Excluir fornecedor?')) return;
        try {
            await api.delete(`/suppliers/${id}`);
            addToast({ type: 'success', title: 'Removido!' });
            loadSuppliers();
        } catch (e) { 
            addToast({ type: 'error', title: e.response?.data?.message || 'Erro ao remover.' }); 
        }
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2>Fornecedores</h2>
                    <button onClick={() => handleOpenModal()} className={styles.btnPrimary}>
                        <Plus size={20}/> Novo Fornecedor
                    </button>
                </div>

                <div className={styles.controls}>
                    <div className={styles.searchBox}>
                        <Search size={18} color="#9ca3af" />
                        <input 
                            placeholder="Buscar fornecedor..." 
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
                                    <th>Nome</th>
                                    <th>Documento</th>
                                    <th>Contato</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(s => (
                                    <tr key={s.id}>
                                        <td>
                                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                                <div style={{background:'#f3f4f6', padding:'8px', borderRadius:'50%'}}>
                                                    <Truck size={16} color="#6b7280"/>
                                                </div>
                                                <strong>{s.name}</strong>
                                            </div>
                                        </td>
                                        <td>{s.cnpj_cpf || '-'}</td>
                                        <td>
                                            <div style={{fontSize:'0.85rem'}}>{s.phone}</div>
                                            <div style={{fontSize:'0.8rem', color:'#6b7280'}}>{s.email}</div>
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button onClick={() => handleOpenModal(s)} className={styles.btnIcon}>
                                                    <Edit size={16}/>
                                                </button>
                                                <button onClick={() => handleDelete(s.id)} className={styles.btnIconDelete}>
                                                    <Trash2 size={16}/>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{textAlign:'center', padding:'20px', color:'#9ca3af'}}>
                                            Nenhum fornecedor encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editing ? "Editar Fornecedor" : "Novo Fornecedor"}>
                <form onSubmit={handleSave}>
                    <div style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                        <div>
                            <label style={{display:'block', marginBottom:'5px', fontWeight:'500', fontSize:'0.9rem'}}>Nome / Razão Social</label>
                            <input 
                                className={styles.input} 
                                value={formData.name} 
                                onChange={e => setFormData({...formData, name: e.target.value})} 
                                required 
                            />
                        </div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px'}}>
                            <div>
                                <label style={{display:'block', marginBottom:'5px', fontWeight:'500', fontSize:'0.9rem'}}>CPF / CNPJ</label>
                                <input 
                                    className={styles.input} 
                                    value={formData.cnpj_cpf} 
                                    onChange={e => setFormData({...formData, cnpj_cpf: e.target.value})} 
                                />
                            </div>
                            <div>
                                <label style={{display:'block', marginBottom:'5px', fontWeight:'500', fontSize:'0.9rem'}}>Telefone</label>
                                <input 
                                    className={styles.input} 
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{display:'block', marginBottom:'5px', fontWeight:'500', fontSize:'0.9rem'}}>Email</label>
                            <input 
                                type="email"
                                className={styles.input} 
                                value={formData.email} 
                                onChange={e => setFormData({...formData, email: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label style={{display:'block', marginBottom:'5px', fontWeight:'500', fontSize:'0.9rem'}}>Endereço</label>
                            <input 
                                className={styles.input} 
                                value={formData.address} 
                                onChange={e => setFormData({...formData, address: e.target.value})} 
                            />
                        </div>
                        
                        {/* Botão limpo usando apenas classe CSS */}
                        <button type="submit" className={styles.btnSave} disabled={saving}>
                            {saving ? 'Salvando...' : <><Check size={18} /> Salvar Fornecedor</>}
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}