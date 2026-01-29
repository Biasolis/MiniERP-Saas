import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Sales.module.css';
import { 
    ShoppingCart, Plus, Trash2, Search, User, CheckCircle, 
    AlertTriangle, DollarSign 
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
    
    // Modal de Confirmação
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        try {
            const [prodRes, cliRes] = await Promise.all([
                api.get('/products'),
                api.get('/clients')
            ]);
            // Filtra apenas produtos (Serviços também podem ser vendidos, mas foco em produtos com estoque)
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
        // Verifica se já está no carrinho
        const existingItem = cart.find(item => item.product_id === product.id);
        
        if (existingItem) {
            // Verifica estoque (se for produto)
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
                stock: product.stock // para validação visual
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

    // --- FINALIZAR VENDA ---

    const handleFinishSale = async () => {
        if (cart.length === 0) return addToast({ type: 'error', title: 'Carrinho vazio.' });

        try {
            const payload = {
                client_id: selectedClient || null,
                items: cart.map(item => ({
                    product_id: item.product_id,
                    quantity: item.quantity,
                    unit_price: item.unit_price
                }))
            };

            await api.post('/sales', payload);
            addToast({ type: 'success', title: 'Venda realizada com sucesso!' });
            
            // Limpa tudo
            setCart([]);
            setSelectedClient('');
            setIsFinishModalOpen(false);
            loadData(); // Recarrega produtos para atualizar estoque
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao finalizar venda.' });
        }
    };

    // --- FILTROS ---
    const filteredProducts = products.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalCart = cart.reduce((acc, item) => acc + item.subtotal, 0);

    return (
        <DashboardLayout>
            <div className={styles.container}>
                
                {/* COLUNA ESQUERDA: PRODUTOS */}
                <div className={styles.productsCol}>
                    <div className={styles.header}>
                        <h2>Ponto de Venda</h2>
                        <div className={styles.searchBox}>
                            <Search size={20} />
                            <input 
                                placeholder="Buscar produto ou serviço..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
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

                {/* COLUNA DIREITA: CARRINHO E CHECKOUT */}
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
                            <div className={styles.emptyCart}>
                                <ShoppingCart size={48} color="#e5e7eb" />
                                <p>Carrinho vazio</p>
                            </div>
                        ) : (
                            cart.map(item => (
                                <div key={item.product_id} className={styles.cartItem}>
                                    <div className={styles.cartItemInfo}>
                                        <span className={styles.cartItemName}>{item.name}</span>
                                        <span className={styles.cartItemPrice}>R$ {item.unit_price.toFixed(2)} un</span>
                                    </div>
                                    <div className={styles.cartControls}>
                                        <input 
                                            type="number" 
                                            value={item.quantity} 
                                            onChange={e => updateQuantity(item.product_id, Number(e.target.value))}
                                            min="1"
                                        />
                                        <span className={styles.itemSubtotal}>R$ {item.subtotal.toFixed(2)}</span>
                                        <button onClick={() => removeFromCart(item.product_id)} className={styles.btnRemove}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className={styles.cartFooter}>
                        <div className={styles.totalRow}>
                            <span>Total Geral</span>
                            <span>R$ {totalCart.toFixed(2)}</span>
                        </div>
                        <button 
                            className={styles.btnFinish} 
                            disabled={cart.length === 0}
                            onClick={() => setIsFinishModalOpen(true)}
                        >
                            <CheckCircle size={20} /> Finalizar Venda
                        </button>
                    </div>
                </div>

            </div>

            {/* MODAL DE CONFIRMAÇÃO */}
            <Modal isOpen={isFinishModalOpen} onClose={() => setIsFinishModalOpen(false)} title="Confirmar Venda">
                <div style={{textAlign:'center', padding:'10px'}}>
                    <div className={styles.modalIcon}><DollarSign size={32} color="white" /></div>
                    <h3>Valor Total: R$ {totalCart.toFixed(2)}</h3>
                    <p style={{color:'#6b7280', margin:'10px 0 20px'}}>
                        Confirma a venda {selectedClient ? `para o cliente selecionado` : 'como venda avulsa'}?
                    </p>
                    <div style={{display:'flex', gap:'10px', justifyContent:'center'}}>
                        <button onClick={() => setIsFinishModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                        <button onClick={handleFinishSale} className={styles.btnConfirm}>Confirmar</button>
                    </div>
                </div>
            </Modal>

        </DashboardLayout>
    );
}