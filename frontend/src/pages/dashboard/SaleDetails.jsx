import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import { ArrowLeft, Plus, Trash2, Check, User, ShoppingCart, DollarSign, Printer, FileText } from 'lucide-react';

export default function SaleDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);

    // Dados
    const [sale, setSale] = useState(null);
    const [items, setItems] = useState([]);
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Formulário de Item
    const [newItem, setNewItem] = useState({ product_id: '', quantity: 1, unit_price: 0 });

    // Modais
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const [finishData, setFinishData] = useState({ payment_method: 'money', installments: 1, discount: 0 });

    useEffect(() => {
        loadSaleData();
        loadResources();
    }, [id]);

    async function loadSaleData() {
        try {
            const res = await api.get(`/sales/${id}`);
            setSale(res.data.sale);
            setItems(res.data.items);
            // Pré-carrega desconto existente se houver
            setFinishData(prev => ({...prev, discount: Number(res.data.sale.discount || 0)}));
        } catch (error) {
            addToast({type:'error', title:'Erro', message:'Venda não encontrada'});
            navigate('/dashboard/sales');
        } finally {
            setLoading(false);
        }
    }

    async function loadResources() {
        try {
            const [cRes, pRes] = await Promise.all([api.get('/clients'), api.get('/products')]);
            setClients(cRes.data);
            setProducts(pRes.data);
        } catch(e) {}
    }

    // --- MANIPULAÇÃO DE ITENS ---
    const handleProductSelect = (prodId) => {
        const prod = products.find(p => p.id === Number(prodId));
        if(prod) setNewItem({ ...newItem, product_id: prodId, unit_price: Number(prod.sale_price) });
        else setNewItem({ ...newItem, product_id: '', unit_price: 0 });
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if(!newItem.product_id) return;
        try {
            await api.post(`/sales/${id}/items`, newItem);
            addToast({type:'success', title:'Item adicionado'});
            setNewItem({ product_id: '', quantity: 1, unit_price: 0 });
            loadSaleData();
        } catch(e) { addToast({type:'error', title:'Erro ao adicionar item'}); }
    };

    const handleRemoveItem = async (itemId) => {
        if(!confirm('Remover este item?')) return;
        try { await api.delete(`/sales/${id}/items/${itemId}`); loadSaleData(); } catch(e) {}
    };

    // --- CLIENTE ---
    const updateClient = async (clientId) => {
        try {
            await api.patch(`/sales/${id}`, { client_id: clientId });
            setIsClientModalOpen(false);
            loadSaleData();
            addToast({type:'success', title:'Cliente atualizado'});
        } catch(e) { addToast({type:'error', title:'Erro ao definir cliente'}); }
    };

    // --- FINALIZAÇÃO ---
    const handleFinish = async () => {
        try {
            await api.post(`/sales/${id}/finish`, {
                payment_method: finishData.payment_method,
                installments: Number(finishData.installments),
                discount: Number(finishData.discount)
            });
            addToast({type:'success', title:'Venda Finalizada!'});
            setIsFinishModalOpen(false);
            loadSaleData();
        } catch(e) { addToast({type:'error', title:'Erro ao finalizar venda'}); }
    };

    // IMPRESSÃO (Reutiliza lógica do PrintOS adaptada ou endpoint específico)
    // Se quiser usar o PrintOS para vendas, o backend deve suportar ou criar um PrintSale.jsx similar
    const handlePrint = () => {
        // Por enquanto, alertar ou criar um PrintSale.jsx futuro
        alert("Funcionalidade de impressão de Venda Consultiva pode ser implementada similar à OS");
    };

    if(loading) return <DashboardLayout>Carregando...</DashboardLayout>;
    if(!sale) return null;

    const totalLiq = Number(sale.total_amount) - (sale.status === 'completed' ? Number(sale.discount) : 0);

    return (
        <DashboardLayout>
            <div style={styles.header}>
                <button onClick={() => navigate('/dashboard/sales')} style={styles.backBtn}><ArrowLeft size={16}/> Voltar</button>
                <div style={{display:'flex', gap:'10px'}}>
                    {sale.status === 'completed' && (
                        <button onClick={handlePrint} style={styles.btnPrint}><Printer size={16}/> Imprimir Comprovante</button>
                    )}
                    {sale.status !== 'completed' && (
                        <button onClick={() => setIsFinishModalOpen(true)} style={styles.btnFinish}><Check size={16}/> Fechar Venda</button>
                    )}
                </div>
            </div>

            <div style={styles.grid}>
                {/* COLUNA ESQUERDA: CLIENTE E ADICIONAR ITEM */}
                <div style={{display:'flex', flexDirection:'column', gap:'20px'}}>
                    
                    {/* CARD CLIENTE */}
                    <div style={styles.card}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                            <h3 style={{margin:0, fontSize:'1rem', display:'flex', alignItems:'center', gap:'8px'}}><User size={18}/> Cliente</h3>
                            {sale.status !== 'completed' && (
                                <button onClick={() => setIsClientModalOpen(true)} style={styles.btnLink}>Alterar</button>
                            )}
                        </div>
                        <div style={{fontSize:'1.1rem', fontWeight:'bold', color:'#334155'}}>
                            {sale.client_name || 'Cliente Não Identificado (Balcão)'}
                        </div>
                    </div>

                    {/* FORMULÁRIO DE ITEM (Só aparece se aberta) */}
                    {sale.status !== 'completed' && (
                        <div style={styles.card}>
                            <h3 style={{margin:'0 0 15px 0', fontSize:'1rem'}}>Adicionar Produto</h3>
                            <form onSubmit={handleAddItem}>
                                <div style={{marginBottom:'10px'}}>
                                    <select style={styles.input} value={newItem.product_id} onChange={e => handleProductSelect(e.target.value)}>
                                        <option value="">Selecione o Produto...</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} (R$ {Number(p.sale_price).toFixed(2)})</option>)}
                                    </select>
                                </div>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                                    <input type="number" min="1" placeholder="Qtd" style={styles.input} value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})}/>
                                    <input type="number" step="0.01" placeholder="Preço Un." style={styles.input} value={newItem.unit_price} onChange={e => setNewItem({...newItem, unit_price: e.target.value})}/>
                                </div>
                                <button type="submit" style={styles.btnAdd}><Plus size={18}/> Incluir Item</button>
                            </form>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: ITENS E TOTAIS */}
                <div style={{flex:1}}>
                    <div style={styles.card}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'15px'}}>
                            <h3 style={{margin:0, display:'flex', alignItems:'center', gap:'8px'}}><ShoppingCart size={18}/> Carrinho</h3>
                            <span style={{background: sale.status==='completed'?'#dcfce7':'#f1f5f9', padding:'4px 10px', borderRadius:'12px', fontSize:'0.8rem', fontWeight:'bold', textTransform:'uppercase', color:sale.status==='completed'?'#166534':'#64748b'}}>
                                {sale.status === 'completed' ? 'Finalizada' : 'Em Aberto'}
                            </span>
                        </div>

                        <table style={{width:'100%', borderCollapse:'collapse', marginBottom:'20px'}}>
                            <thead>
                                <tr style={{borderBottom:'2px solid #f1f5f9', color:'#64748b', fontSize:'0.85rem'}}>
                                    <th style={{textAlign:'left', padding:'8px'}}>Produto</th>
                                    <th style={{textAlign:'center', padding:'8px'}}>Qtd</th>
                                    <th style={{textAlign:'right', padding:'8px'}}>Unit.</th>
                                    <th style={{textAlign:'right', padding:'8px'}}>Total</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id} style={{borderBottom:'1px solid #f8fafc'}}>
                                        <td style={{padding:'10px 8px'}}>{item.product_name}</td>
                                        <td style={{textAlign:'center'}}>{parseFloat(item.quantity)}</td>
                                        <td style={{textAlign:'right'}}>R$ {Number(item.unit_price).toFixed(2)}</td>
                                        <td style={{textAlign:'right', fontWeight:'bold'}}>R$ {Number(item.subtotal).toFixed(2)}</td>
                                        <td style={{textAlign:'right'}}>
                                            {sale.status !== 'completed' && (
                                                <button onClick={() => handleRemoveItem(item.id)} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer'}}><Trash2 size={16}/></button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:'20px', color:'#999'}}>Carrinho vazio.</td></tr>}
                            </tbody>
                        </table>

                        <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', display:'flex', flexDirection:'column', gap:'5px', alignItems:'flex-end'}}>
                            <div style={{color:'#64748b'}}>Subtotal: R$ {Number(sale.total_amount).toFixed(2)}</div>
                            {Number(sale.discount) > 0 && <div style={{color:'#ef4444'}}>Desconto: - R$ {Number(sale.discount).toFixed(2)}</div>}
                            <div style={{fontSize:'1.5rem', fontWeight:'bold', color:'#334155', marginTop:'5px'}}>
                                Total: R$ {totalLiq.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* MODAL CLIENTE */}
            <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title="Selecionar Cliente">
                <div style={{maxHeight:'300px', overflowY:'auto'}}>
                    {clients.map(c => (
                        <div key={c.id} onClick={() => updateClient(c.id)} style={{padding:'10px', borderBottom:'1px solid #eee', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{fontWeight:'bold'}}>{c.name}</span>
                            <span style={{color:'#666', fontSize:'0.8rem'}}>{c.document}</span>
                        </div>
                    ))}
                </div>
                <div style={{marginTop:'10px', borderTop:'1px solid #eee', paddingTop:'10px', textAlign:'center'}}>
                    <button onClick={() => updateClient(null)} style={{color:'#3b82f6', background:'none', border:'none', cursor:'pointer'}}>Definir como Consumidor Final</button>
                </div>
            </Modal>

            {/* MODAL PAGAMENTO */}
            <Modal isOpen={isFinishModalOpen} onClose={() => setIsFinishModalOpen(false)} title="Fechar Venda">
                <div style={{padding:'10px'}}>
                    <div style={{marginBottom:'15px'}}>
                        <label style={styles.label}>Desconto (R$)</label>
                        <input type="number" step="0.01" style={styles.input} value={finishData.discount} onChange={e => setFinishData({...finishData, discount: e.target.value})} />
                    </div>
                    <div style={{marginBottom:'15px'}}>
                        <label style={styles.label}>Forma de Pagamento</label>
                        <select style={styles.input} value={finishData.payment_method} onChange={e => setFinishData({...finishData, payment_method: e.target.value})}>
                            <option value="money">Dinheiro</option>
                            <option value="pix">PIX</option>
                            <option value="credit">Cartão de Crédito</option>
                            <option value="debit">Cartão de Débito</option>
                        </select>
                    </div>
                    <div style={{marginBottom:'20px'}}>
                        <label style={styles.label}>Parcelas</label>
                        <input type="number" min="1" max="12" style={styles.input} value={finishData.installments} onChange={e => setFinishData({...finishData, installments: e.target.value})} />
                    </div>
                    <button onClick={handleFinish} style={{...styles.btnFinish, width:'100%', justifyContent:'center'}}>
                        Confirmar Pagamento e Finalizar
                    </button>
                </div>
            </Modal>

        </DashboardLayout>
    );
}

const styles = {
    header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
    backBtn: { background:'transparent', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', color:'#64748b', fontWeight:'600' },
    grid: { display:'grid', gridTemplateColumns:'1fr 2fr', gap:'20px' },
    card: { background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 4px rgba(0,0,0,0.02)', marginBottom:'20px' },
    input: { width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #cbd5e1', fontSize:'0.9rem' },
    label: { display:'block', marginBottom:'5px', fontWeight:'600', color:'#475569', fontSize:'0.9rem' },
    btnAdd: { marginTop:'10px', width:'100%', background:'#3b82f6', color:'white', border:'none', padding:'10px', borderRadius:'8px', fontWeight:'bold', cursor:'pointer', display:'flex', alignItems:'center', justifySelf:'center', gap:'5px', justifyContent:'center' },
    btnFinish: { background:'#10b981', color:'white', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontWeight:'bold' },
    btnPrint: { background:'#64748b', color:'white', border:'none', padding:'10px 20px', borderRadius:'8px', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontWeight:'bold' },
    btnLink: { background:'none', border:'none', color:'#3b82f6', cursor:'pointer', textDecoration:'underline', fontSize:'0.85rem' }
};