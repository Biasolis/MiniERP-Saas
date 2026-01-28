import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Products.module.css'; // Vamos criar/atualizar este CSS
import { 
    Package, Plus, Search, AlertTriangle, TrendingUp, TrendingDown, 
    Edit, Trash2, History, ArrowRight, ArrowLeft
} from 'lucide-react';

export default function Products() {
  const { addToast } = useContext(ToastContext);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  
  // Estados de Edição/Criação
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', sku: '', category: '', sale_price: '', cost_price: '', 
    stock: '', min_stock: '5', unit: 'un', description: ''
  });

  // Estados de Ajuste de Estoque
  const [adjustData, setAdjustData] = useState({ id: null, type: 'in', quantity: '', reason: 'adjustment' });

  useEffect(() => { loadProducts(); }, []);

  async function loadProducts() {
    setLoading(true);
    try {
        const res = await api.get('/products');
        setProducts(res.data);
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao carregar produtos' });
    } finally {
        setLoading(false);
    }
  }

  // --- CRUD ---
  function handleOpenCreate() {
      setEditingProduct(null);
      setFormData({ name: '', sku: '', category: '', sale_price: '', cost_price: '', stock: '', min_stock: '5', unit: 'un', description: '' });
      setIsModalOpen(true);
  }

  function handleOpenEdit(product) {
      setEditingProduct(product);
      setFormData({
          name: product.name, sku: product.sku || '', category: product.category || '',
          sale_price: product.sale_price, cost_price: product.cost_price,
          stock: product.stock, min_stock: product.min_stock, unit: product.unit || 'un',
          description: product.description || ''
      });
      setIsModalOpen(true);
  }

  async function handleSubmit(e) {
      e.preventDefault();
      try {
          if (editingProduct) {
              await api.put(`/products/${editingProduct.id}`, formData);
              addToast({ type: 'success', title: 'Produto atualizado!' });
          } else {
              await api.post('/products', formData);
              addToast({ type: 'success', title: 'Produto criado!' });
          }
          setIsModalOpen(false);
          loadProducts();
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao salvar' });
      }
  }

  async function handleDelete(id) {
      if(!confirm('Excluir este produto?')) return;
      try {
          await api.delete(`/products/${id}`);
          setProducts(prev => prev.filter(p => p.id !== id));
          addToast({ type: 'success', title: 'Produto removido' });
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao remover' });
      }
  }

  // --- AJUSTE DE ESTOQUE ---
  function handleOpenAdjust(product) {
      setAdjustData({ id: product.id, productName: product.name, type: 'in', quantity: '', reason: 'adjustment' });
      setIsAdjustModalOpen(true);
  }

  async function handleAdjustSubmit(e) {
      e.preventDefault();
      try {
          await api.patch(`/products/${adjustData.id}/adjust`, {
              type: adjustData.type,
              quantity: Number(adjustData.quantity),
              reason: adjustData.reason,
              notes: 'Ajuste manual via Painel'
          });
          addToast({ type: 'success', title: 'Estoque atualizado!' });
          setIsAdjustModalOpen(false);
          loadProducts();
      } catch (error) {
          addToast({ type: 'error', title: error.response?.data?.message || 'Erro ao ajustar' });
      }
  }

  // Filtro
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <DashboardLayout>
      <div className={styles.header}>
        <h2>Gestão de Estoque & Produtos</h2>
        <button className={styles.btnPrimary} onClick={handleOpenCreate}>
            <Plus size={18} /> Novo Produto
        </button>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
            <Search size={18} color="#9ca3af" />
            <input 
                placeholder="Buscar produto..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {loading ? <p>Carregando...</p> : (
        <div className={styles.gridContainer}>
            {filteredProducts.map(prod => (
                <div key={prod.id} className={styles.productCard}>
                    <div className={styles.cardHeader}>
                        <div className={styles.iconBox}><Package size={20} /></div>
                        {prod.stock <= prod.min_stock && (
                            <div className={styles.alertBadge} title="Estoque Baixo">
                                <AlertTriangle size={14} /> Baixo
                            </div>
                        )}
                    </div>
                    
                    <h3 className={styles.prodName}>{prod.name}</h3>
                    <small className={styles.prodSku}>SKU: {prod.sku || '-'}</small>

                    <div className={styles.priceRow}>
                        <div>
                            <span className={styles.label}>Venda</span>
                            <div className={styles.price}>R$ {Number(prod.sale_price).toFixed(2)}</div>
                        </div>
                        <div style={{textAlign:'right'}}>
                            <span className={styles.label}>Estoque</span>
                            <div className={`${styles.stock} ${prod.stock <= prod.min_stock ? styles.textRed : ''}`}>
                                {prod.stock} {prod.unit}
                            </div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button onClick={() => handleOpenAdjust(prod)} className={styles.btnAdjust} title="Ajustar Estoque">
                            <History size={16} /> Estoque
                        </button>
                        <div style={{display:'flex', gap:'5px'}}>
                            <button onClick={() => handleOpenEdit(prod)} className={styles.btnIcon}><Edit size={16}/></button>
                            <button onClick={() => handleDelete(prod.id)} className={styles.btnIconDanger}><Trash2 size={16}/></button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* MODAL CRIAR/EDITAR */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Editar Produto" : "Novo Produto"}>
        <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
                <div className={styles.fullWidth}>
                    <label>Nome do Produto</label>
                    <input required className={styles.input} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                    <label>SKU (Código)</label>
                    <input className={styles.input} value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} />
                </div>
                <div>
                    <label>Categoria</label>
                    <input className={styles.input} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="Ex: Serviços, Peças" />
                </div>
                <div>
                    <label>Preço de Custo</label>
                    <input type="number" step="0.01" className={styles.input} value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} />
                </div>
                <div>
                    <label>Preço de Venda</label>
                    <input required type="number" step="0.01" className={styles.input} value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} />
                </div>
                
                {/* Estoque só é editável na criação. Na edição usa-se o ajuste */}
                {!editingProduct && (
                    <div>
                        <label>Estoque Inicial</label>
                        <input type="number" className={styles.input} value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
                    </div>
                )}
                
                <div>
                    <label>Estoque Mínimo</label>
                    <input type="number" className={styles.input} value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} />
                </div>
                <div>
                    <label>Unidade</label>
                    <select className={styles.input} value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                        <option value="un">Unidade (un)</option>
                        <option value="kg">Quilos (kg)</option>
                        <option value="lt">Litros (lt)</option>
                        <option value="m">Metros (m)</option>
                        <option value="cx">Caixa (cx)</option>
                    </select>
                </div>
            </div>
            <button type="submit" className={styles.btnPrimary} style={{marginTop:'15px', width:'100%', justifyContent:'center'}}>Salvar Produto</button>
        </form>
      </Modal>

      {/* MODAL AJUSTE DE ESTOQUE */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title={`Ajustar Estoque: ${adjustData.productName}`}>
          <form onSubmit={handleAdjustSubmit}>
              <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
                  <button 
                    type="button"
                    className={`${styles.typeBtn} ${adjustData.type === 'in' ? styles.activeIn : ''}`}
                    onClick={() => setAdjustData({...adjustData, type: 'in'})}
                  >
                      <ArrowRight size={16} /> Entrada
                  </button>
                  <button 
                    type="button"
                    className={`${styles.typeBtn} ${adjustData.type === 'out' ? styles.activeOut : ''}`}
                    onClick={() => setAdjustData({...adjustData, type: 'out'})}
                  >
                      <ArrowLeft size={16} /> Saída
                  </button>
              </div>

              <div style={{marginBottom:'15px'}}>
                  <label>Quantidade</label>
                  <input required type="number" className={styles.input} value={adjustData.quantity} onChange={e => setAdjustData({...adjustData, quantity: e.target.value})} />
              </div>

              <div style={{marginBottom:'15px'}}>
                  <label>Motivo</label>
                  <select className={styles.input} value={adjustData.reason} onChange={e => setAdjustData({...adjustData, reason: e.target.value})}>
                      <option value="adjustment">Ajuste / Contagem</option>
                      <option value="purchase">Compra</option>
                      <option value="sale">Venda Avulsa</option>
                      <option value="return">Devolução</option>
                      <option value="loss">Perda / Roubo</option>
                  </select>
              </div>

              <button type="submit" className={styles.btnPrimary} style={{width:'100%', justifyContent:'center'}}>
                  Confirmar {adjustData.type === 'in' ? 'Entrada' : 'Saída'}
              </button>
          </form>
      </Modal>

    </DashboardLayout>
  );
}