import { useState, useEffect, useContext, useRef } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';
import { Plus, Search, Edit, Trash2, Tag, Barcode, AlertTriangle, ScanLine } from 'lucide-react';
import styles from './Products.module.css';

export default function Products() {
  const { addToast } = useContext(ToastContext);
  const searchInputRef = useRef(null);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState(null); 
  
  // Estado inicial completo para evitar erros de uncontrolled components
  const initialFormState = {
      name: '', description: '', price: '', cost_price: '', 
      stock: '0', min_stock: '5', sku: '', category: '', 
      type: 'product', barcode: '', unit: 'un' // Adicionado unit aqui
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = async () => {
    try {
        const res = await api.get('/products');
        setProducts(res.data);
    } catch (e) {
        console.error(e);
        addToast({ type: 'error', title: 'Erro', message: 'Erro ao carregar produtos.' });
    } finally {
        setLoading(false);
    }
  };

  const loadCategories = async () => {
      try {
          const res = await api.get('/categories');
          setCategories(res.data);
      } catch (e) { console.error(e); }
  };

  const handleOpenModal = (product = null) => {
      if (product) {
          setCurrentProduct(product);
          setFormData({
              name: product.name,
              description: product.description || '',
              price: product.sale_price,
              cost_price: product.cost_price || '',
              stock: product.stock,
              min_stock: product.min_stock || 5,
              sku: product.sku || '',
              category: product.category_id || '',
              type: product.type || 'product',
              barcode: product.barcode || '',
              unit: product.unit || 'un'
          });
      } else {
          setCurrentProduct(null);
          setFormData(initialFormState);
      }
      setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
      if(!confirm("Tem certeza que deseja excluir este item?")) return;
      try {
          await api.delete(`/products/${id}`);
          addToast({ type: 'success', title: 'Sucesso', message: 'Item excluído.' });
          loadProducts();
      } catch (e) {
          addToast({ type: 'error', title: 'Erro', message: e.response?.data?.message || 'Erro ao excluir.' });
      }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      try {
          const payload = {
              ...formData,
              category_id: formData.category
          };

          if (currentProduct) {
              await api.put(`/products/${currentProduct.id}`, payload);
              addToast({ type: 'success', title: 'Atualizado', message: 'Produto editado com sucesso.' });
          } else {
              await api.post('/products', payload);
              addToast({ type: 'success', title: 'Criado', message: 'Produto criado com sucesso.' });
          }
          setIsModalOpen(false);
          loadProducts();
      } catch (e) {
          addToast({ type: 'error', title: 'Erro', message: e.response?.data?.message || 'Erro ao salvar.' });
      }
  };

  const filteredProducts = products.filter(p => {
      const term = searchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || 
             (p.sku && p.sku.toLowerCase().includes(term)) ||
             (p.barcode && p.barcode.includes(term));
  });

  return (
    <DashboardLayout>
      <div className={styles.header}>
          <div>
              <h1>Produtos e Serviços</h1>
              <p>Gerencie seu catálogo, preços e estoque.</p>
          </div>
          <button onClick={() => handleOpenModal()} className={styles.btnPrimary}>
              <Plus size={20}/> Novo Item
          </button>
      </div>

      <div className={styles.toolbar}>
          <div className={styles.searchBox} style={{
              display: 'flex', alignItems: 'center', background: 'white', 
              border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 15px', 
              width: '100%', maxWidth: '600px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
              <input 
                  ref={searchInputRef}
                  placeholder="Pesquisar por nome, código de barras ou SKU..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ border: 'none', outline: 'none', width: '100%', fontSize: '1rem', color: '#1e293b' }}
                  autoFocus
              />
              {searchTerm && (
                  <span style={{
                      fontSize: '0.8rem', color: '#64748b', marginRight: '10px', 
                      background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap'
                  }}>
                      {filteredProducts.length} encontrados
                  </span>
              )}
              <Search size={20} style={{color: '#94a3b8', marginLeft: '5px'}}/>
          </div>
      </div>

      {loading ? <p style={{padding:'20px', textAlign:'center', color:'#64748b'}}>Carregando catálogo...</p> : (
          <div className={styles.tableContainer}>
              <table className={styles.table} style={{width:'100%', borderCollapse:'collapse', background:'white', borderRadius:'8px'}}>
                  <thead style={{background:'#f8fafc', borderBottom:'1px solid #e2e8f0'}}>
                      <tr>
                          <th style={{textAlign:'left', padding:'12px 16px', fontSize:'0.85rem', color:'#475569', textTransform:'uppercase'}}>Item</th>
                          <th style={{textAlign:'left', padding:'12px 16px', fontSize:'0.85rem', color:'#475569', textTransform:'uppercase'}}>Códigos</th>
                          <th style={{textAlign:'center', padding:'12px 16px', fontSize:'0.85rem', color:'#475569', textTransform:'uppercase'}}>Tipo</th>
                          <th style={{textAlign:'right', padding:'12px 16px', fontSize:'0.85rem', color:'#475569', textTransform:'uppercase'}}>Preço Venda</th>
                          <th style={{textAlign:'center', padding:'12px 16px', fontSize:'0.85rem', color:'#475569', textTransform:'uppercase'}}>Estoque</th>
                          <th style={{textAlign:'center', padding:'12px 16px', fontSize:'0.85rem', color:'#475569', textTransform:'uppercase'}}>Ações</th>
                      </tr>
                  </thead>
                  <tbody>
                      {filteredProducts.length === 0 && (
                          <tr><td colSpan="6" style={{padding:'40px', textAlign:'center', color:'#94a3b8'}}>Nenhum produto encontrado.</td></tr>
                      )}
                      {filteredProducts.map(p => (
                          <tr key={p.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                              <td style={{padding:'12px 16px'}}>
                                  <div style={{fontWeight:'600', color:'#1e293b'}}>{p.name}</div>
                                  <div style={{fontSize:'0.8rem', color:'#64748b'}}>{p.category_name || 'Sem Categoria'}</div>
                              </td>
                              <td style={{padding:'12px 16px'}}>
                                  {p.barcode && <div title="EAN" style={{fontSize:'0.8rem', display:'flex', alignItems:'center', gap:'4px'}}><ScanLine size={14} color="#64748b"/> {p.barcode}</div>}
                                  {p.sku && <div title="SKU" style={{fontSize:'0.8rem', color:'#64748b', display:'flex', alignItems:'center', gap:'4px'}}><Tag size={14}/> {p.sku}</div>}
                              </td>
                              <td style={{padding:'12px 16px', textAlign:'center'}}>
                                  <span style={{
                                      padding:'4px 10px', borderRadius:'20px', fontSize:'0.75rem', fontWeight:'600',
                                      background: p.type === 'service' ? '#e0e7ff' : '#dcfce7',
                                      color: p.type === 'service' ? '#3730a3' : '#166534',
                                  }}>
                                      {p.type === 'service' ? 'Serviço' : 'Produto'}
                                  </span>
                              </td>
                              <td style={{padding:'12px 16px', textAlign:'right', fontWeight:'600', color:'#0f172a'}}>
                                  R$ {Number(p.sale_price).toFixed(2)}
                              </td>
                              <td style={{padding:'12px 16px', textAlign:'center'}}>
                                  {p.type === 'service' ? <span style={{color:'#94a3b8'}}>-</span> : (
                                      <span style={{
                                          color: p.stock <= p.min_stock ? '#dc2626' : '#1e293b', 
                                          fontWeight: p.stock <= p.min_stock ? 'bold' : 'normal', 
                                          display:'flex', alignItems:'center', justifyContent:'center', gap:'5px'
                                      }}>
                                          {p.stock <= p.min_stock && <AlertTriangle size={16}/>}
                                          {p.stock} {p.unit}
                                      </span>
                                  )}
                              </td>
                              <td style={{padding:'12px 16px', textAlign:'center'}}>
                                  <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                                      <button onClick={() => handleOpenModal(p)} className={styles.actionBtn}><Edit size={18}/></button>
                                      <button onClick={() => handleDelete(p.id)} className={styles.actionBtn} style={{color:'#ef4444'}}><Trash2 size={18}/></button>
                                  </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      )}

      {/* MODAL AJUSTADO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={currentProduct ? "Editar Item" : "Novo Item"}>
          <form onSubmit={handleSubmit} className={styles.formGrid}>
              
              <div className={styles.fullWidth}>
                  <label>Nome do Item *</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: Parafuso Sextavado..." />
              </div>

              <div className={styles.fullWidth} style={{marginBottom:'5px'}}>
                  <label>Tipo de Item</label>
                  <div style={{display:'flex', gap:'20px', marginTop:'8px'}}>
                      <label style={{display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'0.9rem'}}>
                          <input type="radio" name="type" checked={formData.type === 'product'} onChange={() => setFormData({...formData, type: 'product'})} />
                          Produto Físico
                      </label>
                      <label style={{display:'flex', alignItems:'center', gap:'6px', cursor:'pointer', fontSize:'0.9rem'}}>
                          <input type="radio" name="type" checked={formData.type === 'service'} onChange={() => setFormData({...formData, type: 'service'})} />
                          Serviço (Mão de Obra)
                      </label>
                  </div>
              </div>

              <div>
                  <label>Preço de Venda (R$)</label>
                  <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0,00" />
              </div>

              <div>
                  <label>Custo (R$)</label>
                  <input type="number" step="0.01" value={formData.cost_price} onChange={e => setFormData({...formData, cost_price: e.target.value})} placeholder="0,00" />
              </div>

              <div>
                  <label>Código de Barras (EAN)</label>
                  <div className={styles.inputIconWrapper}>
                      <input placeholder="Leitor ou Digite" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                      <Barcode size={18} className={styles.inputIcon}/>
                  </div>
              </div>

              <div>
                  <label>SKU (Código Interno)</label>
                  <input value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} placeholder="Ex: PRD-001" />
              </div>

              <div>
                  <label>Categoria</label>
                  <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option value="">Selecione...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
              </div>

              <div>
                  <label>Unidade</label>
                  <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilo (kg)</option>
                      <option value="mt">Metro (m)</option>
                      <option value="lt">Litro (l)</option>
                      <option value="hr">Hora (h)</option>
                      <option value="cx">Caixa (cx)</option>
                  </select>
              </div>

              {formData.type === 'product' && (
                  <>
                      <div className={styles.fullWidth} style={{
                          borderTop:'1px solid #e2e8f0', marginTop:'10px', paddingTop:'15px', 
                          fontWeight:'600', color:'#475569', fontSize:'0.9rem'
                      }}>
                          Controle de Estoque
                      </div>
                      <div>
                          <label>Estoque Atual</label>
                          <input type="number" 
                              value={formData.stock} 
                              onChange={e => setFormData({...formData, stock: e.target.value})} 
                              disabled={!!currentProduct} 
                              title={currentProduct ? "Para ajustar o estoque, use a tela de Entradas ou Movimentações" : ""}
                          />
                      </div>
                      <div>
                          <label>Estoque Mínimo</label>
                          <input type="number" value={formData.min_stock} onChange={e => setFormData({...formData, min_stock: e.target.value})} />
                      </div>
                  </>
              )}

              <div className={styles.fullWidth}>
                  <label>Descrição Detalhada</label>
                  <textarea rows="3" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Informações adicionais do produto..."/>
              </div>

              <div className={styles.actions}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className={styles.btnCancel}>Cancelar</button>
                  <button type="submit" className={styles.btnSave}>Salvar Item</button>
              </div>
          </form>
      </Modal>
    </DashboardLayout>
  );
}