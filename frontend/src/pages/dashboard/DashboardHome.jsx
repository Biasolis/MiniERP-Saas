import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import styles from './DashboardHome.module.css';
import { 
    TrendingUp, TrendingDown, DollarSign, Wallet,
    PlusCircle, Wrench, Users, Package, FileText,
    ArrowRight, AlertTriangle, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

// Recharts (Gráficos)
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardHome() {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/dashboard/stats')
           .then(res => setData(res.data))
           .catch(err => console.error(err))
           .finally(() => setLoading(false));
    }, []);

    if (loading) return <DashboardLayout><div className={styles.loading}>Carregando central...</div></DashboardLayout>;
    if (!data) return null;

    // Formatadores
    const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    
    // Cores OS
    const COLORS_OS = { 'open': '#3b82f6', 'in_progress': '#f59e0b', 'completed': '#10b981', 'waiting': '#9ca3af' };
    const pieData = data.os.statusData.map(d => ({ ...d, color: COLORS_OS[d.statusKey] || '#888' }));

    return (
        <DashboardLayout>
            <div className={styles.container}>
                
                {/* CABEÇALHO E ATALHOS */}
                <div className={styles.topSection}>
                    <div>
                        <h2 className={styles.title}>Visão Geral</h2>
                        <p className={styles.subtitle}>Resumo das atividades da sua empresa.</p>
                    </div>
                    <div className={styles.shortcuts}>
                        <button onClick={() => navigate('/dashboard/transactions')} className={styles.shortcutBtn} title="Novo Lançamento">
                            <PlusCircle size={18} /> <span className={styles.btnLabel}>Lançamento</span>
                        </button>
                        <button onClick={() => navigate('/dashboard/service-orders')} className={styles.shortcutBtn} title="Nova OS">
                            <Wrench size={18} /> <span className={styles.btnLabel}>Nova OS</span>
                        </button>
                        <button onClick={() => navigate('/dashboard/clients')} className={styles.shortcutBtn} title="Novo Cliente">
                            <Users size={18} /> <span className={styles.btnLabel}>Cliente</span>
                        </button>
                        <button onClick={() => navigate('/dashboard/products')} className={styles.shortcutBtn} title="Novo Produto">
                            <Package size={18} /> <span className={styles.btnLabel}>Produto</span>
                        </button>
                    </div>
                </div>

                {/* KPI CARDS (FINANCEIRO) */}
                <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span className={styles.kpiTitle}>Receitas (Mês)</span>
                            <div className={styles.iconBox} style={{bg:'#ecfdf5', color:'#10b981'}}><ArrowUpRight size={20}/></div>
                        </div>
                        <h3 className={styles.kpiValue} style={{color:'#10b981'}}>{formatBRL(data.financial.income)}</h3>
                    </div>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span className={styles.kpiTitle}>Despesas (Mês)</span>
                            <div className={styles.iconBox} style={{bg:'#fef2f2', color:'#ef4444'}}><ArrowDownRight size={20}/></div>
                        </div>
                        <h3 className={styles.kpiValue} style={{color:'#ef4444'}}>{formatBRL(data.financial.expense)}</h3>
                    </div>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span className={styles.kpiTitle}>Saldo Atual</span>
                            <div className={styles.iconBox} style={{bg:'#eff6ff', color:'#3b82f6'}}><Wallet size={20}/></div>
                        </div>
                        <h3 className={styles.kpiValue} style={{color: data.financial.balance >= 0 ? '#3b82f6' : '#ef4444'}}>
                            {formatBRL(data.financial.balance)}
                        </h3>
                    </div>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiHeader}>
                            <span className={styles.kpiTitle}>Total OS</span>
                            <div className={styles.iconBox} style={{bg:'#f5f3ff', color:'#8b5cf6'}}><FileText size={20}/></div>
                        </div>
                        <h3 className={styles.kpiValue}>{data.os.total}</h3>
                    </div>
                </div>

                {/* GRÁFICOS PRINCIPAIS */}
                <div className={styles.chartsRow}>
                    
                    {/* Gráfico Financeiro (Área) */}
                    <div className={`${styles.chartCard} ${styles.col2}`}>
                        <div className={styles.cardHeader}>
                            <h3>Evolução Financeira (6 Meses)</h3>
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
                                    <YAxis hide/>
                                    <RechartsTooltip formatter={(val) => formatBRL(val)} contentStyle={{borderRadius:8, border:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.1)'}}/>
                                    <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                    <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Gráfico Status OS (Pie) */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3>Status das OS</h3>
                        </div>
                        {pieData.length > 0 ? (
                            <div style={{height: 300, width: '100%'}}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                        </Pie>
                                        <RechartsTooltip />
                                        <Legend verticalAlign="bottom" height={36}/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className={styles.emptyState}>Sem dados de OS</div>
                        )}
                    </div>
                </div>

                <div className={styles.chartsRow}>
                    
                    {/* Gráfico OS Diária (Barra) */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3>Volume de OS (7 Dias)</h3>
                        </div>
                        <div style={{height: 250, width: '100%'}}>
                            <ResponsiveContainer>
                                <BarChart data={data.os.dailyData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0"/>
                                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize:12}} />
                                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius:8}}/>
                                    <Bar dataKey="Qtd" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Alertas de Estoque */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3 style={{color:'#f59e0b', display:'flex', alignItems:'center', gap:8}}><AlertTriangle size={18}/> Estoque Crítico</h3>
                            <button onClick={()=>navigate('/dashboard/products')} className={styles.linkBtn}>Ver</button>
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
                            {data.stock.low.length === 0 && <li className={styles.emptyState}>Estoque ok!</li>}
                        </ul>
                    </div>

                    {/* Últimas Transações */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3>Últimas Transações</h3>
                            <button onClick={()=>navigate('/dashboard/transactions')} className={styles.linkBtn}>Ver</button>
                        </div>
                        <ul className={styles.list}>
                            {data.recentTransactions.map(t => (
                                <li key={t.id} className={styles.listItem}>
                                    <div style={{display:'flex', flexDirection:'column'}}>
                                        <span style={{fontWeight:500}}>{t.description}</span>
                                        <span style={{fontSize:11, color:'#999'}}>{new Date(t.date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <span style={{fontWeight:600, color: t.type === 'income' ? '#10b981' : '#ef4444'}}>
                                        {t.type === 'income' ? '+' : '-'} {formatBRL(t.amount)}
                                    </span>
                                </li>
                            ))}
                            {data.recentTransactions.length === 0 && <li className={styles.emptyState}>Nenhuma transação.</li>}
                        </ul>
                    </div>

                </div>

            </div>
        </DashboardLayout>
    );
}