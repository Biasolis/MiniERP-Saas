import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './ServiceOrderDetails.module.css'; // Reusa CSS
import { ArrowLeft, Save, Plus, Trash2, Factory, Calculator, Play, Check } from 'lucide-react';

export default function PcpDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [products, setProducts] = useState([]); // Matéria prima e produtos finais
    const [settings, setSettings] = useState({ drivers: [], customFields: [] });

    // Estado da Ordem
    const [order, setOrder] = useState({ product_id: '', quantity: 1, due_date: '', notes: '', customValues: {} });
    const [items, setItems] = useState([]); // Insumos
    const [costs, setCosts] = useState([]); // Drivers aplicados

    // Novo Item
    const [newItem, setNewItem] = useState({ product_id: '', quantity: 1, unit_cost: 0 });

    useEffect(() => {
        loadInitialData();
        if (!isNew) loadOrder();
    }, [id]);

    async function loadInitialData() {
        try {
            const [pRes, sRes] = await Promise.all([api.get('/products'), api.get('/pcp/settings')]);
            setProducts(pRes.data);
            setSettings(sRes.data); // Drivers e Campos
            
            // Se for nova, inicializa os custos com os valores padrão
            if (isNew) {
                setCosts(sRes.data.drivers.map(d => ({
                    driver_id: d.id,
                    name: d.name,
                    unit: d.unit,
                    value: d.default_value // Valor inicial sugerido
                })));
            }
        } catch(e) {}
    }

    async function loadOrder() {
        try {
            const res = await api.get(`/pcp/orders/${id}`);
            setOrder(res.data.order);
            setItems(res.data.items);
            setCosts(res.data.costs); // Carrega custos salvos
            
            // Mapeia campos personalizados
            const cv = {};
            res.data.customFields.forEach(f => cv[f.id] = f.value);
            setOrder(prev => ({...prev, customValues: cv}));
        } catch(e){ navigate('/dashboard/pcp'); } 
        finally { setLoading(false); }
    }

    // --- CÁLCULOS ---
    const totalRawMaterial = items.reduce((acc, i) => acc + (i.quantity * i.unit_cost), 0);
    const totalOpCost = costs.reduce((acc, c) => acc + Number(c.value), 0);
    const totalCost = totalRawMaterial + totalOpCost;
    const unitCost = order.quantity > 0 ? (totalCost / order.quantity) : 0;

    // --- AÇÕES ---
    const handleSave = async () => {
        try {
            const payload = { ...order, items, costs };
            if (isNew) {
                const res = await api.post('/pcp/orders', payload);
                addToast({type:'success', title:'OP Criada!'});
                navigate(`/dashboard/pcp/${res.data.id}`);
            }
        } catch(e) { addToast({type:'error', title:'Erro ao salvar'}); }
    };

    const handleUpdateStatus = async (newStatus) => {
        if(!confirm('Alterar status? Isso pode movimentar estoque.')) return;
        try {
            await api.patch(`/pcp/orders/${id}/status`, { status: newStatus });
            addToast({type:'success', title:'Status atualizado!'});
            // Recarrega
            if(newStatus === 'completed') navigate('/dashboard/pcp');
            else loadOrder();
        } catch(e) { addToast({type:'error', title:'Erro ao atualizar'}); }
    };

    const addItem = (e) => {
        e.preventDefault();
        const p = products.find(x => x.id == newItem.product_id);
        if(!p) return;
        setItems([...items, { ...newItem, name: p.name, unit_cost: Number(p.cost_price || 0) }]); // Usa preço de custo
        setNewItem({ product_id: '', quantity: 1, unit_cost: 0 });
    };

    if (loading) return <DashboardLayout><p>Carregando...</p></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className={styles.header}>
                <button onClick={() => navigate('/dashboard/pcp')} className={styles.backBtn}><ArrowLeft size={16} /> Voltar</button>
                <div style={{display:'flex', gap:10}}>
                    {isNew && <button onClick={handleSave} className={styles.btnFinish}><Save size={16}/> Criar Ordem</button>}
                    {!isNew && order.status === 'planned' && <button onClick={()=>handleUpdateStatus('in_production')} className={styles.btnAction} style={{background:'#3b82f6'}}><Play size={16}/> Iniciar Produção</button>}
                    {!isNew && order.status === 'in_production' && <button onClick={()=>handleUpdateStatus('completed')} className={styles.btnFinish}><Check size={16}/> Concluir (Baixar Estoque)</button>}
                </div>
            </div>

            <div className={styles.gridContainer}>
                {/* ESQUERDA: DADOS */}
                <div className={styles.leftCol}>
                    <div className={styles.card}>
                        <h3>Planejamento</h3>
                        <div style={{marginBottom:10}}>
                            <label className={styles.inputLabel}>Produto a Produzir</label>
                            <select className={styles.input} value={order.product_id} onChange={e=>setOrder({...order, product_id:e.target.value})} disabled={!isNew}>
                                <option value="">-- Selecione --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} (Est: {p.stock})</option>)}
                            </select>
                        </div>
                        <div style={{display:'flex', gap:10}}>
                            <div><label className={styles.inputLabel}>Qtd Planejada</label><input type="number" className={styles.input} value={order.quantity} onChange={e=>setOrder({...order, quantity:e.target.value})} disabled={!isNew}/></div>
                            <div><label className={styles.inputLabel}>Data Entrega</label><input type="date" className={styles.input} value={order.due_date ? order.due_date.split('T')[0] : ''} onChange={e=>setOrder({...order, due_date:e.target.value})} disabled={!isNew}/></div>
                        </div>
                        
                        {/* Campos Personalizados */}
                        {settings.customFields.length > 0 && (
                            <div className={styles.customFieldsBox} style={{marginTop:10}}>
                                {settings.customFields.map(f => (
                                    <div key={f.id} style={{marginBottom:5}}>
                                        <label className={styles.inputLabel}>{f.label}</label>
                                        <input className={styles.input} value={order.customValues?.[f.id] || ''} onChange={e => setOrder(prev => ({...prev, customValues: {...prev.customValues, [f.id]: e.target.value}}))} disabled={!isNew} />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* CUSTOS OPERACIONAIS (DRIVERS) */}
                    <div className={styles.card}>
                        <h3><Calculator size={18}/> Custos Operacionais</h3>
                        <p style={{fontSize:'0.8rem', color:'#666', marginBottom:10}}>Ajuste os valores dos drivers para esta ordem.</p>
                        {costs.map((cost, idx) => (
                            <div key={idx} style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5, paddingBottom:5, borderBottom:'1px dashed #eee'}}>
                                <span style={{fontSize:'0.9rem'}}>{cost.name} ({cost.unit})</span>
                                <input 
                                    type="number" className={styles.input} style={{width:'100px', textAlign:'right'}} 
                                    value={cost.value} 
                                    onChange={e => {
                                        const newCosts = [...costs];
                                        newCosts[idx].value = e.target.value;
                                        setCosts(newCosts);
                                    }}
                                    disabled={!isNew}
                                />
                            </div>
                        ))}
                        <div style={{textAlign:'right', fontWeight:'bold', marginTop:10}}>Subtotal Op: R$ {totalOpCost.toFixed(2)}</div>
                    </div>
                </div>

                {/* DIREITA: INSUMOS */}
                <div className={styles.rightCol}>
                    <div className={styles.card}>
                        <h3>Matéria Prima / Insumos</h3>
                        
                        {isNew && (
                            <form onSubmit={addItem} style={{background:'#f9fafb', padding:10, borderRadius:6, marginBottom:10}}>
                                <select className={styles.input} value={newItem.product_id} onChange={e=>setNewItem({...newItem, product_id:e.target.value})} style={{marginBottom:5}}>
                                    <option value="">-- Adicionar Insumo --</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (R$ {p.cost_price})</option>)}
                                </select>
                                <div style={{display:'flex', gap:5}}>
                                    <input type="number" className={styles.input} placeholder="Qtd" value={newItem.quantity} onChange={e=>setNewItem({...newItem, quantity:e.target.value})}/>
                                    <button className={styles.btnAdd}><Plus size={16}/></button>
                                </div>
                            </form>
                        )}

                        <table className={styles.itemTable}>
                            <thead><tr><th>Item</th><th>Qtd</th><th>Custo</th><th></th></tr></thead>
                            <tbody>
                                {items.map((it, idx) => (
                                    <tr key={idx}>
                                        <td>{it.name || it.product_name}</td>
                                        <td>{it.quantity}</td>
                                        <td>R$ {(it.quantity * it.unit_cost).toFixed(2)}</td>
                                        <td>{isNew && <button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className={styles.btnTrash}><Trash2 size={14}/></button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={styles.totalBox}>
                            <div style={{fontSize:'0.9rem'}}>Matéria Prima: R$ {totalRawMaterial.toFixed(2)}</div>
                            <div style={{fontSize:'0.9rem'}}>Operacional: R$ {totalOpCost.toFixed(2)}</div>
                            <div style={{fontSize:'1.2rem', marginTop:5, color:'var(--primary-color)'}}>Custo Total: R$ {totalCost.toFixed(2)}</div>
                            <div style={{fontSize:'0.8rem', color:'#666'}}>Unitário: R$ {unitCost.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}