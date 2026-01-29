import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import styles from './StockEntries.module.css'; // Vamos criar abaixo
import { Plus, Save, Paperclip, Trash2, ArrowLeft, Package } from 'lucide-react';

export default function StockEntries() {
    const { addToast } = useContext(ToastContext);
    const [products, setProducts] = useState([]);
    
    // Form Header
    const [header, setHeader] = useState({
        invoice_number: '',
        supplier_name: '',
        entry_date: new Date().toISOString().split('T')[0],
        invoice_url: ''
    });

    // Form Items
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState({ product_id: '', quantity: 1, unit_cost: 0 });

    useEffect(() => {
        loadProducts();
    }, []);

    async function loadProducts() {
        try {
            const res = await api.get('/products');
            // Filtra apenas produtos (serviços não têm entrada de estoque)
            setProducts(res.data.filter(p => p.type === 'product'));
        } catch (e) { console.error(e); }
    }

    const handleHeaderChange = (field, value) => setHeader(prev => ({ ...prev, [field]: value }));

    const handleProductSelect = (id) => {
        const prod = products.find(p => p.id === Number(id));
        if (prod) {
            setNewItem({ 
                product_id: id, 
                quantity: 1, 
                unit_cost: Number(prod.cost_price) || 0 // Puxa o custo atual como sugestão
            });
        }
    };

    const handleAddItem = (e) => {
        e.preventDefault();
        if (!newItem.product_id || newItem.quantity <= 0) return;
        
        const prod = products.find(p => p.id === Number(newItem.product_id));
        
        setItems(prev => [...prev, { 
            ...newItem, 
            name: prod?.name, 
            subtotal: newItem.quantity * newItem.unit_cost,
            tempId: Date.now() // ID temporário para remover da lista antes de salvar
        }]);
        
        setNewItem({ product_id: '', quantity: 1, unit_cost: 0 }); // Limpa
    };

    const handleRemoveItem = (tempId) => {
        setItems(prev => prev.filter(i => i.tempId !== tempId));
    };

    // Upload de NF
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/upload', formData);
            setHeader(prev => ({ ...prev, invoice_url: res.data.fileUrl }));
            addToast({ type: 'success', title: 'NF Anexada!' });
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao enviar arquivo.' });
        }
    };

    const handleSubmit = async () => {
        if (items.length === 0) return addToast({ type: 'error', title: 'Adicione produtos.' });
        if (!header.invoice_number) return addToast({ type: 'error', title: 'Informe o número da nota.' });

        try {
            await api.post('/entries', { ...header, items });
            addToast({ type: 'success', title: 'Entrada registrada com sucesso!' });
            // Reset form
            setHeader({ invoice_number: '', supplier_name: '', entry_date: new Date().toISOString().split('T')[0], invoice_url: '' });
            setItems([]);
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao salvar entrada.' });
        }
    };

    const totalTotal = items.reduce((acc, i) => acc + i.subtotal, 0);

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Entrada de Mercadoria</h2>
                    <button onClick={handleSubmit} className={styles.btnSave}>
                        <Save size={18} /> Confirmar Entrada
                    </button>
                </div>

                {/* --- CARD DA NOTA --- */}
                <div className={styles.card}>
                    <h3>Dados da Nota Fiscal</h3>
                    <div className={styles.gridHeader}>
                        <div>
                            <label>Número da NF</label>
                            <input className={styles.input} value={header.invoice_number} onChange={e => handleHeaderChange('invoice_number', e.target.value)} placeholder="Ex: 12345" />
                        </div>
                        <div>
                            <label>Fornecedor</label>
                            <input className={styles.input} value={header.supplier_name} onChange={e => handleHeaderChange('supplier_name', e.target.value)} placeholder="Ex: Distribuidora XYZ" />
                        </div>
                        <div>
                            <label>Data Emissão</label>
                            <input type="date" className={styles.input} value={header.entry_date} onChange={e => handleHeaderChange('entry_date', e.target.value)} />
                        </div>
                        <div>
                            <label>Anexar Arquivo (PDF/Foto)</label>
                            <div className={styles.fileInputWrapper}>
                                <label htmlFor="nf-upload" className={styles.fileLabel}>
                                    <Paperclip size={16} /> {header.invoice_url ? 'Arquivo Anexado' : 'Selecionar'}
                                </label>
                                <input id="nf-upload" type="file" onChange={handleFileUpload} style={{display:'none'}} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- CARD DE ITENS --- */}
                <div className={styles.card}>
                    <h3>Produtos</h3>
                    
                    {/* Form de Adição */}
                    <div className={styles.addItemRow}>
                        <div style={{flex: 2}}>
                            <select className={styles.input} value={newItem.product_id} onChange={e => handleProductSelect(e.target.value)}>
                                <option value="">-- Selecione o Produto --</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div style={{flex: 1}}>
                            <input type="number" className={styles.input} placeholder="Qtd" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} />
                        </div>
                        <div style={{flex: 1}}>
                            <input type="number" className={styles.input} placeholder="Custo Unit (R$)" value={newItem.unit_cost} onChange={e => setNewItem({...newItem, unit_cost: e.target.value})} />
                        </div>
                        <button onClick={handleAddItem} className={styles.btnAdd}><Plus size={18} /></button>
                    </div>

                    {/* Lista */}
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Produto</th>
                                <th style={{textAlign:'center'}}>Qtd</th>
                                <th style={{textAlign:'right'}}>Custo Unit.</th>
                                <th style={{textAlign:'right'}}>Subtotal</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.tempId}>
                                    <td>{item.name}</td>
                                    <td style={{textAlign:'center'}}>{item.quantity}</td>
                                    <td style={{textAlign:'right'}}>R$ {Number(item.unit_cost).toFixed(2)}</td>
                                    <td style={{textAlign:'right', fontWeight:'bold'}}>R$ {Number(item.subtotal).toFixed(2)}</td>
                                    <td style={{textAlign:'right'}}>
                                        <button onClick={() => handleRemoveItem(item.tempId)} className={styles.btnTrash}><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                            {items.length === 0 && <tr><td colSpan="5" className={styles.empty}>Nenhum produto adicionado.</td></tr>}
                        </tbody>
                    </table>

                    <div className={styles.totalBox}>
                        <span>Total da Nota:</span>
                        <h2>R$ {totalTotal.toFixed(2)}</h2>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}