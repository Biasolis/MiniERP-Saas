import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import Modal from '../../components/ui/Modal';
import styles from './StockEntries.module.css';
import { 
    Plus, Save, Paperclip, Trash2, ArrowLeft, 
    FileText, Eye, Search 
} from 'lucide-react';

export default function StockEntries() {
    const { addToast } = useContext(ToastContext);
    
    // Modos de Visualização: 'list', 'create'
    const [viewMode, setViewMode] = useState('list');
    
    // Dados
    const [entries, setEntries] = useState([]);
    const [products, setProducts] = useState([]);
    const [suppliers, setSuppliers] = useState([]); // Estado para lista de fornecedores
    const [loading, setLoading] = useState(true);

    // Modal Detalhes
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Form Header
    const [header, setHeader] = useState({
        invoice_number: '',
        supplier_id: '',
        supplier_name: '', // Usado para exibição e busca
        entry_date: new Date().toISOString().split('T')[0],
        invoice_url: '',
        generate_expense: true
    });

    // Form Items
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState({ product_id: '', quantity: 1, unit_cost: 0 });

    useEffect(() => {
        loadEntries();
        loadAuxData();
    }, []);

    async function loadEntries() {
        try {
            const res = await api.get('/entries');
            setEntries(res.data);
        } catch(e) {
            console.error("Erro ao listar entradas", e);
        } finally {
            setLoading(false);
        }
    }

    async function loadAuxData() {
        try {
            const [prodRes, supRes] = await Promise.all([
                api.get('/products'),
                api.get('/suppliers') // Busca a lista de fornecedores
            ]);
            setProducts(prodRes.data.filter(p => p.type === 'product'));
            setSuppliers(supRes.data);
        } catch (e) {
            console.error("Erro ao carregar dados auxiliares", e);
        }
    }

    // --- AÇÕES DA LISTA ---

    const handleDeleteEntry = async (id) => {
        if (!confirm('Tem certeza? Isso excluirá a nota e ESTORNARÁ o estoque adicionado.')) return;
        try {
            await api.delete(`/entries/${id}`);
            addToast({ type: 'success', title: 'Entrada excluída e estoque estornado.' });
            loadEntries();
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao excluir.' });
        }
    };

    const handleViewDetails = async (entry) => {
        try {
            const res = await api.get(`/entries/${entry.id}`);
            setSelectedEntry(res.data); // Retorna { entry, items }
            setIsDetailModalOpen(true);
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao carregar detalhes.' });
        }
    };

    // --- AÇÕES DO FORMULÁRIO ---

    const handleHeaderChange = (field, value) => setHeader(prev => ({ ...prev, [field]: value }));

    // Lógica de Busca de Fornecedor
    const handleSupplierChange = (e) => {
        const val = e.target.value;
        // Tenta encontrar o fornecedor na lista pelo nome digitado
        const found = suppliers.find(s => s.name === val);
        setHeader(prev => ({
            ...prev,
            supplier_name: val,
            supplier_id: found ? found.id : '' // Se achar, vincula ID, senão deixa vazio (texto livre)
        }));
    };

    const handleProductSelect = (id) => {
        const prod = products.find(p => p.id === Number(id));
        if (prod) {
            setNewItem({ 
                product_id: id, 
                quantity: 1, 
                unit_cost: Number(prod.cost_price) || 0 
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
            tempId: Date.now() 
        }]);
        setNewItem({ product_id: '', quantity: 1, unit_cost: 0 });
    };

    const handleRemoveItem = (tempId) => {
        setItems(prev => prev.filter(i => i.tempId !== tempId));
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await api.post('/upload', formData);
            setHeader(prev => ({ ...prev, invoice_url: res.data.fileUrl }));
            addToast({ type: 'success', title: 'Arquivo anexado!' });
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao enviar arquivo.' });
        }
    };

    const handleSubmit = async () => {
        if (items.length === 0) return addToast({ type: 'error', title: 'Adicione produtos.' });
        try {
            await api.post('/entries', { ...header, items });
            addToast({ type: 'success', title: 'Entrada registrada com sucesso!' });
            
            // Reset e volta para lista
            setHeader({ 
                invoice_number: '', supplier_id: '', supplier_name: '', 
                entry_date: new Date().toISOString().split('T')[0], invoice_url: '',
                generate_expense: true
            });
            setItems([]);
            setViewMode('list');
            loadEntries();
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao salvar entrada.' });
        }
    };

    const totalTotal = items.reduce((acc, i) => acc + i.subtotal, 0);

    return (
        <DashboardLayout>
            <div className={styles.container}>
                
                {/* --- MODO LISTA --- */}
                {viewMode === 'list' && (
                    <>
                        <div className={styles.header}>
                            <div>
                                <h2 className={styles.title}>Entradas de Estoque</h2>
                                <p className={styles.subtitle}>Gerencie suas notas fiscais de compra.</p>
                            </div>
                            <button onClick={() => setViewMode('create')} className={styles.btnPrimary}>
                                <Plus size={20} /> Nova Entrada
                            </button>
                        </div>

                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th>Nota Fiscal</th>
                                        <th>Fornecedor</th>
                                        <th>Valor Total</th>
                                        <th>Anexo</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.map(entry => (
                                        <tr key={entry.id}>
                                            <td>{new Date(entry.entry_date).toLocaleDateString('pt-BR')}</td>
                                            <td><strong>{entry.invoice_number || 'S/N'}</strong></td>
                                            <td>{entry.supplier_real_name || entry.supplier_name || '-'}</td>
                                            <td style={{fontWeight:600}}>R$ {Number(entry.total_amount).toFixed(2)}</td>
                                            <td>
                                                {entry.invoice_url ? (
                                                    <a href={`http://localhost:5000${entry.invoice_url}`} target="_blank" rel="noopener noreferrer" className={styles.linkIcon} title="Ver Anexo">
                                                        <Paperclip size={16} /> Ver
                                                    </a>
                                                ) : <span style={{color:'#9ca3af', fontSize:'0.8rem'}}>Sem anexo</span>}
                                            </td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <button onClick={() => handleViewDetails(entry)} className={styles.btnIcon} title="Ver Itens"><Eye size={16}/></button>
                                                    <button onClick={() => handleDeleteEntry(entry.id)} className={styles.btnIconDelete} title="Excluir"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {entries.length === 0 && !loading && <tr><td colSpan="6" className={styles.empty}>Nenhuma entrada registrada.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* --- MODO CRIAÇÃO --- */}
                {viewMode === 'create' && (
                    <>
                        <div className={styles.header}>
                            <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                <button onClick={() => setViewMode('list')} className={styles.btnBack}><ArrowLeft size={20}/></button>
                                <h2 className={styles.title}>Nova Entrada</h2>
                            </div>
                            <button onClick={handleSubmit} className={styles.btnSave}>
                                <Save size={18} /> Confirmar Entrada
                            </button>
                        </div>

                        <div className={styles.card}>
                            <h3>Dados da Nota Fiscal</h3>
                            <div className={styles.gridHeader}>
                                <div>
                                    <label>Número da NF</label>
                                    <input className={styles.input} value={header.invoice_number} onChange={e => handleHeaderChange('invoice_number', e.target.value)} placeholder="Ex: 12345" />
                                </div>
                                
                                {/* CAMPO DE FORNECEDOR COM BUSCA (DATALIST) */}
                                <div>
                                    <label>Fornecedor (Buscar)</label>
                                    <input 
                                        className={styles.input} 
                                        list="supplier-list" 
                                        value={header.supplier_name} 
                                        onChange={handleSupplierChange} 
                                        placeholder="Digite para buscar..." 
                                    />
                                    <datalist id="supplier-list">
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.name} />
                                        ))}
                                    </datalist>
                                </div>

                                <div>
                                    <label>Data Emissão</label>
                                    <input type="date" className={styles.input} value={header.entry_date} onChange={e => handleHeaderChange('entry_date', e.target.value)} />
                                </div>
                                <div>
                                    <label>Anexar Arquivo</label>
                                    <div className={styles.fileInputWrapper}>
                                        <label htmlFor="nf-upload" className={styles.fileLabel}>
                                            <Paperclip size={16} /> {header.invoice_url ? 'Anexado' : 'Selecionar'}
                                        </label>
                                        <input id="nf-upload" type="file" onChange={handleFileUpload} style={{display:'none'}} />
                                    </div>
                                </div>
                            </div>
                            
                            <div style={{marginTop:'15px', display:'flex', alignItems:'center', gap:'10px'}}>
                                <input 
                                    type="checkbox" 
                                    id="gen_expense" 
                                    checked={header.generate_expense} 
                                    onChange={e => handleHeaderChange('generate_expense', e.target.checked)} 
                                    style={{width:'18px', height:'18px', cursor:'pointer'}}
                                />
                                <label htmlFor="gen_expense" style={{cursor:'pointer', color:'#374151', fontWeight:'500'}}>
                                    Gerar conta a pagar (Despesa) automaticamente
                                </label>
                            </div>
                        </div>

                        <div className={styles.card}>
                            <h3>Produtos</h3>
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
                    </>
                )}

                {/* --- MODAL DETALHES --- */}
                <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title="Detalhes da Entrada">
                    {selectedEntry && (
                        <div>
                            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px', background:'#f9fafb', padding:'10px', borderRadius:'8px'}}>
                                <div><strong>Nota:</strong> {selectedEntry.entry.invoice_number}</div>
                                <div><strong>Fornecedor:</strong> {selectedEntry.entry.supplier_real_name || selectedEntry.entry.supplier_name}</div>
                                <div><strong>Data:</strong> {new Date(selectedEntry.entry.entry_date).toLocaleDateString('pt-BR')}</div>
                                <div><strong>Total:</strong> R$ {Number(selectedEntry.entry.total_amount).toFixed(2)}</div>
                                {selectedEntry.entry.invoice_url && (
                                    <div style={{gridColumn:'span 2'}}>
                                        <a href={`http://localhost:5000${selectedEntry.entry.invoice_url}`} target="_blank" rel="noopener noreferrer" style={{display:'flex', alignItems:'center', gap:'5px', color:'#3b82f6', textDecoration:'underline'}}>
                                            <FileText size={16}/> Visualizar Arquivo da Nota
                                        </a>
                                    </div>
                                )}
                            </div>

                            <table className={styles.table} style={{fontSize:'0.9rem'}}>
                                <thead>
                                    <tr>
                                        <th>Produto</th>
                                        <th style={{textAlign:'center'}}>Qtd</th>
                                        <th style={{textAlign:'right'}}>Custo</th>
                                        <th style={{textAlign:'right'}}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedEntry.items.map(i => (
                                        <tr key={i.id}>
                                            <td>{i.product_name}</td>
                                            <td style={{textAlign:'center'}}>{i.quantity}</td>
                                            <td style={{textAlign:'right'}}>R$ {Number(i.unit_cost).toFixed(2)}</td>
                                            <td style={{textAlign:'right'}}>R$ {Number(i.subtotal).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Modal>

            </div>
        </DashboardLayout>
    );
}