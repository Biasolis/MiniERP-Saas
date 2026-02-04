import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import styles from './DashboardHome.module.css';
import { 
    TrendingUp, TrendingDown, Wallet, DollarSign,
    PlusCircle, Wrench, Users, Package, FileText,
    ArrowRight, AlertTriangle, ArrowUpRight, ArrowDownRight,
    ShoppingCart, Monitor, MessageSquare, ClipboardList
} from 'lucide-react';

// Recharts - CORREÇÃO: Removido 'Doughnut' que não existe nesta lib
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts';

export default function DashboardHome() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await api.get('/dashboard/stats');
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <DashboardLayout><div className={styles.loading}>Carregando indicadores...</div></DashboardLayout>;
    if (!data) return null;

    const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    // Cores e Dados Auxiliares
    const COLORS_OS = { 'pending': '#f59e0b', 'completed': '#10b981', 'canceled': '#ef4444', 'approved': '#3b82f6' };
    const COLORS_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    // Tratamento seguro para dados de OS
    const osData = data.os?.statusData ? data.os.statusData.map(d => ({ 
        name: d.name === 'pending' ? 'Pendente' : d.name === 'completed' ? 'Concluída' : d.name,
        value: d.value, 
        color: COLORS_OS[d.statusKey] || '#888' 
    })) : [];

    // Tratamento seguro para Orçamentos
    const quotesData = data.quotes ? data.quotes.map((d, i) => ({
        name: d.name, value: d.value, color: COLORS_PIE[i % COLORS_PIE.length]
    })) : [];

    // Tratamento seguro para Tickets
    const ticketsData = data.tickets || [];

    return (
        <DashboardLayout>
            <div className={styles.container}>
                
                {/* --- HEADER --- */}
                <div className={styles.topSection}>
                    <div>
                        <h2 className={styles.title}>Painel de Controle</h2>
                        <p className={styles.subtitle}>Visão unificada do seu negócio hoje.</p>
                    </div>
                    <div className={styles.shortcuts}>
                        <button onClick={() => navigate('/dashboard/transactions')} className={styles.shortcutBtn}><PlusCircle size={16}/> Lançamento</button>
                        <button onClick={() => navigate('/dashboard/service-orders')} className={styles.shortcutBtn}><Wrench size={16}/> Nova OS</button>
                        <button onClick={() => navigate('/dashboard/sales')} className={styles.shortcutBtn}><ShoppingCart size={16}/> Venda</button>
                    </div>
                </div>

                {/* --- KPI CARDS (FINANCEIRO) --- */}
                <div className={styles.kpiGrid}>
                    {/* Receita Mês */}
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span className={styles.kpiTitle}>Receitas (Mês)</span>
                            <div className={`${styles.iconBox} ${styles.green}`}><ArrowUpRight size={20}/></div>
                        </div>
                        <h3 className={styles.kpiValue} style={{color:'#10b981'}}>{formatBRL(data.financial.income)}</h3>
                    </div>

                    {/* Despesa Mês */}
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span className={styles.kpiTitle}>Despesas (Mês)</span>
                            <div className={`${styles.iconBox} ${styles.red}`}><ArrowDownRight size={20}/></div>
                        </div>
                        <h3 className={styles.kpiValue} style={{color:'#ef4444'}}>{formatBRL(data.financial.expense)}</h3>
                    </div>

                    {/* Saldo Mês */}
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span className={styles.kpiTitle}>Saldo (Mês)</span>
                            <div className={`${styles.iconBox} ${styles.blue}`}><TrendingUp size={20}/></div>
                        </div>
                        <h3 className={styles.kpiValue} style={{color: data.financial.balance >= 0 ? '#3b82f6' : '#ef4444'}}>
                            {formatBRL(data.financial.balance)}
                        </h3>
                    </div>

                    {/* --- SALDO GERAL (ACUMULADO) --- */}
                    <div className={styles.kpiCard} style={{borderLeft: '4px solid #8b5cf6'}}>
                        <div className={styles.kpiHeader}>
                            <span className={styles.kpiTitle}>Saldo Acumulado</span>
                            <div className={`${styles.iconBox} ${styles.purple}`}><Wallet size={20}/></div>
                        </div>
                        <h3 className={styles.kpiValue} style={{color: '#8b5cf6'}}>
                            {formatBRL(data.financial.totalBalance)}
                        </h3>
                        <small className={styles.kpiSmall}>Total em caixa histórico</small>
                    </div>
                </div>

                {/* --- ROW 1: GRÁFICOS FINANCEIROS E VENDAS --- */}
                <div className={styles.chartsRow}>
                    
                    {/* Fluxo de Caixa */}
                    <div className={`${styles.chartCard} ${styles.col2}`}>
                        <div className={styles.cardHeader}>
                            <h3>Fluxo de Caixa (6 Meses)</h3>
                        </div>
                        <div style={{height: 300, width: '100%'}}>
                            <ResponsiveContainer>
                                <AreaChart data={data.financial.history}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:12, fill:'#999'}} dy={10} />
                                    <RechartsTooltip formatter={(val) => formatBRL(val)} contentStyle={{borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                    <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                    <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Resumo de Vendas */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3>Resumo de Vendas</h3>
                        </div>
                        <div className={styles.salesSummary}>
                            <div className={styles.salesItem}>
                                <div className={styles.salesIcon}><ShoppingCart size={24} color="#3b82f6"/></div>
                                <div>
                                    <span className={styles.label}>Vendas Totais</span>
                                    <strong>{formatBRL(data.sales.total)}</strong>
                                </div>
                            </div>
                            <div className={styles.salesItem}>
                                <div className={styles.salesIcon}><FileText size={24} color="#f59e0b"/></div>
                                <div>
                                    <span className={styles.label}>Quantidade</span>
                                    <strong>{data.sales.count} pedidos</strong>
                                </div>
                            </div>
                            <div className={styles.divider}></div>
                            <div style={{height: 140, width: '100%', marginTop: 20}}>
                                <ResponsiveContainer>
                                    <BarChart data={[{name: 'Vendas', value: data.sales.total}]}>
                                        <Bar dataKey="value" fill="#3b82f6" radius={[4,4,4,4]} barSize={40} />
                                        <XAxis dataKey="name" hide />
                                        <RechartsTooltip formatter={(val) => formatBRL(val)} cursor={false} contentStyle={{borderRadius:8}}/>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- ROW 2: OPERACIONAL (OS, Tickets, Orçamentos) --- */}
                <div className={styles.chartsRow}>
                    
                    {/* Status OS */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3>Ordens de Serviço</h3>
                            <button onClick={()=>navigate('/dashboard/service-orders')} className={styles.linkBtn}>Ver Todas</button>
                        </div>
                        {osData.length > 0 ? (
                            <div style={{height: 250, width: '100%'}}>
                                <ResponsiveContainer>
                                    {/* PIECHART SIMULANDO DOUGHNUT (InnerRadius > 0) */}
                                    <PieChart>
                                        <Pie data={osData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {osData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{borderRadius:8}} />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <div className={styles.emptyState}>Sem dados de OS</div>}
                    </div>

                    {/* Orçamentos */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3>Orçamentos</h3>
                            <button onClick={()=>navigate('/dashboard/quotes')} className={styles.linkBtn}>Ver Todos</button>
                        </div>
                        {quotesData.length > 0 ? (
                            <div style={{height: 250, width: '100%'}}>
                                <ResponsiveContainer>
                                    <BarChart data={quotesData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0"/>
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{fontSize:12}} />
                                        <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:8}} />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <div className={styles.emptyState}>Sem orçamentos</div>}
                    </div>

                    {/* Tickets / Suporte */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3>Tickets de Suporte</h3>
                            <button onClick={()=>navigate('/dashboard/tickets')} className={styles.linkBtn}>Ver Todos</button>
                        </div>
                        {ticketsData.length > 0 ? (
                            <div style={{height: 250, width: '100%'}}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={ticketsData} cx="50%" cy="50%" outerRadius={80} fill="#8884d8" dataKey="value" label>
                                            {ticketsData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip contentStyle={{borderRadius:8}} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : <div className={styles.emptyState}>Sem tickets abertos</div>}
                    </div>
                </div>

                {/* --- ROW 3: LISTAS --- */}
                <div className={styles.chartsRow}>
                    {/* Alertas de Estoque */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3 style={{color:'#f59e0b', display:'flex', alignItems:'center', gap:8}}><AlertTriangle size={18}/> Estoque Crítico</h3>
                            <button onClick={()=>navigate('/dashboard/products')} className={styles.linkBtn}>Gerenciar</button>
                        </div>
                        <ul className={styles.list}>
                            {data.stock.low.map(p => (
                                <li key={p.id} className={styles.listItem}>
                                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                                        <Package size={16} color="#666"/>
                                        <span style={{fontWeight:500}}>{p.name}</span>
                                    </div>
                                    <span className={styles.badgeWarn}>{p.stock} un</span>
                                </li>
                            ))}
                            {data.stock.low.length === 0 && <li className={styles.emptyState}>Tudo certo com o estoque!</li>}
                        </ul>
                    </div>

                    {/* Últimas Transações */}
                    <div className={`${styles.chartCard} ${styles.col2}`}>
                        <div className={styles.cardHeader}>
                            <h3>Últimas Transações Financeiras</h3>
                        </div>
                        <div className={styles.tableResponsive}>
                            <table style={{width:'100%', borderCollapse:'collapse', fontSize:'0.9rem'}}>
                                <thead>
                                    <tr style={{borderBottom:'1px solid #eee', textAlign:'left', color:'#888'}}>
                                        <th style={{padding:10}}>Descrição</th>
                                        <th style={{padding:10}}>Data</th>
                                        <th style={{padding:10, textAlign:'right'}}>Valor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.recentTransactions.map(t => (
                                        <tr key={t.id} style={{borderBottom:'1px solid #f9f9f9'}}>
                                            <td style={{padding:10, fontWeight:500}}>{t.description}</td>
                                            <td style={{padding:10, color:'#666'}}>{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                                            <td style={{padding:10, textAlign:'right', fontWeight:600, color: t.type === 'income' ? '#10b981' : '#ef4444'}}>
                                                {t.type === 'income' ? '+' : '-'} {formatBRL(t.amount)}
                                            </td>
                                        </tr>
                                    ))}
                                    {data.recentTransactions.length === 0 && (
                                        <tr><td colSpan="3" className={styles.emptyState}>Nenhuma transação recente.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
        </DashboardLayout>
    );
}