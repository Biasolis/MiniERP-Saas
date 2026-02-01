import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Sales.module.css';
import { 
    ShoppingCart, Plus, Trash2, Search, User, CheckCircle, 
    DollarSign, CreditCard, Banknote, QrCode 
} from 'lucide-react';

export default function Sales() {
    const { addToast } = useContext(ToastContext);
    
    // Dados
    const [products, setProducts] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    // Estado da Venda
    const [cart, setCart] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Modal Checkout
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [checkoutData, setCheckoutData] = useState({
        payment_method: 'money', // money, credit, debit, pix
        discount: '',
        amount_paid: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [prodRes, cliRes] = await Promise.all([
                api.get('/products'),
                api.get('/clients')
            ]);
            setProducts(prodRes.data); 
            setClients(cliRes.data);
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao carregar dados.' });
        } finally {
            setLoading(false);
        }
    }

    // --- LÓGICA DO CARRINHO ---
    const addToCart = (product) => {
        const existingItem = cart.find(item => item.product_id === product.id);
        
        if (existingItem) {
            if (product.type === 'product' && existingItem.quantity + 1 > product.stock) {
                return addToast({ type: 'error', title: 'Estoque insuficiente.' });
            }
            setCart(cart.map(item => 
                item.product_id === product.id 
                ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
                : item
            ));
        } else {
            if (product.type === 'product' && product.stock <= 0) {
                return addToast({ type: 'error', title: 'Produto sem estoque.' });
            }
            setCart([...cart, {
                product_id: product.id,
                name: product.name,
                unit_price: Number(product.sale_price),
                quantity: 1,
                subtotal: Number(product.sale_price),
                type: product.type,
                stock: product.stock 
            }]);
        }
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.product_id !== productId));
    };

    const updateQuantity = (productId, newQty) => {
        if (newQty < 1) return;
        const item = cart.find(i => i.product_id === productId);
        if (item.type === 'product' && newQty > item.stock) {
            return addToast({ type: 'error', title: `Máximo disponível: ${item.stock}` });
        }
        setCart(cart.map(item => 
            item.product_id === productId 
            ? { ...item, quantity: newQty, subtotal: newQty * item.unit_price }
            : item
        ));
    };

    // --- CHECKOUT ---
    const openCheckout = () => {
        if (cart.length === 0) return addToast({ type: 'error', title: 'Carrinho vazio.' });
        const total = cart.reduce((acc, item) => acc + item.subtotal, 0);
        setCheckoutData({
            payment_method: 'money',
            discount: '',
            amount_paid: '', // Começa vazio para obrigar digitar se for dinheiro
            notes: ''
        });
        setIsCheckoutOpen(true);
    };

    const handleFinishSale = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                client_id: selectedClient || null,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                })),
                ...checkoutData,
                discount: Number(checkoutData.discount) || 0,
                amount_paid: Number(checkoutData.amount_paid) || 0
            };

            await api.post('/sales', payload);
            addToast({ type: 'success', title: 'Venda realizada com sucesso!' });
            
            setCart([]);
            setSelectedClient('');
            setIsCheckoutOpen(false);
            loadData(); 
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao finalizar venda.' });
        }
    };

    // Cálculos
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const cartTotal = cart.reduce((acc, item) => acc + item.subtotal, 0);
    const finalTotal = Math.max(0, cartTotal - (Number(checkoutData.discount) || 0));
    const change = Math.max(0, (Number(checkoutData.amount_paid) || 0) - finalTotal);

    return (
        <DashboardLayout>
            <div className={styles.container}>
                
                {/* COLUNA PRODUTOS */}
                <div className={styles.productsCol}>
                    <div className={styles.header}>
                        <h2>Ponto de Venda</h2>
                        <div className={styles.searchBox}>
                            <Search size={20} />
                            <input placeholder="Buscar produto..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                    </div>

                    <div className={styles.productList}>
                        {loading ? <p>Carregando...</p> : filteredProducts.map(product => (
                            <div key={product.id} className={styles.productCard} onClick={() => addToCart(product)}>
                                <div className={styles.prodInfo}>
                                    <span className={styles.prodName}>{product.name}</span>
                                    <div className={styles.prodMeta}>
                                        <span className={styles.prodPrice}>R$ {Number(product.sale_price).toFixed(2)}</span>
                                        {product.type === 'product' && (
                                            <span className={`${styles.stockBadge} ${product.stock <= 0 ? styles.noStock : ''}`}>
                                                Estoque: {product.stock}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button className={styles.btnAdd}><Plus size={18}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* COLUNA CARRINHO */}
                <div className={styles.cartCol}>
                    <div className={styles.clientSelect}>
                        <User size={20} color="#6b7280" />
                        <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                            <option value="">-- Cliente Avulso --</option>
                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className={styles.cartItems}>
                        {cart.length === 0 ? (
                            <div className={styles.emptyCart}><ShoppingCart size={48} color="#e5e7eb" /><p>Carrinho vazio</p></div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} className={styles.cartItem}>
                                    <div className={styles.cartItemInfo}>
                                        <span className={styles.cartItemName}>{item.name}</span>
                                        <span className={styles.cartItemPrice}>R$ {item.unit_price.toFixed(2)}</span>
                                    </div>
                                    <div className={styles.cartControls}>
                                        <input type="number" value={item.quantity} onChange={e => updateQuantity(item.product_id, Number(e.target.value))} min="1"/>
                                        <span className={styles.itemSubtotal}>R$ {item.subtotal.toFixed(2)}</span>
                                        <button onClick={() => removeFromCart(item.product_id)} className={styles.btnRemove}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className={styles.cartFooter}>
                        <div className={styles.totalRow}><span>Total</span><span>R$ {cartTotal.toFixed(2)}</span></div>
                        <button className={styles.btnFinish} disabled={cart.length === 0} onClick={openCheckout}>
                            <DollarSign size={20} /> Ir para Pagamento
                        </button>
                    </div>
                </div>
            </div>

            {/* MODAL CHECKOUT */}
            <Modal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} title="Finalizar Venda">
                <form onSubmit={handleFinishSale}>
                    <div className={styles.checkoutGrid}>
                        
                        {/* Resumo */}
                        <div className={styles.checkoutSummary}>
                            <div className={styles.summaryRow}><span>Subtotal:</span> <strong>R$ {cartTotal.toFixed(2)}</strong></div>
                            <div className={styles.summaryRow} style={{color:'var(--primary-color)'}}><span>Total a Pagar:</span> <strong style={{fontSize:'1.3rem'}}>R$ {finalTotal.toFixed(2)}</strong></div>
                        </div>

                        {/* Forma de Pagamento */}
                        <div className={styles.paymentMethods}>
                            <label>Forma de Pagamento</label>
                            <div className={styles.methodOptions}>
                                <button type="button" className={`${styles.methodBtn} ${checkoutData.payment_method === 'money' ? styles.activeMethod : ''}`} onClick={() => setCheckoutData({...checkoutData, payment_method:'money'})}>
                                    <Banknote size={20}/> Dinheiro
                                </button>
                                <button type="button" className={`${styles.methodBtn} ${checkoutData.payment_method === 'pix' ? styles.activeMethod : ''}`} onClick={() => setCheckoutData({...checkoutData, payment_method:'pix'})}>
                                    <QrCode size={20}/> PIX
                                </button>
                                <button type="button" className={`${styles.methodBtn} ${checkoutData.payment_method === 'credit' ? styles.activeMethod : ''}`} onClick={() => setCheckoutData({...checkoutData, payment_method:'credit'})}>
                                    <CreditCard size={20}/> Crédito
                                </button>
                                <button type="button" className={`${styles.methodBtn} ${checkoutData.payment_method === 'debit' ? styles.activeMethod : ''}`} onClick={() => setCheckoutData({...checkoutData, payment_method:'debit'})}>
                                    <CreditCard size={20}/> Débito
                                </button>
                            </div>
                        </div>

                        {/* Inputs de Valores */}
                        <div className={styles.inputsRow}>
                            <div>
                                <label>Desconto (R$)</label>
                                <input 
                                    type="number" className={styles.input} step="0.01" 
                                    value={checkoutData.discount} 
                                    onChange={e => setCheckoutData({...checkoutData, discount: e.target.value})} 
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label>Valor Recebido (R$)</label>
                                <input 
                                    type="number" className={styles.input} step="0.01" 
                                    value={checkoutData.amount_paid} 
                                    onChange={e => setCheckoutData({...checkoutData, amount_paid: e.target.value})} 
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        {/* Troco */}
                        {checkoutData.payment_method === 'money' && (
                            <div className={styles.changeBox}>
                                <span>Troco Estimado:</span>
                                <strong style={{color: change > 0 ? '#10b981' : '#6b7280'}}>R$ {change.toFixed(2)}</strong>
                            </div>
                        )}

                        <div style={{marginTop:'10px'}}>
                            <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem', fontWeight:600}}>Observações</label>
                            <input className={styles.input} placeholder="Opcional..." value={checkoutData.notes} onChange={e => setCheckoutData({...checkoutData, notes: e.target.value})} />
                        </div>

                        <button type="submit" className={styles.btnConfirm}>
                            <CheckCircle size={20} /> Confirmar Venda
                        </button>
                    </div>
                </form>
            </Modal>
        </DashboardLayout>
    );
}