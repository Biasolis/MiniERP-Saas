import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Transactions.module.css';
import { 
    Plus, Loader2, Check, Clock, RotateCcw, Paperclip, Trash2,
    ArrowUpCircle, ArrowDownCircle, DollarSign, Calendar, Search, X 
} from 'lucide-react';

export default function Transactions() {
  const { addToast } = useContext(ToastContext);
  
  // Estados de Dados
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [summary, setSummary] = useState({ income_received:0, expense_paid:0, balance:0 });
  const [loading, setLoading] = useState(true);
  
  // Estados de Controle e Filtros
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [file, setFile] = useState(null);

  // Estados de Autocomplete (Busca de Cliente/Fornecedor)
  const [entitySearchResults, setEntitySearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
      status: 'all',
      type: 'all',
      start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], 
      end_date: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  });

  // Estado do Formulário
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense', // 'expense' ou 'income'
    cost_type: 'variable',
    date: new Date().toISOString().split('T')[0],
    status: 'completed',
    entity_id: '',   // ID do Cliente ou Fornecedor selecionado
    entity_name: '', // Nome para exibir no input
    category_id: '',
    installments: 1,
    use_ai_category: true,
    attachment_path: ''
  });

  // 1. Carregar dados iniciais e monitorar filtros
  useEffect(() => {
    loadData();
    fetchCategories();
  }, [filters]);

  // 2. Monitorar digitação no campo de Entidade (Autocomplete)
  useEffect(() => {
      if (formData.entity_name && isSearching) {
          const delayDebounceFn = setTimeout(async () => {
              try {
                  // Se for Receita busca Clientes, se for Despesa busca Fornecedores
                  const endpoint = formData.type === 'income' ? '/clients' : '/suppliers';
                  const res = await api.get(`${endpoint}?search=${formData.entity_name}`);
                  setEntitySearchResults(res.data);
              } catch (error) {
                  console.error("Erro na busca", error);
              }
          }, 300); // Debounce de 300ms
          return () => clearTimeout(delayDebounceFn);
      } else {
          setEntitySearchResults([]);
      }
  }, [formData.entity_name, formData.type, isSearching]);

  async function loadData() {
    setLoading(true);
    try {
      const query = `?status=${filters.status}&type=${filters.type}&start_date=${filters.start_date}&end_date=${filters.end_date}`;
      
      // Carrega transações e resumo em paralelo
      const [transRes, sumRes] = await Promise.all([
          api.get(`/transactions${query}`),
          api.get(`/transactions/summary${query}`)
      ]);

      setTransactions(transRes.data);
      setSummary(sumRes.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (error) { console.error("Erro ao carregar categorias", error); }
  }

  // --- Ações de Autocomplete ---
  const handleEntitySelect = (entity) => {
      setFormData({
          ...formData,
          entity_id: entity.id,
          entity_name: `${entity.name} (#${entity.code || '?'})`
      });
      setIsSearching(false);
      setEntitySearchResults([]);
  };

  // --- Ações de Transação ---
  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    // Otimista na UI
    setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

    try {
      await api.patch(`/transactions/${id}/status`, { status: newStatus });
      addToast({ type: 'success', title: newStatus === 'completed' ? 'Transação concluída!' : 'Marcado como pendente.' });
      loadData(); // Recarrega resumo financeiro
    } catch (error) {
      loadData(); // Reverte em caso de erro
      addToast({ type: 'error', title: 'Erro ao atualizar status' });
    }
  }

  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este lançamento financeiro?')) return;
    try {
        await api.delete(`/transactions/${id}`);
        setTransactions(prev => prev.filter(t => t.id !== id));
        loadData();
        addToast({ type: 'success', title: 'Lançamento removido.' });
    } catch (error) {
        addToast({ type: 'error', title: 'Erro ao excluir lançamento.' });
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      let finalAttachmentPath = null;
      // Upload de anexo se houver
      if (file) {
          const data = new FormData();
          data.append('file', file);
          const uploadRes = await api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } });
          finalAttachmentPath = uploadRes.data.url;
      }

      // Prepara payload final
      const payload = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        type: formData.type,
        cost_type: formData.cost_type,
        date: formData.date,
        status: formData.status,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        installments: Number(formData.installments),
        use_ai_category: formData.use_ai_category,
        attachment_path: finalAttachmentPath,
        // Mapeia entity_id para o campo correto
        client_id: formData.type === 'income' ? formData.entity_id : null,
        supplier_id: formData.type === 'expense' ? formData.entity_id : null
      };

      await api.post('/transactions', payload);
      
      addToast({ type: 'success', title: 'Transação salva com sucesso!' });
      setIsModalOpen(false);
      
      // Reset do formulário
      setFormData({
        description: '', amount: '', type: 'expense', cost_type: 'variable',
        date: new Date().toISOString().split('T')[0], status: 'completed',
        entity_id: '', entity_name: '', category_id: '', installments: 1,
        use_ai_category: true, attachment_path: ''
      });
      setFile(null);
      loadData(); 
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: error.response?.data?.error || 'Erro ao salvar transação' });
    } finally {
      setIsSaving(false);
    }
  }

  const openAttachment = (path) => {
      if (!path) return;
      const url = path.startsWith('http') ? path : `http://localhost:3000${path}`;
      window.open(url, '_blank');
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');

  return (
    <DashboardLayout>
      {/* HEADER E AÇÕES */}
      <div className={styles.headerAction}>
        <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
            <div style={{display:'flex', flexDirection:'column'}}>
                <h2 style={{margin:0}}>Financeiro</h2>
                <div className={styles.dateFilter} style={{marginTop:'5px', display:'flex', alignItems:'center', gap:'5px', background:'white', padding:'5px', borderRadius:'6px', border:'1px solid #ddd'}}>
                    <Calendar size={14} color="#666"/>
                    <input type="date" value={filters.start_date} onChange={e=>setFilters({...filters, start_date:e.target.value})} style={{border:'none', fontSize:'0.8rem', background:'transparent', outline:'none'}}/>
                    <span style={{fontSize:'0.8rem', color:'#999'}}>até</span>
                    <input type="date" value={filters.end_date} onChange={e=>setFilters({...filters, end_date:e.target.value})} style={{border:'none', fontSize:'0.8rem', background:'transparent', outline:'none'}}/>
                </div>
            </div>
        </div>

        <button onClick={() => setIsModalOpen(true)} className={styles.btnNew}>
          <Plus size={18} /> Nova Transação
        </button>
      </div>

      {/* CARDS DE RESUMO */}
      <div className={styles.summaryGrid} style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'15px', marginBottom:'20px'}}>
          <div className={styles.card} style={{background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:'15px'}}>
              <div style={{background:'#dcfce7', padding:'10px', borderRadius:'50%', color:'#166534'}}><ArrowUpCircle size={24}/></div>
              <div><p style={{margin:0, fontSize:'0.85rem', color:'#6b7280'}}>Receitas Recebidas</p><h3 style={{margin:0, fontSize:'1.2rem'}}>{formatCurrency(summary.income_received)}</h3></div>
          </div>
          <div className={styles.card} style={{background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:'15px'}}>
              <div style={{background:'#fee2e2', padding:'10px', borderRadius:'50%', color:'#991b1b'}}><ArrowDownCircle size={24}/></div>
              <div><p style={{margin:0, fontSize:'0.85rem', color:'#6b7280'}}>Despesas Pagas</p><h3 style={{margin:0, fontSize:'1.2rem'}}>{formatCurrency(summary.expense_paid)}</h3></div>
          </div>
          <div className={styles.card} style={{background:'white', padding:'15px', borderRadius:'8px', border:'1px solid #e5e7eb', display:'flex', alignItems:'center', gap:'15px'}}>
              <div style={{background:'#e0e7ff', padding:'10px', borderRadius:'50%', color:'#3730a3'}}><DollarSign size={24}/></div>
              <div><p style={{margin:0, fontSize:'0.85rem', color:'#6b7280'}}>Saldo em Caixa</p><h3 style={{margin:0, fontSize:'1.2rem', color: summary.balance >= 0 ? '#166534' : '#991b1b'}}>{formatCurrency(summary.balance)}</h3></div>
          </div>
      </div>

      {/* ABAS DE FILTRO */}
      <div style={{marginBottom:'15px', display:'flex', gap:'10px', flexWrap:'wrap'}}>
          <div className={styles.filterTabs}>
              <button className={`${styles.tab} ${filters.status === 'all' ? styles.tabActive : ''}`} onClick={() => setFilters({...filters, status:'all'})}>Todos</button>
              <button className={`${styles.tab} ${filters.status === 'pending' ? styles.tabActive : ''}`} onClick={() => setFilters({...filters, status:'pending'})}>Pendentes</button>
              <button className={`${styles.tab} ${filters.status === 'completed' ? styles.tabActive : ''}`} onClick={() => setFilters({...filters, status:'completed'})}>Concluídos</button>
          </div>
          <div className={styles.filterTabs} style={{marginLeft:'auto'}}>
              <button className={`${styles.tab} ${filters.type === 'all' ? styles.tabActive : ''}`} onClick={() => setFilters({...filters, type:'all'})}>Tudo</button>
              <button className={`${styles.tab} ${filters.type === 'income' ? styles.tabActive : ''}`} onClick={() => setFilters({...filters, type:'income'})}>Entradas</button>
              <button className={`${styles.tab} ${filters.type === 'expense' ? styles.tabActive : ''}`} onClick={() => setFilters({...filters, type:'expense'})}>Saídas</button>
          </div>
      </div>

      {/* TABELA DE DADOS */}
      <div className={styles.container}>
        {loading ? (
          <div style={{padding: '3rem', textAlign: 'center', color: '#6b7280'}}>Carregando...</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{width: '50px'}}>Status</th>
                <th>Data</th>
                <th>Descrição</th>
                <th>Envolvido</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Tipo</th>
                <th style={{textAlign:'center'}}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} style={{ opacity: t.status === 'pending' ? 1 : 0.7 }}>
                  <td>
                    {t.status === 'pending' ? <div className={styles.statusPending} title="Pendente"><Clock size={16} /></div> : <div className={styles.statusCompleted} title="Concluído"><Check size={16} /></div>}
                  </td>
                  <td>{formatDate(t.date)}</td>
                  <td>
                      <div style={{fontWeight: 500, display:'flex', alignItems:'center', gap:'6px', color:'#111827'}}>
                          {t.description}
                          {t.installment_index && <span style={{fontSize:'0.7rem', background:'#eff6ff', border:'1px solid #dbeafe', color:'#1d4ed8', padding:'1px 5px', borderRadius:'10px'}}>{t.installment_index}/{t.installments_total}</span>}
                          {t.attachment_path && (
                              <button onClick={() => openAttachment(t.attachment_path)} style={{border:'none', background:'transparent', cursor:'pointer', color:'#2563eb'}} title="Ver Anexo"><Paperclip size={14} /></button>
                          )}
                      </div>
                  </td>
                  <td style={{color: '#4b5563', fontSize: '0.9rem'}}>{t.client_name || t.supplier_name || '-'}</td>
                  <td style={{color: '#6b7280', fontSize: '0.85rem'}}>{t.category_name || 'Geral'}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(t.amount)}</td>
                  <td>
                    <span className={`${styles.badge} ${t.type === 'income' ? styles.badgeIncome : styles.badgeExpense}`}>
                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td style={{textAlign:'center'}}>
                    <div className={styles.actionsGroup}>
                        <button className={`${styles.actionBtn} ${t.status === 'completed' ? styles.actionBtnCompleted : ''}`} onClick={() => toggleStatus(t.id, t.status)} title="Alterar Status">
                            {t.status === 'pending' ? <Check size={18} /> : <RotateCcw size={16} />}
                        </button>
                        <button className={styles.btnDelete} onClick={() => handleDelete(t.id)} title="Excluir"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && <tr><td colSpan="8" style={{textAlign: 'center', padding: '3rem', color: '#9ca3af'}}>Nenhuma transação encontrada neste período.</td></tr>}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL NOVA TRANSAÇÃO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Transação">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* SELETOR DE TIPO (RECEITA/DESPESA) */}
          <div style={{display:'flex', gap:'10px', marginBottom:'5px'}}>
                <button type="button" 
                    onClick={() => { setFormData({...formData, type: 'income', entity_id: '', entity_name: ''}); }}
                    style={{
                        flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #d1d5db', 
                        background: formData.type === 'income' ? '#dcfce7' : 'white',
                        color: formData.type === 'income' ? '#166534' : '#374151', fontWeight:'bold', cursor:'pointer',
                        display:'flex', justifyContent:'center', alignItems:'center', gap:'5px'
                    }}>
                    <ArrowUpCircle size={18}/> Receita
                </button>
                <button type="button" 
                    onClick={() => { setFormData({...formData, type: 'expense', entity_id: '', entity_name: ''}); }}
                    style={{
                        flex:1, padding:'10px', borderRadius:'8px', border:'1px solid #d1d5db', 
                        background: formData.type === 'expense' ? '#fee2e2' : 'white',
                        color: formData.type === 'expense' ? '#991b1b' : '#374151', fontWeight:'bold', cursor:'pointer',
                        display:'flex', justifyContent:'center', alignItems:'center', gap:'5px'
                    }}>
                    <ArrowDownCircle size={18}/> Despesa
                </button>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight:'500'}}>Descrição</label>
            <input required type="text" placeholder="Ex: Venda de Produto / Conta de Luz" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}} />
          </div>

          {/* CAMPO DE BUSCA CLIENTE/FORNECEDOR (AUTOCOMPLETE) */}
          <div style={{position:'relative'}}>
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight:'500'}}>
                    {formData.type === 'income' ? 'Cliente' : 'Fornecedor'}
                </label>
                <div style={{position:'relative'}}>
                    <input 
                        className={styles.input} 
                        value={formData.entity_name} 
                        onChange={e => {
                            setFormData({...formData, entity_name: e.target.value, entity_id: ''}); 
                            setIsSearching(true);
                        }}
                        placeholder={formData.type === 'income' ? "Digite nome ou código do cliente..." : "Digite nome ou código do fornecedor..."}
                        style={{width: '100%', padding: '0.75rem', paddingRight:'35px', border: '1px solid #d1d5db', borderRadius: '6px'}}
                    />
                    <Search size={18} style={{position:'absolute', right:'10px', top:'12px', color:'#9ca3af'}}/>
                    {formData.entity_id && <Check size={18} style={{position:'absolute', right:'35px', top:'12px', color:'#16a34a'}}/>}
                </div>

                {/* LISTA DE RESULTADOS */}
                {isSearching && entitySearchResults.length > 0 && (
                    <div style={{
                        position:'absolute', top:'100%', left:0, right:0, 
                        background:'white', border:'1px solid #e5e7eb', borderRadius:'8px', 
                        maxHeight:'200px', overflowY:'auto', zIndex:100, boxShadow:'0 4px 6px rgba(0,0,0,0.1)', marginTop:'5px'
                    }}>
                        {entitySearchResults.map(item => (
                            <div key={item.id} 
                                    onClick={() => handleEntitySelect(item)}
                                    style={{padding:'10px 15px', cursor:'pointer', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span style={{fontSize:'0.9rem', color:'#374151'}}>{item.name}</span>
                                <span style={{fontWeight:'bold', color: formData.type === 'income' ? '#4f46e5' : '#059669', fontSize:'0.8rem', background:'#f3f4f6', padding:'2px 6px', borderRadius:'4px'}}>
                                    #{item.code}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight:'500'}}>Valor (R$)</label>
              <input required type="number" step="0.01" placeholder="0.00" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}} />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight:'500'}}>Data</label>
              <input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}} />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
             <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight:'500'}}>Categoria</label>
                <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value})} style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}>
                    <option value="">-- Automático (IA) --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
             </div>
             <div>
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight:'500'}}>Parcelas</label>
                <input type="number" min="1" max="120" value={formData.installments} onChange={e=>setFormData({...formData, installments:e.target.value})} style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}} />
             </div>
          </div>

          <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight:'500'}}>Anexo (Comprovante/Nota)</label>
              <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files[0])} style={{width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', background:'white', fontSize:'0.85rem'}} />
          </div>

          <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#f0f9ff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bae6fd'}}>
            <input type="checkbox" id="aiToggle" checked={formData.use_ai_category} onChange={e => setFormData({...formData, use_ai_category: e.target.checked})} style={{width: '16px', height: '16px', cursor: 'pointer'}} />
            <label htmlFor="aiToggle" style={{fontSize: '0.85rem', cursor: 'pointer', color: '#0369a1'}}><strong>IA Inteligente:</strong> Categorizar automaticamente com base na descrição.</label>
          </div>

          <button type="submit" disabled={isSaving} style={{background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.9rem', borderRadius: '6px', fontWeight: 'bold', marginTop: '0.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', transition:'background 0.2s'}}>
            {isSaving ? <><Loader2 className="spin" size={20} /> Salvando...</> : 'Salvar Transação'}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}