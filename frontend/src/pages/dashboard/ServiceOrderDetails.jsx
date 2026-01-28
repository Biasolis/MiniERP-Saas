import { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './ServiceOrderDetails.module.css'; // CSS Novo
import { ArrowLeft, Printer, Plus, Trash2, Check, Package, DollarSign } from 'lucide-react';

export default function ServiceOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useContext(ToastContext);

    const [os, setOS] = useState(null);
    const [items, setItems] = useState([]);
    const [products, setProducts] = useState([]); // Lista para select
    const [loading, setLoading] = useState(true);

    // Estado form item
    const [newItem, setNewItem] = useState({ product_id: '', description: '', quantity: 1, unit_price: 0 });

    useEffect(() => {
        loadData();
        loadProducts();
    }, [id]);

    async function loadData() {
        try {
            const res = await api.get(`/service-orders/${id}`);
            setOS(res.data.os);
            setItems(res.data.items);
        } catch (error) {
            addToast({type:'error', title: 'Erro ao carregar OS'});
        } finally {
            setLoading(false);
        }
    }

    async function loadProducts() {
        try {
            const res = await api.get('/products');
            setProducts(res.data);
        } catch(e) {}
    }

    // Ao selecionar produto, preenche preço e nome
    const handleProductChange = (prodId) => {
        const prod = products.find(p => p.id === Number(prodId));
        if (prod) {
            setNewItem({
                ...newItem,
                product_id: prodId,
                description: prod.name,
                unit_price: prod.sale_price
            });
        } else {
            setNewItem({...newItem, product_id: '', description: '', unit_price: 0});
        }
    };

    async function handleAddItem(e) {
        e.preventDefault();
        try {
            await api.post(`/service-orders/${id}/items`, newItem);
            addToast({type:'success', title: 'Item adicionado'});
            setNewItem({ product_id: '', description: '', quantity: 1, unit_price: 0 });
            loadData(); // Recarrega totais
        } catch (error) {
            addToast({type:'error', title: 'Erro ao adicionar item'});
        }
    }

    async function handleRemoveItem(itemId) {
        if(!confirm('Remover item?')) return;
        try {
            await api.delete(`/service-orders/${id}/items/${itemId}`);
            loadData();
        } catch(e) {
            addToast({type:'error', title: 'Erro ao remover'});
        }
    }

    async function changeStatus(newStatus) {
        if(newStatus === 'completed' && !confirm('Finalizar OS? Isso irá baixar o estoque e gerar receita no financeiro.')) return;
        
        try {
            await api.patch(`/service-orders/${id}/status`, { status: newStatus });
            addToast({type:'success', title: `Status alterado para ${newStatus}`});
            loadData();
        } catch(e) {
            addToast({type:'error', title: 'Erro ao atualizar status'});
        }
    }

    if (loading) return <DashboardLayout>Carregando...</DashboardLayout>;
    if (!os) return null;

    return (
        <DashboardLayout>
            <div className={styles.header}>
                <button onClick={() => navigate('/dashboard/service-orders')} className={styles.backBtn}>
                    <ArrowLeft size={16} /> Voltar
                </button>
                <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={() => navigate(`/print/os/${id}`)} className={styles.btnPrint}>
                        <Printer size={16} /> Imprimir
                    </button>
                    {os.status !== 'completed' && (
                        <button onClick={() => changeStatus('completed')} className={styles.btnFinish}>
                            <Check size={16} /> Finalizar OS
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.gridContainer}>
                {/* COLUNA ESQUERDA: DADOS */}
                <div className={styles.leftCol}>
                    <div className={styles.card}>
                        <div style={{display:'flex', justifyContent:'space-between'}}>
                            <h3>OS #{os.id}</h3>
                            <span className={`${styles.badge} ${os.status}`}>{os.status}</span>
                        </div>
                        <div className={styles.divider}></div>
                        <p><strong>Cliente:</strong> {os.client_name}</p>
                        <p><strong>Equipamento:</strong> {os.equipment}</p>
                        <p><strong>Prioridade:</strong> {os.priority}</p>
                        <div className={styles.divider}></div>
                        <p style={{color:'#6b7280', fontSize:'0.9rem'}}>"{os.description}"</p>
                    </div>

                    {/* FORM ADICIONAR PRODUTO */}
                    {os.status !== 'completed' && (
                        <div className={styles.card}>
                            <h4>Adicionar Produtos / Serviços</h4>
                            <form onSubmit={handleAddItem} style={{marginTop:'10px'}}>
                                <div style={{marginBottom:'10px'}}>
                                    <select 
                                        className={styles.input} 
                                        value={newItem.product_id}
                                        onChange={e => handleProductChange(e.target.value)}
                                    >
                                        <option value="">-- Selecione um Produto --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name} (Estoque: {p.stock})</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{marginBottom:'10px'}}>
                                    <input 
                                        className={styles.input} 
                                        placeholder="Descrição (ou Serviço Avulso)" 
                                        value={newItem.description}
                                        onChange={e => setNewItem({...newItem, description: e.target.value})}
                                    />
                                </div>
                                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                                    <input 
                                        type="number" className={styles.input} placeholder="Qtd"
                                        value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                                    />
                                    <input 
                                        type="number" step="0.01" className={styles.input} placeholder="Preço Unit."
                                        value={newItem.unit_price} onChange={e => setNewItem({...newItem, unit_price: e.target.value})}
                                    />
                                </div>
                                <button type="submit" className={styles.btnAdd} style={{marginTop:'10px', width:'100%'}}>
                                    <Plus size={16} /> Adicionar Item
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: ITENS */}
                <div className={styles.rightCol}>
                    <div className={styles.card}>
                        <h3>Itens da Ordem</h3>
                        <table className={styles.itemTable}>
                            <thead>
                                <tr>
                                    <th>Item</th>
                                    <th>Qtd</th>
                                    <th>Unit.</th>
                                    <th>Subtotal</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.description}</td>
                                        <td>{item.quantity}</td>
                                        <td>R$ {Number(item.unit_price).toFixed(2)}</td>
                                        <td style={{fontWeight:'bold'}}>R$ {Number(item.subtotal).toFixed(2)}</td>
                                        <td>
                                            {os.status !== 'completed' && (
                                                <button onClick={() => handleRemoveItem(item.id)} style={{border:'none', background:'transparent', color:'#ef4444', cursor:'pointer'}}>
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', color:'#9ca3af'}}>Nenhum item adicionado.</td></tr>}
                            </tbody>
                        </table>
                        
                        <div className={styles.totalBox}>
                            <span>Total Geral:</span>
                            <h2>R$ {Number(os.total_amount).toFixed(2)}</h2>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}