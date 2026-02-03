import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api'; // Usa a instância global com interceptors
import { Printer, ArrowLeft, FileText, Smartphone } from 'lucide-react';

export default function PrintOS() {
    const { id } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Modos: 'thermal', 'a4', 'a5_landscape'
    const mode = searchParams.get('mode') || 'thermal';

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                // 1. Busca Dados da OS
                const osResponse = await api.get(`/service-orders/${id}`);
                const osData = osResponse.data;

                // 2. Busca Dados da Empresa (Tenant) separadamente para garantir
                let companyData = osData.company || {}; 
                try {
                    const tenantResponse = await api.get('/settings'); // Endpoint de configurações
                    if (tenantResponse.data) {
                        companyData = { ...companyData, ...tenantResponse.data };
                    }
                } catch (err) {
                    console.warn("Não foi possível carregar config extra da empresa", err);
                }

                // 3. Monta objeto final
                setData({
                    ...osData,
                    company: companyData,
                    // Garante que custom_fields seja um array
                    custom_fields: osData.custom_fields || []
                });

            } catch (err) {
                console.error("Erro ao carregar OS para impressão:", err);
                setError('Erro ao carregar dados da OS.');
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [id]);

    const changeMode = (newMode) => {
        setSearchParams({ mode: newMode });
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div style={styles.loading}>Carregando documento...</div>;
    if (error) return <div style={styles.error}>{error} <button onClick={() => navigate(-1)} style={{marginLeft:'10px', padding:'5px 10px', cursor:'pointer'}}>Voltar</button></div>;
    if (!data) return null;

    // Seleciona Layout
    let LayoutComponent;
    if (mode === 'a4') LayoutComponent = LayoutStandard;
    else if (mode === 'a5_landscape') LayoutComponent = LayoutA5Landscape;
    else LayoutComponent = LayoutThermal;

    return (
        <div style={{minHeight:'100vh', background:'#525659', paddingBottom:'50px'}}>
            {/* TOOLBAR (Não sai na impressão) */}
            <div className="no-print" style={styles.toolbar}>
                <div style={{display:'flex', alignItems:'center', gap:'15px'}}>
                    <button onClick={() => navigate(-1)} style={styles.btnBack}>
                        <ArrowLeft size={18} /> Voltar
                    </button>
                    
                    <div style={{display:'flex', gap:'5px', background:'#222', padding:'4px', borderRadius:'6px'}}>
                        <button onClick={() => changeMode('thermal')} style={{...styles.modeBtn, background: mode === 'thermal' ? '#666' : 'transparent'}} title="Impressora Térmica">
                            <Smartphone size={16}/> 80mm
                        </button>
                        <button onClick={() => changeMode('a4')} style={{...styles.modeBtn, background: mode === 'a4' ? '#666' : 'transparent'}} title="Folha A4 Normal">
                            <FileText size={16}/> A4
                        </button>
                        <button onClick={() => changeMode('a5_landscape')} style={{...styles.modeBtn, background: mode === 'a5_landscape' ? '#666' : 'transparent'}} title="Meia Folha Deitada">
                            <FileText size={16} style={{transform:'rotate(90deg)'}}/> A5
                        </button>
                    </div>
                </div>
                
                <button onClick={handlePrint} style={styles.btnPrint}>
                    <Printer size={18} /> IMPRIMIR
                </button>
            </div>

            {/* PAPEL DE VISUALIZAÇÃO */}
            <div style={styles.paperWrapper}>
                <LayoutComponent data={data} mode={mode} />
            </div>

            {/* CSS DE IMPRESSÃO GLOBAL */}
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; margin: 0; padding: 0; }
                    #root { width: 100%; }
                    div[class*="paperWrapper"] { padding: 0 !important; display: block !important; }
                    div[style*="box-shadow"] { box-shadow: none !important; margin: 0 !important; }
                }
            `}</style>
        </div>
    );
}

// Estilos Gerais
const styles = {
    loading: { display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', color:'white', background:'#525659' },
    error: { padding:'40px', textAlign:'center', color:'white' },
    toolbar: {
        position: 'sticky', top: 0, zIndex: 1000,
        background: '#323639', padding: '10px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxShadow: '0 2px 10px rgba(0,0,0,0.3)', marginBottom: '20px'
    },
    btnBack: {
        background: 'transparent', border: '1px solid #666', color: '#eee',
        padding: '8px 15px', borderRadius: '4px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px'
    },
    modeBtn: {
        border:'none', color:'white', padding:'6px 12px', borderRadius:'4px', 
        cursor:'pointer', display:'flex', alignItems:'center', gap:'5px', fontSize:'12px'
    },
    btnPrint: {
        background: '#3b82f6', border: 'none', color: 'white',
        padding: '8px 20px', borderRadius: '4px', cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold'
    },
    paperWrapper: {
        display: 'flex', justifyContent: 'center', paddingBottom: '50px'
    }
};

// ==================================================================================
// LAYOUT 1: TÉRMICO (80mm)
// ==================================================================================
function LayoutThermal({ data }) {
    const { os, items, company, custom_fields } = data;
    
    const s = {
        container: { fontFamily: 'monospace', width: '80mm', padding: '10px', background: 'white', fontSize: '11px', color: '#000', boxShadow: '0 0 10px rgba(0,0,0,0.5)', margin:'0 auto' },
        center: { textAlign: 'center' },
        bold: { fontWeight: 'bold' },
        line: { borderBottom: '1px dashed #000', margin: '5px 0' },
        row: { display: 'flex', justifyContent: 'space-between' }
    };

    return (
        <div style={s.container}>
            <div style={s.center}>
                {/* Logo se existir */}
                {company?.logo_url && <img src={company.logo_url} alt="Logo" style={{maxHeight:'50px', maxWidth:'100%', marginBottom:'5px'}} />}
                <div style={{fontSize:'13px', fontWeight:'bold', textTransform:'uppercase'}}>{company?.name || 'SUA EMPRESA'}</div>
                {company?.document && <div>CNPJ: {company.document}</div>}
                {company?.phone && <div>Tel: {company.phone}</div>}
                <div style={{fontSize:'10px'}}>{company?.address}</div>
            </div>
            
            <div style={s.line}></div>
            <div style={s.row}><span>OS: {String(os.id).padStart(6,'0')}</span><span>{new Date(os.created_at).toLocaleDateString()}</span></div>
            
            <div style={s.line}></div>
            <div style={s.bold}>CLIENTE</div>
            <div>{os.client_name}</div>
            {os.client_phone && <div>Tel: {os.client_phone}</div>}
            
            <div style={s.line}></div>
            <div style={s.bold}>EQUIPAMENTO / SERVIÇO</div>
            <div>{os.equipment}</div>
            {/* CAMPOS EXTRAS DINÂMICOS */}
            {custom_fields?.length > 0 && (
                <div style={{marginTop:'3px'}}>
                    {custom_fields.map((f, i) => (
                        <div key={i} style={{fontSize:'10px'}}>
                            <strong>{f.label}:</strong> {f.value}
                        </div>
                    ))}
                </div>
            )}
            
            {os.description && (
                <div style={{background:'#eee', padding:'4px', marginTop:'4px', fontSize:'10px', borderRadius:'2px'}}>
                    {os.description}
                </div>
            )}

            <div style={s.line}></div>
            <div style={s.bold}>ITENS</div>
            {items?.map((item, i) => (
                <div key={i} style={{display:'flex', justifyContent:'space-between', marginBottom:'2px'}}>
                    <div style={{flex:1}}>{parseFloat(item.quantity)}x {item.description}</div>
                    <div style={s.bold}>{Number(item.subtotal).toFixed(2)}</div>
                </div>
            ))}

            <div style={s.line}></div>
            <div style={{...s.row, fontSize:'13px', fontWeight:'bold'}}>
                <span>TOTAL:</span>
                <span>R$ {Number(os.total_amount).toFixed(2)}</span>
            </div>

            {company?.os_observation_message && (
                <div style={{marginTop:'10px', fontSize:'10px'}}>
                    <strong>OBS:</strong> {company.os_observation_message}
                </div>
            )}

            <div style={{marginTop:'20px', textAlign:'center', fontSize:'10px'}}>
                __________________________<br/>
                Assinatura
            </div>

            <style>{`@media print { @page { margin: 0; } }`}</style>
        </div>
    );
}

// ==================================================================================
// LAYOUT 2: A4 (RETRATO) & A5 (PAISAGEM)
// ==================================================================================
function LayoutStandard({ data }) {
    return <BaseLayout data={data} paperSize="a4" />;
}

function LayoutA5Landscape({ data }) {
    return <BaseLayout data={data} paperSize="a5_landscape" />;
}

function BaseLayout({ data, paperSize }) {
    const { os, items, company, custom_fields } = data;
    const isA5 = paperSize === 'a5_landscape';

    // Configurações de estilo baseadas no tamanho do papel
    const pageStyle = {
        fontFamily: 'Helvetica, Arial, sans-serif',
        background: 'white',
        color: '#000',
        lineHeight: '1.3',
        margin: '0 auto',
        // Medidas exatas para impressão
        width: isA5 ? '210mm' : '210mm', // Na tela ambos tem largura similar
        minHeight: isA5 ? '148mm' : '297mm',
        padding: isA5 ? '8mm' : '10mm',
        fontSize: isA5 ? '10px' : '11px', 
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
        overflow: 'hidden'
    };

    const borderStyle = '1px solid #ccc';
    const headerBg = '#f3f4f6';

    return (
        <div style={pageStyle}>
            {/* CABEÇALHO */}
            <div style={{display:'flex', justifyContent:'space-between', borderBottom:'2px solid #000', paddingBottom:'10px', marginBottom:'10px'}}>
                <div style={{display:'flex', gap:'15px', alignItems:'center'}}>
                    {company?.logo_url && (
                        <img src={company.logo_url} alt="Logo" style={{height: isA5 ? '40px' : '60px', objectFit:'contain'}} />
                    )}
                    <div>
                        <h1 style={{margin:0, fontSize: isA5 ? '16px' : '20px', textTransform:'uppercase'}}>{company?.name || 'SUA EMPRESA'}</h1>
                        <div style={{fontSize: isA5 ? '9px' : '10px', color:'#444', marginTop:'2px'}}>
                            {company?.address} <br/>
                            {company?.phone && <span>Tel: {company.phone}</span>} 
                            {company?.email_contact && <span> | {company.email_contact}</span>}
                            {company?.document && <span> | CNPJ: {company.document}</span>}
                        </div>
                    </div>
                </div>
                <div style={{textAlign:'right'}}>
                    <div style={{fontSize: isA5 ? '20px' : '24px', fontWeight:'bold'}}>OS N° {String(os.id).padStart(6,'0')}</div>
                    <div style={{fontSize: isA5 ? '10px' : '11px'}}>Emissão: {new Date(os.created_at).toLocaleDateString()}</div>
                    <div style={{
                        marginTop:'5px', padding:'2px 8px', background:'#eee', borderRadius:'4px', 
                        display:'inline-block', fontWeight:'bold', textTransform:'uppercase', fontSize:'10px'
                    }}>
                        {os.status === 'open' ? 'Aberta' : os.status === 'completed' ? 'Finalizada' : os.status}
                    </div>
                </div>
            </div>

            {/* GRID DE DADOS (CLIENTE E EQUIPAMENTO) */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                
                {/* DADOS CLIENTE */}
                <div style={{border: borderStyle, borderRadius:'4px', padding:'8px'}}>
                    <div style={{background: headerBg, margin:'-8px -8px 5px -8px', padding:'4px 8px', fontWeight:'bold', fontSize:'10px', borderBottom: borderStyle}}>
                        DADOS DO CLIENTE
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:'2px 10px'}}>
                        <strong>Cliente:</strong> <span>{os.client_name}</span>
                        <strong>Doc:</strong> <span>{os.client_document || '-'}</span>
                        <strong>Contato:</strong> <span>{os.client_phone || '-'}</span>
                        <strong>Endereço:</strong> <span>{os.address || '-'}</span>
                    </div>
                </div>

                {/* DADOS EQUIPAMENTO / CAMPOS EXTRAS */}
                <div style={{border: borderStyle, borderRadius:'4px', padding:'8px'}}>
                    <div style={{background: headerBg, margin:'-8px -8px 5px -8px', padding:'4px 8px', fontWeight:'bold', fontSize:'10px', borderBottom: borderStyle}}>
                        EQUIPAMENTO / DETALHES
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'auto 1fr', gap:'2px 10px'}}>
                        <strong>Equipamento:</strong> <span style={{fontWeight:'bold'}}>{os.equipment}</span>
                        {/* Renderiza APENAS campos que existem */}
                        {custom_fields && custom_fields.length > 0 ? (
                            custom_fields.map(f => (
                                <div key={f.id} style={{display:'contents'}}>
                                    <strong>{f.label}:</strong> <span>{f.value || '-'}</span>
                                </div>
                            ))
                        ) : (
                            /* Fallback se não tiver campos personalizados mas tiver os antigos */
                            <>
                                {os.identifier && <><strong >Identificador:</strong> <span>{os.identifier}</span></>}
                                {os.mileage && <strong>KM/Medidor:</strong>}{os.mileage && <span>{os.mileage}</span>}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* DESCRIÇÃO */}
            <div style={{border: borderStyle, borderRadius:'4px', padding:'8px', marginBottom:'10px', background:'#fdfdfd'}}>
                <strong style={{display:'block', fontSize:'10px', marginBottom:'2px', color:'#555', textTransform:'uppercase'}}>Descrição do Problema / Solicitação:</strong>
                <div style={{whiteSpace:'pre-wrap', minHeight:'20px'}}>{os.description}</div>
            </div>

            {/* TABELA DE ITENS */}
            <table style={{width:'100%', borderCollapse:'collapse', marginBottom:'10px', fontSize: isA5 ? '10px' : '11px'}}>
                <thead>
                    <tr style={{background: headerBg}}>
                        <th style={{border: borderStyle, padding:'4px', textAlign:'left'}}>Descrição do Produto / Serviço</th>
                        <th style={{border: borderStyle, padding:'4px', width:'50px', textAlign:'center'}}>Qtd</th>
                        <th style={{border: borderStyle, padding:'4px', width:'90px', textAlign:'right'}}>Vl. Unit</th>
                        <th style={{border: borderStyle, padding:'4px', width:'90px', textAlign:'right'}}>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length === 0 && <tr><td colSpan="4" style={{border: borderStyle, padding:'10px', textAlign:'center', color:'#999'}}>Nenhum item lançado.</td></tr>}
                    {items.map((item, i) => (
                        <tr key={i}>
                            <td style={{border: borderStyle, padding:'4px'}}>{item.description}</td>
                            <td style={{border: borderStyle, padding:'4px', textAlign:'center'}}>{parseFloat(item.quantity)}</td>
                            <td style={{border: borderStyle, padding:'4px', textAlign:'right'}}>R$ {Number(item.unit_price).toFixed(2)}</td>
                            <td style={{border: borderStyle, padding:'4px', textAlign:'right', fontWeight:'bold'}}>R$ {Number(item.subtotal).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* TOTAIS */}
            <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'10px'}}>
                <div style={{width:'200px', border: borderStyle, padding:'8px', borderRadius:'4px', background:'#f9f9f9'}}>
                    {Number(os.discount) > 0 && (
                        <div style={{display:'flex', justifyContent:'space-between', color:'#d32f2f', fontSize:'10px', marginBottom:'2px'}}>
                            <span>Desconto:</span> <span>- R$ {Number(os.discount).toFixed(2)}</span>
                        </div>
                    )}
                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'14px', borderTop:'1px solid #ccc', paddingTop:'4px'}}>
                        <span>TOTAL:</span> <span>R$ {Number(os.total_amount).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* OBSERVAÇÕES E RODAPÉ */}
            <div style={{display:'grid', gridTemplateColumns: isA5 ? '1fr 1fr' : '1fr', gap:'10px', marginBottom:'15px'}}>
                {company?.os_observation_message && (
                    <div style={{border: borderStyle, borderRadius:'4px', padding:'6px', fontSize:'9px'}}>
                        <strong style={{textTransform:'uppercase'}}>Observações:</strong>
                        <p style={{margin:0, whiteSpace:'pre-wrap'}}>{company.os_observation_message}</p>
                    </div>
                )}
                {company?.os_warranty_terms && (
                    <div style={{border: borderStyle, borderRadius:'4px', padding:'6px', fontSize:'9px'}}>
                        <strong style={{textTransform:'uppercase'}}>Garantia:</strong>
                        <p style={{margin:0, whiteSpace:'pre-wrap'}}>{company.os_warranty_terms}</p>
                    </div>
                )}
            </div>

            {/* ASSINATURAS */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'40px', marginTop:'auto', paddingTop:'10px'}}>
                <div style={{textAlign:'center'}}>
                    <div style={{borderTop:'1px solid #000', width:'80%', margin:'0 auto', paddingTop:'4px', fontSize:'10px'}}>Técnico Responsável</div>
                </div>
                <div style={{textAlign:'center'}}>
                    <div style={{borderTop:'1px solid #000', width:'80%', margin:'0 auto', paddingTop:'4px', fontSize:'10px'}}>Cliente: {os.client_name}</div>
                </div>
            </div>

            <div style={{textAlign:'center', fontSize:'8px', color:'#666', marginTop:'15px', borderTop:'1px solid #eee', paddingTop:'5px'}}>
                {company?.footer_message || 'Obrigado pela preferência!'}<br/>
                Gerado em {new Date().toLocaleString()}
            </div>

            {/* CSS DE PÁGINA ESPECÍFICO PARA IMPRESSÃO */}
            <style>{`
                @media print {
                    @page { 
                        size: ${isA5 ? 'A5 landscape' : 'A4 portrait'}; 
                        margin: 5mm; 
                    }
                    body { -webkit-print-color-adjust: exact; }
                }
            `}</style>
        </div>
    );
}