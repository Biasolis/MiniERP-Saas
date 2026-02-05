import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './ServiceOrderDetails.module.css'; // Usando o mesmo CSS das OS para manter padrão
import { ArrowLeft, Save, Printer, ShoppingCart, Wrench, Trash2, FileText, Scroll } from 'lucide-react';

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
        } catch(e){ 
            console.error(e);
            navigate('/dashboard/quotes'); 
        } finally { 
            setLoading(false); 
        }
    }

    // --- AÇÕES ---
    const handleSave = async () => {
        try {
            const payload = { ...quote, items };
            if (isNew) {
                const res = await api.post('/quotes', payload);
                addToast({type:'success', title:'Criado!', message: 'Orçamento salvo com sucesso.'});
                navigate(`/dashboard/quotes/${res.data.id}`);
            } else {
                addToast({type:'info', title:'Aviso', message: 'Edição não implementada nesta versão rápida.'});
            }
        } catch(e) { 
            addToast({type:'error', title:'Erro ao salvar', message: e.response?.data?.message || 'Erro desconhecido'}); 
        }
    };

    const handleConvert = async (target) => {
        if(!confirm(`Deseja converter este orçamento em ${target === 'sale' ? 'Venda' : 'OS'}?`)) return;
        try {
            const res = await api.post(`/quotes/${id}/convert`, { target });
            addToast({type:'success', title:'Convertido!', message: 'Registro gerado com sucesso.'});
            
            // Redireciona para o novo registro
            if (target === 'sale') {
                navigate('/dashboard/sales'); // Poderia ir para detalhes se tivesse a rota
            } else {
                navigate(`/dashboard/service-orders/${res.data.newId}`);
            }
        } catch(e) { 
            addToast({type:'error', title:'Erro ao converter', message: e.response?.data?.message || 'Erro.'}); 
        }
    };

    // --- IMPRESSÃO CORRIGIDA (Backend PDF/HTML) ---
    const handlePrint = async (mode) => {
        try {
            addToast({ type: 'info', title: 'Gerando...', message: 'Preparando impressão.' });

            // Chama a rota que criamos no backend
            const response = await api.get(`/quotes/${id}/print?mode=${mode}`, { 
                responseType: 'blob' 
            });

            // Cria URL temporária e abre
            const file = new Blob([response.data], { type: 'text/html' });
            const fileURL = URL.createObjectURL(file);
            const printWindow = window.open(fileURL, '_blank');

            if (printWindow) {
                printWindow.onload = () => printWindow.print();
            }
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', title: 'Erro', message: 'Falha ao gerar impressão. Verifique pop-ups.' });
        }
    };

    // --- MANIPULAÇÃO DE ITENS ---
    const addItem = (e) => {
        e.preventDefault();
        if (!newItem.description || newItem.quantity <= 0) return;
        
        const subtotal = Number(newItem.quantity) * Number(newItem.unit_price);
        setItems([...items, { ...newItem, subtotal }]);
        
        setNewItem({ product_id: '', description: '', quantity: 1, unit_price: 0 });
    };

    const handleProductSelect = (pid) => {
        const p = products.find(x => x.id === Number(pid));
        if (p) {
            setNewItem({ ...newItem, product_id: pid, description: p.name, unit_price: Number(p.sale_price) });
        } else {
            setNewItem({ ...newItem, product_id: '', description: '', unit_price: 0 });
        }
    };

    if (loading) return <DashboardLayout><div style={{padding:'20px'}}>Carregando...</div></DashboardLayout>;

    const subtotalItems = items.reduce((acc, i) => acc + Number(i.subtotal), 0);
    const total = subtotalItems - Number(quote.discount || 0);

    return (
        <DashboardLayout>
            <div className={styles.header}>
                <button onClick={() => navigate('/dashboard/quotes')} className={styles.backBtn}>
                    <ArrowLeft size={16} /> Voltar
                </button>
                
                <div style={{display:'flex', gap:10, alignItems: 'center'}}>
                    {isNew ? (
                        <button onClick={handleSave} className={styles.btnFinish}>
                            <Save size={16}/> Salvar Orçamento
                        </button>
                    ) : (
                        <>
                            {/* GRUPO DE IMPRESSÃO */}
                            <div className={styles.printGroup} style={{marginRight: '10px', display: 'flex', gap: '5px'}}>
                                <button onClick={() => handlePrint('a4')} className={styles.btnPrint} title="Imprimir A4">
                                    <FileText size={16}/> A4
                                </button>
                                <button onClick={() => handlePrint('thermal')} className={styles.btnPrint} title="Imprimir Cupom">
                                    <Scroll size={16}/> Cupom
                                </button>
                            </div>

                            {quote.status !== 'converted' && quote.status !== 'approved' && (
                                <>
                                    <button onClick={() => handleConvert('sale')} className={styles.btnAction} style={{background:'#10b981', border:'none', color:'white', padding:'8px 12px', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}>
                                        <ShoppingCart size={16}/> Virar Venda
                                    </button>
                                    <button onClick={() => handleConvert('service_order')} className={styles.btnAction} style={{background:'#3b82f6', border:'none', color:'white', padding:'8px 12px', borderRadius:'6px', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px'}}>
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
                        <h3>Dados do Orçamento</h3>
                        
                        <div style={{marginBottom:10}}>
                            <label className={styles.inputLabel}>Cliente</label>
                            <select className={styles.input} value={quote.client_id || ''} onChange={e => {
                                const c = clients.find(x=>x.id==e.target.value);
                                setQuote({...quote, client_id: e.target.value, client_name: c ? c.name : ''});
                            }} disabled={!isNew}>
                                <option value="">-- Selecione um Cliente --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        {/* Se não selecionou cliente cadastrado, permite digitar nome avulso */}
                        {!quote.client_id && (
                            <div style={{marginBottom:10}}>
                                <label className={styles.inputLabel}>Nome do Cliente (Avulso)</label>
                                <input className={styles.input} value={quote.client_name || ''} onChange={e=>setQuote({...quote, client_name:e.target.value})} disabled={!isNew} placeholder="Digite o nome..."/>
                            </div>
                        )}

                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: 10}}>
                            <div>
                                <label className={styles.inputLabel}>Validade</label>
                                <input type="date" className={styles.input} value={quote.valid_until ? quote.valid_until.split('T')[0] : ''} onChange={e=>setQuote({...quote, valid_until:e.target.value})} disabled={!isNew}/>
                            </div>
                            <div>
                                <label className={styles.inputLabel}>Desconto (R$)</label>
                                <input type="number" step="0.01" className={styles.input} value={quote.discount} onChange={e=>setQuote({...quote, discount:e.target.value})} disabled={!isNew}/>
                            </div>
                        </div>

                        <div>
                            <label className={styles.inputLabel}>Observações</label>
                            <textarea className={styles.input} rows={3} value={quote.notes || ''} onChange={e=>setQuote({...quote, notes:e.target.value})} disabled={!isNew} placeholder="Detalhes adicionais..."/>
                        </div>
                    </div>

                    {isNew && (
                        <div className={styles.card}>
                            <h4>Adicionar Item</h4>
                            <form onSubmit={addItem} style={{marginTop:10}}>
                                <div style={{marginBottom:10}}>
                                    <select className={styles.input} value={newItem.product_id} onChange={e=>handleProductSelect(e.target.value)}>
                                        <option value="">-- Buscar Produto (Opcional) --</option>
                                        {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div style={{marginBottom:10}}>
                                    <input className={styles.input} placeholder="Descrição do Item/Serviço" value={newItem.description} onChange={e=>setNewItem({...newItem, description:e.target.value})} required/>
                                </div>
                                <div style={{display:'flex', gap:10}}>
                                    <input type="number" className={styles.input} placeholder="Qtd" value={newItem.quantity} onChange={e=>setNewItem({...newItem, quantity:e.target.value})} required min="1"/>
                                    <input type="number" step="0.01" className={styles.input} placeholder="Preço Unit." value={newItem.unit_price} onChange={e=>setNewItem({...newItem, unit_price:e.target.value})} required/>
                                </div>
                                <button type="submit" className={styles.btnAdd} style={{width: '100%', marginTop: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px'}}>
                                    <Plus size={16}/> Adicionar Item
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: ITENS */}
                <div className={styles.rightCol}>
                    <div className={styles.card}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                            <h3>Itens do Orçamento</h3>
                            <span style={{fontSize:'0.8em', color:'#666'}}>{items.length} itens</span>
                        </div>
                        
                        <div className={styles.tableWrapper}>
                            <table className={styles.itemTable}>
                                <thead><tr><th>Descrição</th><th style={{textAlign:'center'}}>Qtd</th><th style={{textAlign:'right'}}>Total</th><th></th></tr></thead>
                                <tbody>
                                    {items.length === 0 && <tr><td colSpan="4" style={{textAlign:'center', color:'#999', padding:'20px'}}>Nenhum item adicionado.</td></tr>}
                                    {items.map((it, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div style={{fontWeight:'500'}}>{it.description}</div>
                                                <div style={{fontSize:'0.8em', color:'#666'}}>Unit: R$ {Number(it.unit_price).toFixed(2)}</div>
                                            </td>
                                            <td style={{textAlign:'center'}}>{it.quantity}</td>
                                            <td style={{textAlign:'right', fontWeight:'bold'}}>R$ {Number(it.subtotal).toFixed(2)}</td>
                                            <td style={{textAlign:'center'}}>
                                                {isNew && (
                                                    <button onClick={()=>setItems(items.filter((_,i)=>i!==idx))} className={styles.btnTrash} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer'}}>
                                                        <Trash2 size={16}/>
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className={styles.divider}></div>

                        <div style={{textAlign:'right'}}>
                            <div style={{color:'#666', marginBottom:'5px'}}>Subtotal: R$ {subtotalItems.toFixed(2)}</div>
                            <div style={{color:'#dc2626', marginBottom:'5px'}}>Desconto: - R$ {Number(quote.discount || 0).toFixed(2)}</div>
                            <div className={styles.totalBox} style={{justifyContent: 'flex-end'}}>
                                <span>Total:</span> <h2>R$ {total.toFixed(2)}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}