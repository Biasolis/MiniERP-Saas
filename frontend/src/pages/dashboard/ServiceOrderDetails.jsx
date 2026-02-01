import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './ServiceOrderDetails.module.css';
import { 
    ArrowLeft, Printer, Plus, Trash2, Check, AlertTriangle, 
    Edit, FileText, Scroll, Play, Pause, RefreshCw 
} from 'lucide-react';

export default function ServiceOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);

    // Estados de Dados
    const [os, setOS] = useState(null);
    const [items, setItems] = useState([]);
    const [customFields, setCustomFields] = useState([]); 
    const [products, setProducts] = useState([]); 
    const [loading, setLoading] = useState(true);

    // Estado do Modal de Edição
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState({
        equipment: '',
        description: '',
        priority: 'normal',
        customValues: {} 
    });

    // Estado do Modal de Finalização
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

    // Estado do Formulário de Novo Item
    const [newItem, setNewItem] = useState({ 
        product_id: '', description: '', quantity: 1, unit_price: 0 
    });

    useEffect(() => {
        loadData();
        loadProducts();
    }, [id]);

    async function loadData() {
        try {
            const res = await api.get(`/service-orders/${id}`);
            setOS(res.data.os);
            setItems(res.data.items);
            setCustomFields(res.data.custom_fields || []);
        } catch (error) {
            addToast({type:'error', title: 'Erro ao carregar detalhes da OS'});
            navigate('/dashboard/service-orders');
        } finally {
            setLoading(false);
        }
    }

    async function loadProducts() {
        try { const res = await api.get('/products'); setProducts(res.data); } catch(e) {}
    }

    // --- EDIÇÃO DA OS ---
    const openEditModal = () => {
        const currentCustomValues = {};
        customFields.forEach(field => {
            currentCustomValues[field.id] = field.value || '';
        });

        setEditData({
            equipment: os.equipment,
            description: os.description,
            priority: os.priority,
            customValues: currentCustomValues
        });
        setIsEditModalOpen(true);
    };

    const handleEditChange = (field, value) => {
        setEditData(prev => ({ ...prev, [field]: value }));
    };

    const handleCustomValueChange = (fieldId, value) => {
        setEditData(prev => ({
            ...prev,
            customValues: {
                ...prev.customValues,
                [fieldId]: value
            }
        }));
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        try {
            await api.put(`/service-orders/${id}`, editData);
            addToast({ type: 'success', title: 'OS atualizada com sucesso!' });
            setIsEditModalOpen(false);
            loadData(); 
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao salvar alterações.' });
        }
    };

    // --- ITENS ---
    const handleProductChange = (prodId) => {
        const prod = products.find(p => p.id === Number(prodId));
        if (prod) {
            setNewItem({ ...newItem, product_id: prodId, description: prod.name, unit_price: Number(prod.sale_price) });
        } else {
            setNewItem({...newItem, product_id: '', description: '', unit_price: 0});
        }
    };

    async function handleAddItem(e) {
        e.preventDefault();
        if (!newItem.description || newItem.quantity <= 0) return;
        try {
            await api.post(`/service-orders/${id}/items`, newItem);
            addToast({type:'success', title: 'Item adicionado!'});
            setNewItem({ product_id: '', description: '', quantity: 1, unit_price: 0 });
            loadData(); 
        } catch (error) { addToast({type:'error', title: 'Erro ao adicionar item'}); }
    }

    async function handleRemoveItem(itemId) {
        if(!confirm('Remover item?')) return;
        try { await api.delete(`/service-orders/${id}/items/${itemId}`); loadData(); } catch(e) {}
    }

    // --- CONTROLE DE STATUS ---
    const updateStatus = async (newStatus, confirmMsg) => {
        if(confirmMsg && !confirm(confirmMsg)) return;
        try {
            await api.patch(`/service-orders/${id}/status`, { status: newStatus });
            addToast({type:'success', title: 'Status atualizado!'});
            loadData();
        } catch(e) {
            addToast({type:'error', title: 'Erro ao atualizar status.'});
        }
    };

    const handleFinishClick = () => setIsFinishModalOpen(true);
    
    const confirmFinish = async () => {
        try {
            await api.patch(`/service-orders/${id}/status`, { status: 'completed' });
            addToast({type:'success', title: `OS Finalizada com sucesso!`});
            setIsFinishModalOpen(false);
            loadData();
        } catch(e) {
            addToast({type:'error', title: 'Erro ao finalizar OS.'});
        }
    };

    // --- IMPRESSÃO ---
    const handlePrint = (mode) => {
        const url = `/print/os/${id}?mode=${mode}`;
        window.open(url, '_blank');
    };

    if (loading) return <DashboardLayout><div style={{padding:'2rem'}}>Carregando OS...</div></DashboardLayout>;
    if (!os) return null;

    const getStatusLabel = (s) => {
        const map = { 'open': 'Aberta', 'in_progress': 'Em Andamento', 'completed': 'Finalizada', 'waiting': 'Aguardando' };
        return map[s] || s;
    };

    return (
        <DashboardLayout>
            {/* --- CABEÇALHO --- */}
            <div className={styles.header}>
                <button onClick={() => navigate('/dashboard/service-orders')} className={styles.backBtn}>
                    <ArrowLeft size={16} /> Voltar
                </button>
                
                <div style={{display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap'}}>
                    
                    {/* GRUPO DE IMPRESSÃO */}
                    <div className={styles.printGroup}>
                        <button onClick={() => handlePrint('thermal')} className={styles.btnPrint} title="Cupom 80mm">
                            <Scroll size={16} /> Cupom
                        </button>
                        <button onClick={() => handlePrint('a4')} className={styles.btnPrint} title="Folha A4">
                            <FileText size={16} /> A4
                        </button>
                    </div>

                    <div className={styles.separator}></div>

                    {/* --- BOTÕES DE STATUS PADRONIZADOS --- */}
                    
                    {os.status !== 'completed' && (
                        <button onClick={openEditModal} className={styles.btnEdit}>
                            <Edit size={16} /> Editar
                        </button>
                    )}

                    {/* ABERTA -> INICIAR */}
                    {os.status === 'open' && (
                        <button onClick={() => updateStatus('in_progress')} className={styles.btnStart}>
                            <Play size={16} /> Iniciar
                        </button>
                    )}

                    {/* EM ANDAMENTO -> PAUSAR */}
                    {os.status === 'in_progress' && (
                        <button onClick={() => updateStatus('waiting')} className={styles.btnWait}>
                            <Pause size={16} /> Pausar
                        </button>
                    )}

                    {/* AGUARDANDO -> RETOMAR */}
                    {os.status === 'waiting' && (
                        <button onClick={() => updateStatus('in_progress')} className={styles.btnStart}>
                            <Play size={16} /> Retomar
                        </button>
                    )}

                    {/* FINALIZAR (Sempre disponível se não fechada) */}
                    {os.status !== 'completed' && (
                        <button onClick={handleFinishClick} className={styles.btnFinish}>
                            <Check size={16} /> Finalizar
                        </button>
                    )}
                    
                    {/* REABRIR (Apenas se concluída) */}
                    {os.status === 'completed' && (
                        <button onClick={() => updateStatus('open', 'Deseja reabrir esta OS? O estoque será estornado.')} className={styles.btnReopen}>
                            <RefreshCw size={16} /> Reabrir
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.gridContainer}>
                
                {/* --- COLUNA ESQUERDA: DADOS DA OS --- */}
                <div className={styles.leftCol}>
                    <div className={styles.card}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <h3>OS #{String(os.id).padStart(6, '0')}</h3>
                            <span className={`${styles.badge} ${styles[os.status]}`}>
                                {getStatusLabel(os.status)}
                            </span>
                        </div>
                        
                        <div className={styles.divider}></div>
                        
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Cliente:</span>
                            <strong>{os.client_name}</strong>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Equipamento:</span>
                            <span>{os.equipment}</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.label}>Prioridade:</span>
                            <span style={{textTransform:'capitalize'}}>{os.priority === 'high' ? 'Alta' : os.priority === 'low' ? 'Baixa' : 'Normal'}</span>
                        </div>

                        {/* CAMPOS PERSONALIZADOS */}
                        {customFields.length > 0 && (
                            <div className={styles.customFieldsBox}>
                                {customFields.map((field, idx) => (
                                    <div key={idx} className={styles.infoRow}>
                                        <span className={styles.label}>{field.label}:</span>
                                        <span>{field.value || '-'}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className={styles.divider}></div>
                        
                        <div>
                            <span className={styles.label}>Descrição:</span>
                            <p className={styles.descriptionBox}>{os.description || 'Sem descrição.'}</p>
                        </div>
                    </div>

                    {/* --- FORM ADICIONAR ITEM --- */}
                    {os.status !== 'completed' && (
                        <div className={styles.card}>
                            <h4>Adicionar Item / Serviço</h4>
                            <form onSubmit={handleAddItem} style={{marginTop:'15px'}}>
                                <div style={{marginBottom:'10px'}}>
                                    <select className={styles.input} value={newItem.product_id} onChange={e => handleProductChange(e.target.value)}>
                                        <option value="">-- Buscar Produto (Opcional) --</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div style={{marginBottom:'10px'}}>
                                    <input className={styles.input} placeholder="Descrição do Serviço/Item" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} required />
                                </div>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                    <input type="number" className={styles.input} value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} min="1" placeholder="Qtd" />
                                    <input type="number" step="0.01" className={styles.input} value={newItem.unit_price} onChange={e => setNewItem({...newItem, unit_price: e.target.value})} placeholder="Preço" />
                                </div>
                                <button type="submit" className={styles.btnAdd}><Plus size={18} /> Adicionar</button>
                            </form>
                        </div>
                    )}
                </div>

                {/* --- COLUNA DIREITA: ITENS --- */}
                <div className={styles.rightCol}>
                    <div className={styles.card}>
                        <h3>Itens e Serviços</h3>
                        <div className={styles.tableWrapper}>
                            <table className={styles.itemTable}>
                                <thead><tr><th>Descrição</th><th style={{textAlign:'center'}}>Qtd</th><th style={{textAlign:'right'}}>Unit.</th><th style={{textAlign:'right'}}>Total</th><th></th></tr></thead>
                                <tbody>
                                    {items.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.description}</td>
                                            <td style={{textAlign:'center'}}>{item.quantity}</td>
                                            <td style={{textAlign:'right'}}>R$ {Number(item.unit_price).toFixed(2)}</td>
                                            <td style={{textAlign:'right', fontWeight:'bold'}}>R$ {Number(item.subtotal).toFixed(2)}</td>
                                            <td>{os.status !== 'completed' && <button onClick={() => handleRemoveItem(item.id)} className={styles.btnTrash}><Trash2 size={14}/></button>}</td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:'2rem', color:'#9ca3af'}}>Nenhum item adicionado.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className={styles.totalBox}><span>Total Geral:</span><h2>R$ {Number(os.total_amount).toFixed(2)}</h2></div>
                    </div>
                </div>
            </div>

            {/* --- MODAL DE EDIÇÃO --- */}
            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Editar Ordem de Serviço">
                <form onSubmit={handleSaveEdit}>
                    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                        <div>
                            <label className={styles.inputLabel}>Equipamento / Objeto</label>
                            <input className={styles.input} value={editData.equipment} onChange={e => handleEditChange('equipment', e.target.value)} required />
                        </div>
                        
                        {customFields.length > 0 && (
                            <div style={{background:'#f9fafb', padding:'10px', borderRadius:'6px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                {customFields.map(field => (
                                    <div key={field.id}>
                                        <label className={styles.inputLabel}>{field.label}</label>
                                        <input 
                                            className={styles.input} 
                                            value={editData.customValues[field.id] || ''} 
                                            onChange={e => handleCustomValueChange(field.id, e.target.value)} 
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div>
                            <label className={styles.inputLabel}>Prioridade</label>
                            <select className={styles.input} value={editData.priority} onChange={e => handleEditChange('priority', e.target.value)}>
                                <option value="low">Baixa</option>
                                <option value="normal">Normal</option>
                                <option value="high">Alta</option>
                            </select>
                        </div>

                        <div>
                            <label className={styles.inputLabel}>Descrição / Problema</label>
                            <textarea className={styles.input} style={{minHeight:'80px'}} value={editData.description} onChange={e => handleEditChange('description', e.target.value)} />
                        </div>

                        <button type="submit" className={styles.btnAdd} style={{marginTop:'10px'}}>Salvar Alterações</button>
                    </div>
                </form>
            </Modal>

            {/* --- MODAL DE FINALIZAÇÃO --- */}
            <Modal isOpen={isFinishModalOpen} onClose={() => setIsFinishModalOpen(false)} title="Finalizar Ordem de Serviço">
                <div style={{textAlign:'center', padding:'10px'}}>
                    <div style={{background:'#d1fae5', color:'#065f46', padding:'15px', borderRadius:'50%', width:'60px', height:'60px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 15px'}}>
                        <Check size={32} />
                    </div>
                    <h3 style={{marginBottom:'10px', color:'#1f2937'}}>Tem certeza que deseja finalizar?</h3>
                    <p style={{color:'#6b7280', marginBottom:'20px', lineHeight:'1.5'}}>
                        Ao confirmar, o estoque dos produtos será baixado e uma receita no valor de <strong>R$ {Number(os.total_amount).toFixed(2)}</strong> será lançada no financeiro.
                    </p>
                    <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                        <button 
                            onClick={() => setIsFinishModalOpen(false)} 
                            style={{background:'white', border:'1px solid #d1d5db', padding:'10px 20px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', color:'#374151'}}
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={confirmFinish} 
                            style={{background:'#059669', border:'none', padding:'10px 20px', borderRadius:'6px', cursor:'pointer', fontWeight:'600', color:'white', display:'flex', alignItems:'center', gap:'5px'}}
                        >
                            <Check size={18} /> Confirmar
                        </button>
                    </div>
                </div>
            </Modal>

        </DashboardLayout>
    );
}