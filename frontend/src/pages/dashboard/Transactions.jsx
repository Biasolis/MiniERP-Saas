import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './Transactions.module.css';
import { Plus, Loader2, Check, Clock, RotateCcw, Paperclip, Trash2 } from 'lucide-react';

export default function Transactions() {
  const { addToast } = useContext(ToastContext);
  
  // Estados de Dados
  const [transactions, setTransactions] = useState([]);
  const [clients, setClients] = useState([]); // Lista de clientes para o select
  const [loading, setLoading] = useState(true);
  
  // Estados de Controle
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // all, pending, completed
  const [isSaving, setIsSaving] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'expense',
    cost_type: 'variable',
    date: new Date().toISOString().split('T')[0],
    status: 'completed',
    client_id: '',       // ID do Cliente/Fornecedor
    use_ai_category: true,
    attachment_path: ''  // Caminho do arquivo
  });

  // Estado do Arquivo (Upload)
  const [file, setFile] = useState(null);

  // 1. Carregar dados iniciais
  useEffect(() => {
    loadTransactions();
    loadClients();
  }, [filterStatus]);

  async function loadTransactions() {
    setLoading(true);
    try {
      let url = '/transactions';
      if (filterStatus !== 'all') {
        url += `?status=${filterStatus}`;
      }
      const response = await api.get(url);
      setTransactions(response.data.data);
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao carregar transações' });
    } finally {
      setLoading(false);
    }
  }

  async function loadClients() {
    try {
        const res = await api.get('/clients');
        setClients(res.data);
    } catch (error) {
        console.error("Erro ao carregar clientes", error);
    }
  }

  // 2. Ação de mudar status (Pendente <-> Concluído)
  async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';
    
    // Atualização otimista (UI primeiro)
    setTransactions(prev => prev.map(t => 
        t.id === id ? { ...t, status: newStatus } : t
    ));

    try {
      await api.patch(`/transactions/${id}/status`, { status: newStatus });
      addToast({ 
        type: 'success', 
        title: newStatus === 'completed' ? 'Transação concluída!' : 'Marcado como pendente.' 
      });
    } catch (error) {
      // Reverte se der erro
      loadTransactions();
      addToast({ type: 'error', title: 'Erro ao atualizar status' });
    }
  }

  // 3. Ação de Excluir Transação (NOVO)
  async function handleDelete(id) {
    if (!confirm('Tem certeza que deseja excluir este lançamento financeiro?')) return;

    try {
        await api.delete(`/transactions/${id}`);
        setTransactions(prev => prev.filter(t => t.id !== id));
        addToast({ type: 'success', title: 'Lançamento removido com sucesso.' });
    } catch (error) {
        console.error(error);
        addToast({ type: 'error', title: 'Erro ao excluir lançamento.' });
    }
  }

  // 4. Salvar Nova Transação (Com Upload)
  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);

    try {
      let finalAttachmentPath = null;

      // A. Se o usuário selecionou um arquivo, faz o upload primeiro
      if (file) {
          const data = new FormData();
          data.append('file', file);
          
          // Envia para rota de upload
          const uploadRes = await api.post('/upload', data, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          finalAttachmentPath = uploadRes.data.url; // Retorna URL S3 ou caminho relativo local
      }

      // B. Salva a transação com os dados + caminho do arquivo
      await api.post('/transactions', {
        ...formData,
        amount: parseFloat(formData.amount),
        client_id: formData.client_id ? parseInt(formData.client_id) : null,
        attachment_path: finalAttachmentPath
      });
      
      addToast({ type: 'success', title: 'Transação salva com sucesso!' });
      setIsModalOpen(false);
      
      // Resetar formulário
      setFormData({
        description: '',
        amount: '',
        type: 'expense',
        cost_type: 'variable',
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        client_id: '',
        use_ai_category: true,
        attachment_path: ''
      });
      setFile(null);
      
      loadTransactions(); 
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro ao salvar transação' });
    } finally {
      setIsSaving(false);
    }
  }

  // Helper para abrir anexo
  const openAttachment = (path) => {
      if (!path) return;
      if (path.startsWith('http')) {
          window.open(path, '_blank');
      } else {
          const baseUrl = 'http://localhost:3000'; 
          window.open(`${baseUrl}${path}`, '_blank');
      }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');

  return (
    <DashboardLayout>
      <div className={styles.headerAction}>
        <div style={{display:'flex', gap:'1rem', alignItems:'center'}}>
            <h2>Financeiro</h2>
            
            {/* Filtros de Aba */}
            <div className={styles.filterTabs}>
                <button 
                    className={`${styles.tab} ${filterStatus === 'all' ? styles.tabActive : ''}`}
                    onClick={() => setFilterStatus('all')}
                >
                    Todas
                </button>
                <button 
                    className={`${styles.tab} ${filterStatus === 'pending' ? styles.tabActive : ''}`}
                    onClick={() => setFilterStatus('pending')}
                >
                    A Pagar / Receber
                </button>
                <button 
                    className={`${styles.tab} ${filterStatus === 'completed' ? styles.tabActive : ''}`}
                    onClick={() => setFilterStatus('completed')}
                >
                    Concluídas
                </button>
            </div>
        </div>

        <button onClick={() => setIsModalOpen(true)} className={styles.btnNew}>
          <Plus size={18} /> Nova Transação
        </button>
      </div>

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
                    {t.status === 'pending' ? (
                        <div className={styles.statusPending} title="Pendente">
                            <Clock size={16} />
                        </div>
                    ) : (
                        <div className={styles.statusCompleted} title="Concluído">
                            <Check size={16} />
                        </div>
                    )}
                  </td>
                  <td>{formatDate(t.date)}</td>
                  <td>
                      <div style={{fontWeight: 500, display:'flex', alignItems:'center', gap:'6px'}}>
                          {t.description}
                          {t.attachment_path && (
                              <button 
                                onClick={() => openAttachment(t.attachment_path)} 
                                title="Ver Comprovante Anexado" 
                                style={{border:'none', background:'transparent', cursor:'pointer', color:'#2563eb', display:'flex', alignItems:'center'}}
                              >
                                  <Paperclip size={14} />
                              </button>
                          )}
                      </div>
                  </td>
                  <td style={{color: '#4b5563', fontSize: '0.9rem'}}>{t.client_name || '-'}</td>
                  <td style={{color: '#6b7280', fontSize: '0.85rem'}}>{t.category_name || 'Geral'}</td>
                  <td style={{ fontWeight: 'bold' }}>{formatCurrency(t.amount)}</td>
                  <td>
                    <span className={`${styles.badge} ${t.type === 'income' ? styles.badgeIncome : styles.badgeExpense}`}>
                      {t.type === 'income' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td style={{textAlign:'center'}}>
                    <div className={styles.actionsGroup}>
                        <button 
                            className={`${styles.actionBtn} ${t.status === 'completed' ? styles.actionBtnCompleted : ''}`}
                            onClick={() => toggleStatus(t.id, t.status)}
                            title={t.status === 'pending' ? "Marcar como Pago/Recebido" : "Desfazer (Marcar como Pendente)"}
                        >
                            {t.status === 'pending' ? <Check size={18} /> : <RotateCcw size={16} />}
                        </button>
                        
                        {/* Botão de Excluir */}
                        <button 
                            className={styles.btnDelete}
                            onClick={() => handleDelete(t.id)}
                            title="Excluir Lançamento"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                 <tr><td colSpan="8" style={{textAlign: 'center', padding: '3rem', color: '#9ca3af'}}>Nenhuma transação encontrada neste filtro.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL DE CRIAÇÃO */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Transação">
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Descrição</label>
            <input 
              required
              type="text" 
              placeholder="Ex: Servidores AWS"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
            />
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Cliente / Fornecedor</label>
            <select
                value={formData.client_id}
                onChange={e => setFormData({...formData, client_id: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
            >
                <option value="">-- Selecione (Opcional) --</option>
                {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type === 'client' ? 'C' : 'F'})</option>
                ))}
            </select>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Valor (R$)</label>
              <input 
                required
                type="number" 
                step="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData({...formData, amount: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Data Vencimento</label>
              <input 
                required
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Tipo</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              >
                <option value="expense">Saída (Despesa)</option>
                <option value="income">Entrada (Receita)</option>
              </select>
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Situação Inicial</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
                style={{width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px'}}
              >
                <option value="completed">Já Pago / Recebido</option>
                <option value="pending">Pendente (Agendar)</option>
              </select>
            </div>
          </div>

          <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>
                  Anexar Comprovante (Imagem ou PDF)
              </label>
              <input 
                type="file" 
                accept="image/*,application/pdf"
                onChange={e => setFile(e.target.files[0])}
                style={{width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px', background:'white'}}
              />
              {file && <small style={{color:'#16a34a', display:'block', marginTop:'4px'}}>Arquivo selecionado: {file.name}</small>}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.75rem', 
            background: '#f0f9ff', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bae6fd'
          }}>
            <input 
              type="checkbox" 
              id="aiToggle"
              checked={formData.use_ai_category}
              onChange={e => setFormData({...formData, use_ai_category: e.target.checked})}
              style={{width: '16px', height: '16px', cursor: 'pointer'}}
            />
            <label htmlFor="aiToggle" style={{fontSize: '0.9rem', cursor: 'pointer', color: '#0369a1'}}>
              <strong>Gemini AI:</strong> Categorizar automaticamente
            </label>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            style={{
                background: 'var(--primary-color)', color: 'white', border: 'none', padding: '0.8rem',
                borderRadius: '6px', fontWeight: 'bold', marginTop: '0.5rem', cursor: 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem'
            }}
          >
            {isSaving ? <><Loader2 className="spin" size={20} /> Processando...</> : 'Salvar Transação'}
          </button>
        </form>
      </Modal>
    </DashboardLayout>
  );
}