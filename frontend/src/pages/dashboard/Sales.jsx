import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import { 
    Plus, Search, Calendar, User, ArrowRight, 
    Filter, Loader, ShoppingBag, Clock
} from 'lucide-react';

export default function Sales() {
  const navigate = useNavigate();
  const { addToast } = useContext(ToastContext);
  
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [filters, setFilters] = useState({ 
      client: '', 
      startDate: '', 
      endDate: '',
      status: '' 
  });

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await api.get(`/sales?${query}`);
      setSales(res.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewSale = async () => {
    try {
      const res = await api.post('/sales', { 
          client_id: null, 
          status: 'draft', 
          total_amount: 0 
      });
      navigate(`/dashboard/sales/${res.data.id}`);
    } catch (error) {
      addToast({ type: 'error', title: 'Erro', message: 'Não foi possível iniciar a venda' });
    }
  };

  // Formatação
  const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('pt-BR');
  
  const getStatusBadge = (status) => {
      const config = {
          'draft': { label: 'Rascunho', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
          'open': { label: 'Em Aberto', color: '#0369a1', bg: '#e0f2fe', border: '#bae6fd' },
          'completed': { label: 'Concluída', color: '#15803d', bg: '#dcfce7', border: '#86efac' },
          'canceled': { label: 'Cancelada', color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
      };
      const curr = config[status] || config['draft'];
      return (
          <span style={{
              backgroundColor: curr.bg, color: curr.color, border: `1px solid ${curr.border}`,
              padding: '4px 12px', borderRadius: '20px', 
              fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px'
          }}>
              {curr.label}
          </span>
      );
  };

  return (
    <DashboardLayout>
      {/* CABEÇALHO */}
      <div style={styles.header}>
        <div>
            <h1 style={styles.title}>Vendas & Pedidos</h1>
            <p style={styles.subtitle}>Consulte e gerencie as suas negociações</p>
        </div>
        <button onClick={handleNewSale} style={styles.btnPrimary}>
            <Plus size={18} /> Nova Venda
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={styles.filterContainer}>
        <div style={styles.filterGroup}>
            <div style={styles.inputWrapper}>
                <User size={16} color="#94a3b8" />
                <input 
                    placeholder="Buscar Cliente..." 
                    value={filters.client} 
                    onChange={e => setFilters({...filters, client: e.target.value})} 
                    style={styles.input} 
                />
            </div>
            
            <div style={styles.inputWrapper}>
                <Calendar size={16} color="#94a3b8" />
                <input 
                    type="date" 
                    value={filters.startDate} 
                    onChange={e => setFilters({...filters, startDate: e.target.value})} 
                    style={styles.input} 
                />
            </div>

            <div style={styles.inputWrapper}>
                <Filter size={16} color="#94a3b8" />
                <select 
                    value={filters.status} 
                    onChange={e => setFilters({...filters, status: e.target.value})}
                    style={styles.select}
                >
                    <option value="">Status: Todos</option>
                    <option value="draft">Rascunho</option>
                    <option value="open">Em Aberto</option>
                    <option value="completed">Concluída</option>
                </select>
            </div>

            <button onClick={loadSales} style={styles.btnSecondary}>
                <Search size={16}/>
            </button>
        </div>
      </div>

      {/* LISTA DE CARTÕES (EM VEZ DE TABELA) */}
      <div style={styles.listContainer}>
        {loading ? (
            <div style={{textAlign:'center', padding:'40px', color:'#64748b'}}>
                <div style={{display:'flex', justifyContent:'center', alignItems:'center', gap:'10px'}}>
                    <Loader size={24} className="spin" /> A carregar vendas...
                </div>
            </div>
        ) : sales.length === 0 ? (
            <div style={{textAlign:'center', padding:'40px', color:'#94a3b8', background:'white', borderRadius:'12px', border:'1px dashed #e2e8f0'}}>
                <ShoppingBag size={40} style={{marginBottom:'10px', opacity:0.5}} />
                <p>Nenhuma venda encontrada.</p>
            </div>
        ) : (
            sales.map(sale => (
                <div key={sale.id} style={styles.card} onClick={() => navigate(`/dashboard/sales/${sale.id}`)}>
                    
                    {/* Lado Esquerdo: Identificação e Cliente */}
                    <div style={{flex: 1}}>
                        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'5px'}}>
                            <span style={styles.saleId}>#{String(sale.id).padStart(6,'0')}</span>
                            {getStatusBadge(sale.status)}
                        </div>
                        
                        <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                            <User size={16} color="#64748b" />
                            <span style={{fontWeight:'600', color:'#1e293b', fontSize:'1rem'}}>
                                {sale.client_name || 'Consumidor Final'}
                            </span>
                        </div>
                    </div>

                    {/* Centro: Data */}
                    <div style={styles.metaInfo}>
                        <div style={{display:'flex', alignItems:'center', gap:'6px', color:'#64748b', fontSize:'0.85rem'}}>
                            <Clock size={14} />
                            {formatDate(sale.created_at)}
                        </div>
                    </div>

                    {/* Lado Direito: Valor e Ação */}
                    <div style={styles.amountAction}>
                        <div style={{textAlign:'right'}}>
                            <span style={{display:'block', fontSize:'0.75rem', color:'#64748b', textTransform:'uppercase'}}>Total</span>
                            <span style={{fontSize:'1.1rem', fontWeight:'700', color:'#0f172a'}}>
                                {formatCurrency(sale.total_amount)}
                            </span>
                        </div>
                        <div style={styles.arrowBox}>
                            <ArrowRight size={20} color="#3b82f6" />
                        </div>
                    </div>

                </div>
            ))
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </DashboardLayout>
  );
}

const styles = {
    // Layout
    header: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' },
    title: { color:'#1e293b', margin:0, fontSize:'1.5rem', fontWeight:'700' },
    subtitle: { color:'#64748b', fontSize:'0.9rem', marginTop:'4px' },

    // Botões
    btnPrimary: { 
        background:'#3b82f6', color:'white', border:'none', padding:'10px 20px', borderRadius:'8px', 
        cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontWeight:'600', 
        fontSize:'0.9rem', boxShadow:'0 2px 4px rgba(59, 130, 246, 0.3)', transition:'0.2s'
    },
    btnSecondary: { 
        background:'#f8fafc', color:'#475569', border:'1px solid #cbd5e1', padding:'10px', borderRadius:'8px', 
        cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'600', minWidth:'42px'
    },

    // Filtros
    filterContainer: { background:'white', padding:'15px', borderRadius:'12px', boxShadow:'0 1px 2px rgba(0,0,0,0.05)', marginBottom:'20px', border:'1px solid #e2e8f0' },
    filterGroup: { display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' },
    inputWrapper: { 
        display:'flex', alignItems:'center', gap:'10px', background:'#f8fafc', 
        padding:'8px 12px', borderRadius:'8px', border:'1px solid #e2e8f0', flex:1, minWidth:'180px' 
    },
    input: { border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.9rem', color:'#334155' },
    select: { border:'none', background:'transparent', outline:'none', width:'100%', fontSize:'0.9rem', color:'#334155', cursor:'pointer' },

    // Lista e Cartões
    listContainer: { display:'flex', flexDirection:'column', gap:'12px' },
    card: { 
        background:'white', padding:'16px 20px', borderRadius:'12px', 
        border:'1px solid #e2e8f0', boxShadow:'0 1px 3px rgba(0,0,0,0.02)',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        cursor:'pointer', transition:'all 0.2s ease', gap:'15px', flexWrap:'wrap'
    },
    // Estilos internos do cartão
    saleId: { fontSize:'0.85rem', fontWeight:'700', color:'#64748b', background:'#f1f5f9', padding:'2px 6px', borderRadius:'4px' },
    metaInfo: { display:'flex', flexDirection:'column', justifyContent:'center' },
    amountAction: { display:'flex', alignItems:'center', gap:'15px', marginLeft:'auto' },
    arrowBox: { 
        width:'36px', height:'36px', borderRadius:'50%', background:'#eff6ff', 
        display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid #dbeafe'
    }
};