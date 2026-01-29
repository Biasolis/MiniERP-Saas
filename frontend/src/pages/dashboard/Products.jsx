import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Products.module.css';
import { 
    Plus, Search, Edit, Trash2, Package, Wrench, 
    Layers, AlertTriangle 
} from 'lucide-react';

export default function Products() {
    const { addToast } = useContext(ToastContext);
    const [products, setProducts] = useState([]); 
    const [filteredList, setFilteredList] = useState([]); 
    const [loading, setLoading] = useState(true);
    
    // Filtros
    const [filterType, setFilterType] = useState('all'); 
    const [searchTerm, setSearchTerm] = useState('');

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    
    // Form
    const [formData, setFormData] = useState({ 
        name: '', description: '', price: '', cost_price: '', stock: '', min_stock: '', 
        type: 'product', commission_rate: ''
    });

    useEffect(() => { loadProducts(); }, []);

    useEffect(() => {
        let result = products;
        if (filterType !== 'all') {
            result = result.filter(p => p.type === filterType);
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(lower));
        }
        setFilteredList(result);
    }, [products, filterType, searchTerm]);

    async function loadProducts() {
        setLoading(true);
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao carregar itens.' });
        } finally {
            setLoading(false);
        }
    }

    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormData({
                name: product.name,
                description: product.description || '',
                price: product.sale_price,
                cost_price: product.cost_price || '', // Carrega custo
                stock: product.stock,
                min_stock: product.min_stock,
                type: product.type || 'product',
                commission_rate: product.commission_rate || ''
            });
        } else {
            setEditingProduct(null);
            setFormData({ 
                name: '', description: '', price: '', cost_price: '', 
                stock: '', min_stock: '', type: 'product', commission_rate: '' 
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData };
            // Se for serviço, zera estoque na lógica de envio
            if (payload.type === 'service') {
                payload.stock = 0;
                payload.min_stock = 0;
            }

            if (editingProduct) {
                await api.put(`/products/${editingProduct.id}`, payload);
                addToast({ type: 'success', title: 'Atualizado com sucesso!' });
            } else {
                await api.post('/products', payload);
                addToast({ type: 'success', title: 'Criado com sucesso!' });
            }
            setIsModalOpen(false);
            loadProducts();
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao salvar.' });
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza?')) return;
        try {
            await api.delete(`/products/${id}`);
            setProducts(products.filter(p => p.id !== id));
            addToast({ type: 'success', title: 'Item removido.' });
        } catch (error) {
            addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao remover.' });
        }
    };

    const countProducts = products.filter(p => p.type === 'product' || !p.type).length;
    const countServices = products.filter(p => p.type === 'service').length;

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Produtos & Serviços</h2>
                        <p className={styles.subtitle}>Gerencie seu catálogo de itens e mão de obra.</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className={styles.btnPrimary}>
                        <Plus size={20} /> Novo Item
                    </button>
                </div>

                <div className={styles.controls}>
                    <div className={styles.tabs}>
                        <button className={`${styles.tab} ${filterType === 'all' ? styles.activeTab : ''}`} onClick={() => setFilterType('all')}>
                            <Layers size={16}/> Todos <span className={styles.badge}>{products.length}</span>
                        </button>
                        <button className={`${styles.tab} ${filterType === 'product' ? styles.activeTab : ''}`} onClick={() => setFilterType('product')}>
                            <Package size={16}/> Produtos <span className={styles.badge}>{countProducts}</span>
                        </button>
                        <button className={`${styles.tab} ${filterType === 'service' ? styles.activeTab : ''}`} onClick={() => setFilterType('service')}>
                            <Wrench size={16}/> Serviços <span className={styles.badge}>{countServices}</span>
                        </button>
                    </div>
                    <div className={styles.searchBox}>
                        <Search size={18} className={styles.searchIcon} />
                        <input placeholder="Buscar item..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={styles.searchInput} />
                    </div>
                </div>

                {loading ? <p className={styles.loading}>Carregando catálogo...</p> : (
                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{width:'50px'}}>Tipo</th>
                                    <th>Nome</th>
                                    <th>Preço</th>
                                    <th>Comissão</th>
                                    <th style={{textAlign:'center'}}>Estoque</th>
                                    <th style={{width:'100px'}}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredList.map(item => (
                                    <tr key={item.id} className={styles.row}>
                                        <td style={{textAlign:'center'}}>
                                            {item.type === 'service' ? (
                                                <div title="Serviço" className={styles.typeIconService}><Wrench size={16}/></div>
                                            ) : (
                                                <div title="Produto" className={styles.typeIconProduct}><Package size={16}/></div>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.itemName}>{item.name}</div>
                                            {item.description && <div className={styles.itemDesc}>{item.description}</div>}
                                        </td>
                                        <td className={styles.price}>R$ {Number(item.sale_price).toFixed(2)}</td>
                                        <td>{item.commission_rate ? `${item.commission_rate}%` : <span style={{color:'#999', fontSize:'0.8rem'}}>Padrão</span>}</td>
                                        <td style={{textAlign:'center'}}>
                                            {item.type === 'service' ? <span className={styles.serviceBadge}>—</span> : (
                                                <div className={styles.stockInfo}>
                                                    <span style={{color: item.stock <= item.min_stock ? '#ef4444' : '#10b981', fontWeight: 600}}>{item.stock}</span>
                                                    {item.stock <= item.min_stock && <AlertTriangle size={14} color="#ef4444"/>}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.actions}>
                                                <button onClick={() => handleOpenModal(item)} className={styles.btnIcon}><Edit size={16}/></button>
                                                <button onClick={() => handleDelete(item.id)} className={styles.btnIconDelete}><Trash2 size={16}/></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Editar Item" : "Novo Item"}>
                <form onSubmit={handleSave}>
                    <div className={styles.typeSelector}>
                        <label className={`${styles.typeOption} ${formData.type === 'product' ? styles.selectedType : ''}`}>
                            <input type="radio" name="type" value="product" checked={formData.type === 'product'} onChange={() => setFormData({...formData, type: 'product'})} style={{display:'none'}} />
                            <Package size={18} /> Produto
                        </label>
                        <label className={`${styles.typeOption} ${formData.type === 'service' ? styles.selectedType : ''}`}>
                            <input type="radio" name="type" value="service" checked={formData.type === 'service'} onChange={() => setFormData({...formData, type: 'service'})} style={{display:'none'}} />
                            <Wrench size={18} /> Serviço
                        </label>
                    </div>

                    <div className={styles.formGroup}>
                        <label>Nome</label>
                        <input className={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>

                    <div className={styles.row2}>
                        <div className={styles.formGroup}>
                            <label>Preço Venda (R$)</label>
                            <input type="number" step="0.01" className={styles.input} value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} required />
                        </div>
                        
                        {/* CAMPO DE PREÇO DE CUSTO (RESTAURADO) */}
                        <div className={styles.formGroup}>
                            <label>Preço Custo (R$) <small style={{color:'#999'}}>(Ref)</small></label>
                            <input type="number" step="0.01" className={styles.input} value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} placeholder="0.00" />
                        </div>
                    </div>

                    <div className={styles.row2}>
                        <div className={styles.formGroup}>
                            <label>Comissão (%) <small style={{color:'#666', fontWeight:'normal'}}>(Opcional)</small></label>
                            <input type="number" step="0.1" className={styles.input} value={formData.commission_rate} onChange={e => setFormData({...formData, commission_rate: e.target.value})} placeholder="Ex: 10" />
                        </div>
                    </div>

                    {formData.type === 'product' && (
                        <div className={styles.row2}>
                            <div className={styles.formGroup}>
                                <label>Estoque Atual</label>
                                <input type="number" className={styles.input} value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Estoque Mínimo</label>
                                <input type="number" className={styles.input} value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} />
                            </div>
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label>Descrição</label>
                        <textarea className={styles.input} style={{minHeight:'60px'}} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                    </div>

                    <button type="submit" className={styles.btnSave}>Salvar</button>
                </form>
            </Modal>
        </DashboardLayout>
    );
}