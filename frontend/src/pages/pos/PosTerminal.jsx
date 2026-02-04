import { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api'; 
import { ToastContext } from '../../context/ToastContext'; 
import { LogOut, ShoppingCart, Barcode, ArrowLeft, Trash2, Search, Plus, Minus, Lock, Package, CreditCard, Banknote, QrCode } from 'lucide-react';

const s = {
    container: { height: '100vh', display: 'flex', flexDirection: 'column', background: '#f3f4f6', fontFamily: 'Inter, sans-serif', overflow: 'hidden' },
    header: { height: '60px', background: '#1f2937', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', flexShrink: 0 },
    content: { flex: 1, display: 'flex', overflow: 'hidden' },
    leftPanel: { flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' },
    rightPanel: { width: '420px', background: 'white', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '-2px 0 5px rgba(0,0,0,0.05)', flexShrink: 0 },
    
    // Lista de Resultados Melhorada
    resultsList: { 
        position: 'absolute', top: '100%', left: 0, right: 0, 
        background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', 
        maxHeight: '350px', overflowY: 'auto', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', zIndex: 50,
        marginTop: '5px'
    },
    resultItem: { 
        padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'background 0.2s'
    },
    
    cartHeader: { padding: '15px 20px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    cartList: { flex: 1, overflowY: 'auto', padding: '0' },
    cartItem: { padding: '15px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white' },
    totalBox: { padding: '25px', background: '#f8fafc', borderTop: '1px solid #e5e7eb' },
    
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modal: { background: 'white', padding: '30px', borderRadius: '12px', width: '450px', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' },
    
    summaryRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.95rem' },
    summaryValue: { fontWeight: 'bold' },
    
    // Botões de Pagamento
    methodBtn: { flex:1, padding:'15px', border:'1px solid #ddd', borderRadius:'8px', background:'white', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:5, transition:'all 0.2s' },
    methodBtnActive: { borderColor:'#2563eb', background:'#eff6ff', color:'#2563eb', fontWeight:'bold' }
};

export default function PosTerminal() {
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);
    
    // Estados Gerais
    const [loading, setLoading] = useState(true);
    const [session, setSession] = useState(null); 
    
    // Estados Venda
    const [products, setProducts] = useState([]); 
    const [filteredProducts, setFilteredProducts] = useState([]); 
    const [cart, setCart] = useState([]);
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    
    // Modais
    const [showCloseModal, setShowCloseModal] = useState(false);
    const [showPayModal, setShowPayModal] = useState(false); // Modal de Pagamento
    const [closeData, setCloseData] = useState(null);
    
    // Inputs Caixa
    const [openingBalance, setOpeningBalance] = useState('');
    const [closingBalance, setClosingBalance] = useState('');
    const [closingNotes, setClosingNotes] = useState('');

    // Inputs Pagamento
    const [paymentMethod, setPaymentMethod] = useState('money');
    const [amountPaid, setAmountPaid] = useState('');
    const [discount, setDiscount] = useState('');
    
    const searchInputRef = useRef(null);

    useEffect(() => {
        checkSession();
        loadProducts();
    }, []);

    async function checkSession() {
        try {
            const res = await api.get('/pos/status');
            if (res.data.isOpen) setSession(res.data.session);
            else setSession(null);
        } catch(e) { console.error(e); } 
        finally { setLoading(false); }
    }

    async function loadProducts() {
        try {
            const res = await api.get('/products'); 
            setProducts(res.data || []);
        } catch(e) { console.error("Erro produtos", e); }
    }

    // Busca de Produtos
    useEffect(() => {
        if (!search.trim()) { setFilteredProducts([]); return; }
        
        const term = search.toLowerCase();
        
        // 1. Tenta achar EXATO primeiro (Barcode ou SKU)
        const exactMatch = products.find(p => p.barcode === term || p.sku?.toLowerCase() === term || p.id.toString() === term);
        if (exactMatch && term.length > 2) { 
            // Se for exato e longo o suficiente (evita ids curtos se repetindo), adiciona direto?
            // Melhor: Deixar o usuário dar Enter. Mas para leitores de código de barras (que mandam enter no final),
            // a lógica ideal fica no onKeyDown do input ou aqui se o leitor for muito rápido.
            // Para segurança, vamos deixar o filtro e o Enter seleciona o primeiro.
        }

        const results = products.filter(p => 
            p.name.toLowerCase().includes(term) || 
            (p.sku && p.sku.toLowerCase().includes(term)) ||
            (p.barcode && p.barcode.includes(term))
        ).slice(0, 10);

        setFilteredProducts(results);
        setActiveIndex(results.length > 0 ? 0 : -1);
    }, [search, products]);

    // Manipula tecla ENTER na busca
    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // 1. Se tem um código de barras exato digitado
            const exact = products.find(p => p.barcode === search);
            if(exact) {
                addToCart(exact);
                return;
            }
            
            // 2. Se tem itens filtrados e um selecionado
            if (filteredProducts.length > 0 && activeIndex >= 0) {
                addToCart(filteredProducts[activeIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
    };

    // Carrinho
    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.id);
            if (existing) {
                return prev.map(item => item.product_id === product.id ? { 
                    ...item, 
                    quantity: item.quantity + 1, 
                    subtotal: (item.quantity + 1) * item.unit_price 
                } : item);
            }
            return [...prev, { 
                product_id: product.id, 
                name: product.name, 
                unit_price: Number(product.sale_price), 
                quantity: 1, 
                subtotal: Number(product.sale_price) 
            }];
        });
        setSearch(''); 
        setFilteredProducts([]); 
        // Mantém foco no input
        setTimeout(() => searchInputRef.current?.focus(), 50);
    };

    const updateQuantity = (index, delta) => {
        setCart(prev => prev.map((item, i) => {
            if (i === index) {
                const newQty = Math.max(1, item.quantity + delta);
                return { ...item, quantity: newQty, subtotal: newQty * item.unit_price };
            }
            return item;
        }));
    };

    const removeFromCart = (index) => setCart(prev => prev.filter((_, i) => i !== index));

    // --- LÓGICA DE PAGAMENTO ---
    const totalAmount = cart.reduce((acc, item) => acc + item.subtotal, 0);
    const finalTotal = Math.max(0, totalAmount - (Number(discount) || 0));
    const change = Math.max(0, (Number(amountPaid) || 0) - finalTotal);

    const handleOpenPayModal = () => {
        if(cart.length === 0) return;
        setAmountPaid(totalAmount.toFixed(2));
        setDiscount('');
        setPaymentMethod('money');
        setShowPayModal(true);
    };

    const handleFinishSale = async (e) => {
        e.preventDefault();
        try {
            await api.post('/sales', {
                items: cart,
                payment_method: paymentMethod,
                discount: Number(discount) || 0,
                amount_paid: Number(amountPaid) || 0,
                pos_session_id: session.id, // Vínculo essencial
                installments: 1
            });
            addToast({type:'success', title:'Venda Finalizada!'});
            setCart([]);
            setShowPayModal(false);
            setTimeout(() => searchInputRef.current?.focus(), 100);
        } catch (error) {
            addToast({type:'error', title: error.response?.data?.message || 'Erro ao finalizar'});
        }
    };

    // --- OUTROS ---
    async function handleOpenSession(e) {
        e.preventDefault();
        try {
            const res = await api.post('/pos/open', { opening_balance: parseFloat(openingBalance) });
            setSession(res.data);
            addToast({type:'success', title:'Caixa Aberto!'});
        } catch(e) { addToast({type:'error', title: 'Erro ao abrir'}); }
    }

    async function prepareClose() {
        try {
            const res = await api.get('/pos/details');
            setCloseData(res.data);
            setShowCloseModal(true);
        } catch (error) {
            addToast({type:'error', title:'Erro ao calcular fechamento'});
        }
    }

    async function handleCloseSession(e) {
        e.preventDefault();
        if(!closingBalance) return;
        
        try {
            await api.post('/pos/close', { 
                closing_balance: parseFloat(closingBalance),
                notes: closingNotes
            });
            addToast({type:'success', title:'Caixa Fechado com Sucesso!'});
            navigate('/dashboard'); 
        } catch(e) { addToast({type:'error', title: 'Erro ao fechar'}); }
    }

    const handleExit = () => { if(confirm('Sair do PDV? O caixa continuará aberto.')) navigate('/dashboard'); };
    const fmt = (v) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (loading) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>Carregando...</div>;

    // TELA ABERTURA DE CAIXA
    if (!session) {
        return (
            <div style={s.container}>
                <div style={s.header}>
                    <div style={{display:'flex', alignItems:'center', gap:10}}><ShoppingCart /> <span style={{fontWeight:'bold', fontSize:'1.2rem'}}>PDV</span></div>
                    <button onClick={() => navigate('/dashboard')} style={{background:'transparent', border:'1px solid #4b5563', color:'white', padding:'6px 12px', borderRadius:'6px', cursor:'pointer', display:'flex', gap:6, alignItems:'center'}}><ArrowLeft size={16}/> Voltar</button>
                </div>
                <div style={s.modalOverlay}>
                    <div style={s.modal}>
                        <h2 style={{marginTop:0}}>Abertura de Caixa</h2>
                        <form onSubmit={handleOpenSession}>
                            <label style={{display:'block', marginBottom:8}}>Valor em Caixa (R$)</label>
                            <input autoFocus type="number" step="0.01" value={openingBalance} onChange={e=>setOpeningBalance(e.target.value)} style={{width:'100%', padding:'12px', fontSize:'1.2rem', marginBottom:'20px', border:'1px solid #d1d5db', borderRadius:'8px', boxSizing:'border-box'}} />
                            <button type="submit" style={{width:'100%', padding:'12px', background:'#2563eb', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold'}}>Abrir Caixa</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    // TELA PRINCIPAL
    return (
        <div style={s.container}>
            <div style={s.header}>
                <div style={{display:'flex', alignItems:'center', gap:12}}>
                    <div style={{background:'#374151', padding:'8px', borderRadius:'6px'}}><ShoppingCart size={20} color="#4ade80"/></div>
                    <div>
                        <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>Frente de Caixa</div>
                        <div style={{fontSize:'0.75rem', opacity:0.7}}>Sessão #{session.id.split('-')[0]}</div>
                    </div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:15}}>
                    <button onClick={prepareClose} style={{background:'#f59e0b', border:'none', color:'white', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', display:'flex', gap:6, alignItems:'center', fontWeight:'600'}}>
                        <Lock size={16}/> Fechar Caixa
                    </button>
                    <button onClick={handleExit} style={{background:'#ef4444', border:'none', color:'white', padding:'8px 16px', borderRadius:'6px', cursor:'pointer', display:'flex', gap:6, alignItems:'center', fontWeight:'600'}}>
                        <LogOut size={16}/> Sair
                    </button>
                </div>
            </div>

            <div style={s.content}>
                <div style={s.leftPanel}>
                    <div style={{background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 10px rgba(0,0,0,0.05)', position:'relative'}}>
                        <div style={{display:'flex', gap:10}}>
                            <Search style={{position:'absolute', left:34, top:34, color:'#9ca3af'}} size={22}/>
                            
                            <input 
                                ref={searchInputRef} 
                                autoFocus 
                                placeholder="F2 - Digite nome ou código de barras..." 
                                value={search} 
                                onChange={e=>setSearch(e.target.value)}
                                onKeyDown={handleSearchKeyDown} // Captura Enter
                                style={{width:'100%', padding:'14px 14px 14px 45px', fontSize:'1.1rem', border:'1px solid #d1d5db', borderRadius:'8px', boxSizing:'border-box'}} 
                            />
                            
                            {/* LISTA DE RESULTADOS MELHORADA */}
                            {filteredProducts.length > 0 && (
                                <div style={s.resultsList}>
                                    {filteredProducts.map((p, index) => (
                                        <div 
                                            key={p.id} 
                                            style={{
                                                ...s.resultItem,
                                                background: index === activeIndex ? '#f3f4f6' : 'white',
                                                borderLeft: index === activeIndex ? '4px solid #2563eb' : '4px solid transparent'
                                            }} 
                                            onClick={() => addToCart(p)}
                                            onMouseEnter={() => setActiveIndex(index)}
                                        >
                                            <div style={{flex: 1}}>
                                                <div style={{fontWeight:'600', color:'#1f2937', fontSize:'1rem', marginBottom:'4px'}}>
                                                    {p.name}
                                                </div>
                                                <div style={{display:'flex', alignItems:'center', gap:'12px', fontSize:'0.85rem', color:'#6b7280'}}>
                                                    <span style={{display:'flex', alignItems:'center', gap:'4px'}}>
                                                        <Barcode size={14}/> {p.barcode || p.sku || 'S/C'}
                                                    </span>
                                                    <span style={{color:'#e5e7eb'}}>|</span>
                                                    <span style={{display:'flex', alignItems:'center', gap:'4px', color: (p.stock || 0) > 0 ? '#059669' : '#dc2626', fontWeight:'500'}}>
                                                        <Package size={14}/> Est: {p.stock || 0}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{fontWeight:'bold', color:'#2563eb', fontSize:'1.1rem', marginLeft:'15px'}}>
                                                {fmt(Number(p.sale_price))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Placeholder visual se não tiver nada */}
                    <div style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'#9ca3af', border:'2px dashed #e5e7eb', borderRadius:'12px', background:'rgba(255,255,255,0.5)', marginTop:'20px'}}>
                        <Barcode size={64} style={{opacity:0.1, marginBottom:10}}/>
                        <p style={{margin:0, opacity:0.6}}>Aguardando leitura de produto...</p>
                    </div>
                </div>

                <div style={s.rightPanel}>
                    <div style={s.cartHeader}><h3 style={{margin:0}}>Cupom de Venda</h3></div>
                    <div style={s.cartList}>
                        {cart.length === 0 && (
                            <div style={{padding:'40px', textAlign:'center', color:'#9ca3af'}}>
                                Carrinho vazio
                            </div>
                        )}
                        {cart.map((item, idx) => (
                            <div key={idx} style={s.cartItem}>
                                <div style={{flex:1}}><div style={{fontWeight:'500'}}>{item.name}</div><small>{fmt(item.unit_price)} x</small></div>
                                <div style={{display:'flex', alignItems:'center', gap:10}}>
                                    <div style={{display:'flex', alignItems:'center', border:'1px solid #ddd', borderRadius:'4px'}}><button onClick={()=>updateQuantity(idx, -1)} style={{padding:'4px'}}><Minus size={12}/></button><span style={{padding:'0 8px'}}>{item.quantity}</span><button onClick={()=>updateQuantity(idx, 1)} style={{padding:'4px'}}><Plus size={12}/></button></div>
                                    <div style={{fontWeight:'bold', width:'80px', textAlign:'right'}}>{fmt(item.subtotal)}</div>
                                    <Trash2 size={16} color="#ef4444" style={{cursor:'pointer'}} onClick={()=>removeFromCart(idx)}/>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div style={s.totalBox}>
                        <div style={{display:'flex', justifyContent:'space-between', fontSize:'1.8rem', fontWeight:'800', marginBottom:'20px', color:'#1f2937'}}><span>TOTAL</span><span>{fmt(totalAmount)}</span></div>
                        <button onClick={handleOpenPayModal} disabled={cart.length===0} style={{width:'100%', padding:'18px', background: cart.length>0?'#10b981':'#d1d5db', color:'white', border:'none', borderRadius:'8px', fontSize:'1.2rem', fontWeight:'bold', cursor: cart.length>0?'pointer':'not-allowed'}}>
                            FINALIZAR (F9)
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL PAGAMENTO */}
            {showPayModal && (
                <div style={s.modalOverlay}>
                    <div style={s.modal}>
                        <h2 style={{marginTop:0, marginBottom:'20px', color:'#1f2937'}}>Pagamento</h2>
                        
                        <div style={{marginBottom:20}}>
                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'1.2rem', fontWeight:'bold', marginBottom:10}}>
                                <span>Total a Pagar</span>
                                <span>{fmt(finalTotal)}</span>
                            </div>
                        </div>

                        <div style={{display:'flex', gap:10, marginBottom:20}}>
                            <button onClick={()=>setPaymentMethod('money')} style={{...s.methodBtn, ...(paymentMethod==='money'?s.methodBtnActive:{})}}><Banknote size={24}/> Dinheiro</button>
                            <button onClick={()=>setPaymentMethod('credit')} style={{...s.methodBtn, ...(paymentMethod==='credit'?s.methodBtnActive:{})}}><CreditCard size={24}/> Crédito</button>
                            <button onClick={()=>setPaymentMethod('debit')} style={{...s.methodBtn, ...(paymentMethod==='debit'?s.methodBtnActive:{})}}><CreditCard size={24}/> Débito</button>
                            <button onClick={()=>setPaymentMethod('pix')} style={{...s.methodBtn, ...(paymentMethod==='pix'?s.methodBtnActive:{})}}><QrCode size={24}/> Pix</button>
                        </div>

                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:15, marginBottom:20}}>
                            <div>
                                <label style={{display:'block', marginBottom:5, fontWeight:'600', fontSize:'0.9rem'}}>Desconto (R$)</label>
                                <input type="number" step="0.01" value={discount} onChange={e=>setDiscount(e.target.value)} style={{width:'100%', padding:'12px', fontSize:'1.1rem', border:'1px solid #d1d5db', borderRadius:'8px', boxSizing:'border-box'}} />
                            </div>
                            <div>
                                <label style={{display:'block', marginBottom:5, fontWeight:'600', fontSize:'0.9rem'}}>Valor Recebido</label>
                                <input autoFocus type="number" step="0.01" value={amountPaid} onChange={e=>setAmountPaid(e.target.value)} style={{width:'100%', padding:'12px', fontSize:'1.1rem', border:'1px solid #d1d5db', borderRadius:'8px', boxSizing:'border-box'}} />
                            </div>
                        </div>

                        <div style={{background: change > 0 ? '#dcfce7' : '#f3f4f6', padding:'15px', borderRadius:'8px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                            <span style={{fontSize:'1.1rem', color: change > 0 ? '#166534' : '#4b5563'}}>Troco:</span>
                            <span style={{fontSize:'1.5rem', fontWeight:'bold', color: change > 0 ? '#166534' : '#1f2937'}}>{fmt(change)}</span>
                        </div>

                        <div style={{display:'flex', gap:10}}>
                            <button onClick={()=>setShowPayModal(false)} style={{flex:1, padding:'15px', background:'#e5e7eb', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600', color:'#4b5563'}}>Cancelar</button>
                            <button onClick={handleFinishSale} style={{flex:1, padding:'15px', background:'#10b981', color:'white', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'bold', fontSize:'1.1rem'}}>
                                Confirmar Pagamento
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL FECHAMENTO */}
            {showCloseModal && closeData && (
                <div style={s.modalOverlay}>
                    <div style={s.modal}>
                        <h2 style={{marginTop:0, borderBottom:'1px solid #eee', paddingBottom:15, marginBottom:20}}>Fechamento de Caixa</h2>
                        
                        <div style={{background:'#f8fafc', padding:'15px', borderRadius:'8px', marginBottom:'20px', border:'1px solid #e2e8f0'}}>
                            <div style={s.summaryRow}><span>Fundo de Troco (Abertura):</span> <span style={s.summaryValue}>{fmt(closeData.opening_balance)}</span></div>
                            <div style={s.summaryRow}><span>Vendas em Dinheiro:</span> <span style={{...s.summaryValue, color:'#10b981'}}>+ {fmt(closeData.total_cash_sales)}</span></div>
                            <div style={{borderTop:'1px dashed #cbd5e1', margin:'10px 0'}}></div>
                            <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', color:'#2563eb', fontSize:'1.1rem'}}><span>Total Esperado (Gaveta):</span><span>{fmt(closeData.expected_in_drawer)}</span></div>
                        </div>

                        <form onSubmit={handleCloseSession}>
                            <label style={{display:'block', marginBottom:8, fontWeight:'600'}}>Valor Contado na Gaveta</label>
                            <input required type="number" step="0.01" value={closingBalance} onChange={e=>setClosingBalance(e.target.value)} style={{width:'100%', padding:'12px', fontSize:'1.2rem', border:'1px solid #d1d5db', borderRadius:'8px', boxSizing:'border-box', marginBottom:20}} placeholder="R$ 0,00" />
                            
                            <label style={{display:'block', marginBottom:8, fontWeight:'600'}}>Observações</label>
                            <textarea value={closingNotes} onChange={e=>setClosingNotes(e.target.value)} rows="2" style={{width:'100%', padding:'10px', fontSize:'0.9rem', border:'1px solid #d1d5db', borderRadius:'8px', boxSizing:'border-box', marginBottom:20}} placeholder="Diferenças, sangrias..."></textarea>

                            <div style={{display:'flex', gap:10}}>
                                <button type="button" onClick={()=>setShowCloseModal(false)} style={{flex:1, padding:'12px', background:'#e5e7eb', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:'600'}}>Voltar</button>
                                <button type="submit" style={{flex:1, padding:'12px', background:'#ef4444', color:'white', border:'none', borderRadius:'8px', fontWeight:'bold', cursor:'pointer'}}>Encerrar Sessão</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}