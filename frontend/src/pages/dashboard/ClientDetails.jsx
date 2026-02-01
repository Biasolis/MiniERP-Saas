import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import Modal from '../../components/ui/Modal';
import styles from './ClientDetails.module.css';
import { 
    ArrowLeft, Save, MapPin, Phone, Mail, Layout, 
    Plus, Trash2, User, CheckCircle 
} from 'lucide-react';

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);

    const [activeTab, setActiveTab] = useState('data'); // 'data' ou 'projects'
    const [client, setClient] = useState(null);
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form de Endereço (Dados)
    const [formData, setFormData] = useState({});

    // Modal Novo Projeto
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [newProject, setNewProject] = useState({ title: '', value: '', due_date: '', description: '', status: 'lead' });

    useEffect(() => {
        loadData();
    }, [id]);

    async function loadData() {
        try {
            const [cliRes, projRes] = await Promise.all([
                api.get(`/clients/${id}`),
                api.get(`/clients/${id}/projects`)
            ]);
            // cliRes.data retorna { client, financial, history, last_os }
            setClient(cliRes.data.client);
            setFormData(cliRes.data.client); // Preenche form
            setProjects(projRes.data);
        } catch (error) {
            addToast({type:'error', title:'Erro ao carregar dados.'});
            navigate('/dashboard/clients');
        } finally {
            setLoading(false);
        }
    }

    // --- ABA DADOS: ATUALIZAR ---
    const handleUpdateClient = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/clients/${id}`, formData);
            addToast({type:'success', title:'Dados atualizados!'});
            loadData();
        } catch (error) {
            addToast({type:'error', title:'Erro ao salvar.'});
        }
    };

    const handleCepBlur = async (e) => {
        const cep = e.target.value.replace(/\D/g, '');
        if (cep.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
                const data = await res.json();
                if (!data.erro) {
                    setFormData(prev => ({
                        ...prev,
                        street: data.logradouro,
                        neighborhood: data.bairro,
                        city: data.localidade,
                        state: data.uf
                    }));
                }
            } catch (err) { console.error("Erro CEP", err); }
        }
    };

    // --- ABA PROJETOS: NOVO E KANBAN ---
    const handleAddProject = async (e) => {
        e.preventDefault();
        try {
            await api.post(`/clients/${id}/projects`, newProject);
            addToast({type:'success', title:'Projeto criado!'});
            setIsProjectModalOpen(false);
            setNewProject({ title: '', value: '', due_date: '', description: '', status: 'lead' });
            loadData();
        } catch(e) { addToast({type:'error', title:'Erro ao criar projeto.'}); }
    };

    const handleMoveProject = async (projId, newStatus) => {
        // Otimistic update
        setProjects(prev => prev.map(p => p.id === projId ? { ...p, status: newStatus } : p));
        try {
            await api.patch(`/clients/projects/${projId}`, { status: newStatus });
        } catch(e) {
            addToast({type:'error', title:'Erro ao mover projeto.'});
            loadData(); // Reverte
        }
    };

    const handleDeleteProject = async (projId) => {
        if(!confirm('Excluir projeto?')) return;
        try {
            await api.delete(`/clients/projects/${projId}`);
            addToast({type:'success', title:'Removido!'});
            loadData();
        } catch(e) { addToast({type:'error', title:'Erro ao excluir.'}); }
    };

    if (loading) return <DashboardLayout><p>Carregando...</p></DashboardLayout>;
    if (!client) return null;

    const columns = [
        { id: 'lead', title: 'Oportunidade', color: '#3b82f6' },
        { id: 'negotiation', title: 'Negociação', color: '#f59e0b' },
        { id: 'in_progress', title: 'Em Execução', color: '#8b5cf6' },
        { id: 'completed', title: 'Concluído', color: '#10b981' },
        { id: 'lost', title: 'Perdido', color: '#ef4444' }
    ];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                {/* Header */}
                <div className={styles.header}>
                    <button onClick={() => navigate('/dashboard/clients')} className={styles.backBtn}><ArrowLeft size={18} /> Voltar</button>
                    <div className={styles.titleInfo}>
                        <div className={styles.avatar}>{client.name.substring(0,2).toUpperCase()}</div>
                        <div>
                            <h2>{client.name}</h2>
                            <p>{client.city ? `${client.city}/${client.state}` : 'Sem localidade'}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className={styles.tabs}>
                    <button className={activeTab === 'data' ? styles.activeTab : ''} onClick={() => setActiveTab('data')}>
                        <User size={16}/> Dados Cadastrais
                    </button>
                    <button className={activeTab === 'projects' ? styles.activeTab : ''} onClick={() => setActiveTab('projects')}>
                        <Layout size={16}/> Projetos & CRM
                    </button>
                </div>

                {/* --- ABA DADOS --- */}
                {activeTab === 'data' && (
                    <div className={styles.card}>
                        <form onSubmit={handleUpdateClient}>
                            <h3 className={styles.sectionTitle}><User size={18}/> Contato Principal</h3>
                            <div className={styles.grid}>
                                <div><label>Nome</label><input className={styles.input} value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} required/></div>
                                <div><label>CPF/CNPJ</label><input className={styles.input} value={formData.document} onChange={e=>setFormData({...formData, document:e.target.value})}/></div>
                                <div><label>Email</label><input className={styles.input} value={formData.email} onChange={e=>setFormData({...formData, email:e.target.value})}/></div>
                                <div><label>Telefone</label><input className={styles.input} value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})}/></div>
                            </div>

                            <h3 className={styles.sectionTitle} style={{marginTop:'20px'}}><MapPin size={18}/> Endereço</h3>
                            <div className={styles.grid}>
                                <div><label>CEP</label><input className={styles.input} value={formData.zip_code || ''} onChange={e=>setFormData({...formData, zip_code:e.target.value})} onBlur={handleCepBlur} placeholder="00000-000"/></div>
                                <div style={{gridColumn:'span 2'}}><label>Logradouro</label><input className={styles.input} value={formData.street || ''} onChange={e=>setFormData({...formData, street:e.target.value})}/></div>
                                <div><label>Número</label><input className={styles.input} value={formData.number || ''} onChange={e=>setFormData({...formData, number:e.target.value})}/></div>
                                <div><label>Bairro</label><input className={styles.input} value={formData.neighborhood || ''} onChange={e=>setFormData({...formData, neighborhood:e.target.value})}/></div>
                                <div><label>Cidade</label><input className={styles.input} value={formData.city || ''} onChange={e=>setFormData({...formData, city:e.target.value})}/></div>
                                <div><label>UF</label><input className={styles.input} value={formData.state || ''} onChange={e=>setFormData({...formData, state:e.target.value})}/></div>
                                <div style={{gridColumn:'span 2'}}><label>Complemento</label><input className={styles.input} value={formData.complement || ''} onChange={e=>setFormData({...formData, complement:e.target.value})}/></div>
                            </div>

                            <button type="submit" className={styles.btnSave}><Save size={18}/> Salvar Alterações</button>
                        </form>
                    </div>
                )}

                {/* --- ABA PROJETOS (KANBAN) --- */}
                {activeTab === 'projects' && (
                    <div className={styles.kanbanContainer}>
                        <div className={styles.kanbanHeader}>
                            <h3>Fluxo de Projetos</h3>
                            <button onClick={() => setIsProjectModalOpen(true)} className={styles.btnAddProject}><Plus size={16}/> Novo Projeto</button>
                        </div>
                        
                        <div className={styles.kanbanBoard}>
                            {columns.map(col => (
                                <div key={col.id} className={styles.kanbanCol}>
                                    <div className={styles.colHeader} style={{borderTopColor: col.color}}>
                                        {col.title} <span className={styles.count}>{projects.filter(p => p.status === col.id).length}</span>
                                    </div>
                                    <div className={styles.colBody}>
                                        {projects.filter(p => p.status === col.id).map(proj => (
                                            <div key={proj.id} className={styles.projectCard}>
                                                <div className={styles.projTitle}>{proj.title}</div>
                                                <div className={styles.projVal}>R$ {Number(proj.value).toFixed(2)}</div>
                                                {proj.due_date && <div className={styles.projDate}>Entrega: {new Date(proj.due_date).toLocaleDateString()}</div>}
                                                
                                                <div className={styles.projActions}>
                                                    <select 
                                                        value={proj.status} 
                                                        onChange={(e) => handleMoveProject(proj.id, e.target.value)}
                                                        className={styles.statusSelect}
                                                    >
                                                        {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                                                    </select>
                                                    <button onClick={() => handleDeleteProject(proj.id)} className={styles.btnTrash}><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL NOVO PROJETO */}
            <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="Novo Projeto / Oportunidade">
                <form onSubmit={handleAddProject}>
                    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        <div><label>Título</label><input className={styles.input} value={newProject.title} onChange={e=>setNewProject({...newProject, title:e.target.value})} required/></div>
                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                            <div><label>Valor Estimado</label><input type="number" className={styles.input} value={newProject.value} onChange={e=>setNewProject({...newProject, value:e.target.value})} /></div>
                            <div><label>Previsão</label><input type="date" className={styles.input} value={newProject.due_date} onChange={e=>setNewProject({...newProject, due_date:e.target.value})} /></div>
                        </div>
                        <div><label>Status Inicial</label>
                            <select className={styles.input} value={newProject.status} onChange={e=>setNewProject({...newProject, status:e.target.value})}>
                                {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div><label>Descrição</label><textarea className={styles.input} value={newProject.description} onChange={e=>setNewProject({...newProject, description:e.target.value})} style={{height:'80px'}}/></div>
                        <button type="submit" className={styles.btnSave}>Criar Projeto</button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}