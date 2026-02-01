import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './ServiceOrderDetails.module.css'; // Reutilizando CSS
import { ArrowLeft, Save, Printer, CheckCircle, Plus, Trash2, ShoppingCart, Wrench } from 'lucide-react';

export default function QuoteDetails() {
    const { id } = useParams(); // Se for 'new', é criação
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);
    const isNew = id === 'new';

    const [loading, setLoading] = useState(!isNew);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    
    // Estado do Orçamento
    const [quote, setQuote] = useState({ client_id: '', client_name: '', discount: 0, valid_until: '', notes: '' });
    const [items, setItems] = useState([]);
    
    // Item sendo adicionado
    const [newItem, setNewItem] = useState({ product_id: '', description: '', quantity: 1, unit_price: 0 });

    useEffect(() => {
        loadResources();
        if (!isNew) loadQuote();
    }, [id]);

    async function loadResources() {
        try {
            const [cRes, pRes] = await Promise.all([api.get('/clients'), api.get('/products')]);
            setClients(cRes.data);
            setProducts(pRes.data);
        } catch(e){}
    }

    async function loadQuote() {
        try {
            const res = await api.get(`/quotes/${id}`);
            setQuote(res.data.quote);
            setItems(res.data.items);
        } catch(e){ navigate('/dashboard/quotes'); } 
        finally { setLoading(false); }
    }

    // --- AÇÕES ---
    const handleSave = async () => {
        try {
            const payload = { ...quote, items };
            if (isNew) {
                const res = await api.post('/quotes', payload);
                addToast({type:'success', title:'Criado!'});
                navigate(`/dashboard/quotes/${res.data.id}`);
            } else {
                // Implementar update se necessário, por enquanto foca em criar/converter
                addToast({type:'info', title:'Edição não implementada nesta versão rápida.'});
            }
        } catch(e) { addToast({type:'error', title:'Erro ao salvar'}); }
    };

    const handleConvert = async (target) => {
        if(!confirm(`Deseja converter este orçamento em ${target === 'sale' ? 'Venda' : 'OS'}?`)) return;
        try {
            const res = await api.post(`/quotes/${id}/convert`, { target });
            addToast({type:'success', title:'Convertido com sucesso!'});
            // Redireciona para o novo registro
            const path = target === 'sale' ? '/dashboard/sales' : `/dashboard/service-orders/${res.data.newId}`;
            navigate(path);
        } catch(e) { addToast({type:'error', title:'Erro ao converter'}); }
    };

    // --- MANIPULAÇÃO DE ITENS ---
    const addItem = (e) => {
        e.preventDefault();
        if (!newItem.description) return;
        setItems([...items, { ...newItem, subtotal: newItem.quantity * newItem.unit_price }]);
        setNewItem({ product_id: '', description: '', quantity: 1, unit_price: 0 });
    };

    const handleProductSelect = (pid) => {
        const p = products.find(x => x.id === Number(pid));
        if (p) setNewItem({ ...newItem, product_id: pid, description: p.name, unit_price: Number(p.sale_price) });
    };

    if (loading) return <DashboardLayout><p>Carregando...</p></DashboardLayout>;

    const total = items.reduce((acc, i) => acc + Number(i.subtotal), 0) - Number(quote.discount || 0);

    return (
        <DashboardLayout>
            <div className={styles.header}>
                <button onClick={() => navigate('/dashboard/quotes')} className={styles.backBtn}><ArrowLeft size={16} /> Voltar</button>
                <div style={{display:'flex', gap:10}}>
                    {isNew ? (
                        <button onClick={handleSave} className={styles.btnFinish}><Save size={16}/> Salvar Orçamento</button>
                    ) : (
                        <>
                            <button onClick={() => window.print()} className={styles.btnPrint}><Printer size={16}/> Imprimir</button>
                            {quote.status !== 'converted' && (
                                <>
                                    <button onClick={() => handleConvert('sale')} className={styles.btnAction} style={{background:'#10b981'}}>
                                        <ShoppingCart size={16}/> Virar Venda
                                    </button>
                                    <button onClick={() => handleConvert('service_order')} className={styles.btnAction} style={{background:'#3b82f6'}}>
                                        <Wrench size={16}/> Virar OS
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className={styles.gridContainer}>
                {/* COLUNA ESQUERDA: DADOS */}
                <div className={styles.leftCol}>
                    <div className={styles.card}>
                        <h3>Dados do Cliente</h3>
                        <div style={{marginBottom:10}}>
                            <label className={styles.inputLabel}>Cliente</label>
                            <select className={styles.input} value={quote.client_id} onChange={e => {
                                const c = clients.find(x=>x.id==e.target.value);
                                setQuote({...quote, client_id: e.target.value, client_name: c ? c.name : ''});
                            }} disabled={!isNew}>
                                <option value="">-- Selecione --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        {!quote.client_id && (
                            <div style={{marginBottom:10}}>
                                <label className={styles.inputLabel}>Nome (Avulso)</label>
                                <input className={styles.input} value={quote.client_name} onChange={e=>setQuote({...quote, client_name:e.target.value})} disabled={!isNew}/>
                            </div>
                        )}
                        <div style={{marginBottom:10}}>
                            <label className={styles.inputLabel}>Validade</label>
                            <input type="date" className={styles.input} value={quote.valid_until ? quote.valid_until.split('T')[0] : ''} onChange={e=>setQuote({...quote, valid_until:e.target.value})} disabled={!isNew}/>
                        </div>
                        <div>
                            <label className={styles.inputLabel}>Observações</label>
                            <textarea className={styles.input} value={quote.notes} onChange={e=>setQuote({...quote, notes:e.target.value})} disabled={!isNew}/>
                        </div>
                    </div>

                    {isNew && (
                        <div className={styles.card}>
                            <h4>Adicionar Item</h4>
                            <form onSubmit={addItem} style={{marginTop:10}}>
                                <div style={{marginBottom:10}}>
                                    <select className={styles.input} value={newItem.product_id} onChange={e=>handleProductSelect(e.target.value)}>
                                        <option value="">-- Produto (Opcional) --</option>
                                        {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div style={{marginBottom:10}}>
                                    <input className={styles.input} placeholder="Descrição" value={newItem.description} onChange={e=>setNewItem({...newItem, description:e.target.value})} required/>
                                </div>
                                <div style={{display:'flex', gap:10}}>
                                    <input type="number" className={styles.input} placeholder="Qtd" value={newItem.quantity} onChange={e=>setNewItem({...newItem, quantity:e.target.value})}/>
                                    <input type="number" className={styles.input} placeholder="Preço" value={newItem.unit_price} onChange={e=>setNewItem({...newItem, unit_price:e.target.value})}/>
                                </div>
                                <button className={styles.btnAdd}>+ Adicionar</button>
                            </form>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: ITENS */}
                <div className={styles.rightCol}>
                    <div className={styles.card}>
                        <h3>Itens do Orçamento</h3>
                        <table className={styles.itemTable}>
                            <thead><tr><th>Item</th><th>Qtd</th><th>Total</th><th></th></tr></thead>
                            <tbody>
                                {items.map((it, idx) => (
                                    <tr key={idx}>
                                        <td>{it.description}</td>
                                        <td>{it.quantity}</td>
                                        <td>R$ {Number(it.subtotal).toFixed(2)}</td>
                                        <td>{isNew && <button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className={styles.btnTrash}><Trash2 size={14}/></button>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className={styles.totalBox}>
                            <span>Total:</span> <h2>R$ {total.toFixed(2)}</h2>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}