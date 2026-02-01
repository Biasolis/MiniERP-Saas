import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

export default function PrintOS() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || 'thermal'; // 'thermal' (padrão) ou 'a4'

    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/service-orders/${id}`).then(res => {
            setData(res.data);
            // Pequeno delay para garantir renderização antes de abrir janela de print
            setTimeout(() => window.print(), 800); 
        });
    }, [id]);

    if (!data) return <div style={{padding:'20px', fontFamily:'sans-serif'}}>Carregando dados da impressão...</div>;

    // Seleciona o Layout
    return mode === 'a4' ? <LayoutA4 data={data} /> : <LayoutThermal data={data} />;
}

// ==========================================
// LAYOUT 1: TÉRMICO (CUPOM 80mm) - MANTIDO
// ==========================================
function LayoutThermal({ data }) {
    const { os, items, company, custom_fields } = data;
    
    const styles = {
        container: { fontFamily: '"Courier New", Courier, monospace', width: '80mm', margin: '0 auto', fontSize: '12px', textTransform: 'uppercase', color: '#000' },
        header: { textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' },
        row: { display: 'flex', justifyContent: 'space-between' },
        divider: { borderBottom: '1px dashed #000', margin: '5px 0' },
        bold: { fontWeight: 'bold' },
        center: { textAlign: 'center' },
        sectionTitle: { fontWeight: 'bold', marginTop: '5px', textDecoration: 'underline' }
    };

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={{fontSize:'14px', fontWeight:'bold'}}>{company?.name || 'MINI ERP'}</div>
                <div>{company?.address}</div>
                <div>{company?.phone}</div>
                {company?.document && <div>CNPJ: {company?.document}</div>}
            </div>

            <div style={styles.row}><span>OS NUM:</span><span style={styles.bold}>{String(os.id).padStart(6,'0')}</span></div>
            <div style={styles.row}><span>EMISSÃO:</span><span>{new Date(os.created_at).toLocaleDateString('pt-BR')}</span></div>
            
            <div style={styles.divider}></div>
            <div>CLIENTE: {os.client_name}</div>
            {os.client_phone && <div>TEL: {os.client_phone}</div>}
            
            <div style={styles.divider}></div>
            <div style={styles.bold}>EQUIPAMENTO:</div>
            <div>{os.equipment}</div>
            
            {/* Campos Dinâmicos */}
            <div style={{display:'flex', flexWrap:'wrap', gap:'5px', marginTop:'5px'}}>
                {custom_fields && custom_fields.map((f, i) => (
                    <div key={i} style={{marginRight:'5px'}}><span style={styles.bold}>{f.label}:</span> {f.value}</div>
                ))}
            </div>

            <div style={styles.divider}></div>
            
            {items.map(item => (
                <div key={item.id} style={{marginBottom:'3px'}}>
                    <div>{item.description}</div>
                    <div style={{display:'flex', justifyContent:'flex-end', gap:'10px'}}>
                        <span>{item.quantity} x {Number(item.unit_price).toFixed(2)}</span>
                        <span style={styles.bold}>{Number(item.subtotal).toFixed(2)}</span>
                    </div>
                </div>
            ))}
            
            <div style={styles.divider}></div>
            <div style={{...styles.row, fontSize:'14px', ...styles.bold}}>
                <span>TOTAL:</span><span>R$ {Number(os.total_amount).toFixed(2)}</span>
            </div>

            {/* NOVOS CAMPOS: OBSERVAÇÃO E GARANTIA */}
            {(company?.os_observation_message) && (
                <div style={{marginTop:'10px'}}>
                    <div style={styles.sectionTitle}>OBSERVAÇÕES:</div>
                    <div style={{fontSize:'10px', whiteSpace:'pre-wrap'}}>{company.os_observation_message}</div>
                </div>
            )}

            {(company?.os_warranty_terms) && (
                <div style={{marginTop:'5px'}}>
                    <div style={styles.sectionTitle}>GARANTIA:</div>
                    <div style={{fontSize:'10px', whiteSpace:'pre-wrap'}}>{company.os_warranty_terms}</div>
                </div>
            )}

            <div style={{marginTop:'15px', ...styles.center, fontSize:'10px'}}>
                {company?.footer_message || 'Obrigado pela preferência!'}
            </div>
            
            <style>{`@media print { @page { margin: 0; } body { margin: 5px; } }`}</style>
        </div>
    );
}

// ==========================================
// LAYOUT 2: A4 / A5 (COMPACTADO)
// ==========================================
function LayoutA4({ data }) {
    const { os, items, company, custom_fields } = data;

    // CSS Inline Ajustado para Caber em 1 Página
    const styles = {
        page: { fontFamily: 'Helvetica, Arial, sans-serif', width: '100%', maxWidth: '210mm', margin: '0 auto', color: '#111', lineHeight: '1.3' },
        
        // Header Compacto
        header: { display: 'flex', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '2px solid #333' },
        companyInfo: { flex: 1 },
        osInfo: { textAlign: 'right' },
        h1: { margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#000' }, // Reduzido de 24
        
        // Seções Compactas
        section: { marginBottom: '10px' }, // Reduzido de 15
        h2: { margin: '0 0 4px 0', fontSize: '13px', fontWeight: 'bold', backgroundColor: '#f0f0f0', padding: '4px 8px', borderLeft:'4px solid #333' }, // Reduzido
        
        grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }, // Gap reduzido
        
        // Textos menores
        label: { fontWeight: 'bold', fontSize: '10px', color: '#555', textTransform: 'uppercase' },
        value: { fontSize: '12px', borderBottom: '1px solid #eee', paddingBottom: '1px', display:'block', minHeight:'16px' },
        
        // Tabela Compacta
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '5px' },
        th: { textAlign: 'left', borderBottom: '2px solid #000', padding: '4px', fontSize: '10px', textTransform: 'uppercase' },
        td: { borderBottom: '1px solid #ddd', padding: '4px', fontSize: '11px' },
        
        totalRow: { display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '2px solid #000', paddingTop: '8px' },
        
        // Rodapé Compacto
        footer: { marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', textAlign: 'center' }, // Margem reduzida
        signatureLine: { borderTop: '1px solid #000', marginTop: '20px', paddingTop: '4px', fontSize: '10px' },
        legal: { marginTop: '10px', fontSize: '9px', color: '#666', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '4px' },
        
        textBox: { 
            border: '1px solid #ddd', 
            borderRadius: '4px',
            padding: '6px', 
            fontSize: '10px', 
            backgroundColor: '#fcfcfc',
            marginTop: '2px',
            whiteSpace: 'pre-wrap'
        }
    };

    return (
        <div style={styles.page}>
            {/* CABEÇALHO */}
            <div style={styles.header}>
                <div style={styles.companyInfo}>
                    <div style={styles.h1}>{company?.name || 'Nome da Empresa'}</div>
                    <div style={{fontSize:'11px', marginTop:'4px'}}>
                        {company?.address}<br/>
                        {company?.phone} | {company?.email_contact} {company?.document ? `| CNPJ: ${company.document}` : ''}
                    </div>
                </div>
                <div style={styles.osInfo}>
                    <div style={{fontSize:'24px', fontWeight:'bold', color:'#333'}}>OS #{String(os.id).padStart(6,'0')}</div>
                    <div style={{fontSize:'11px'}}>Data: {new Date(os.created_at).toLocaleDateString('pt-BR')}</div>
                    <div style={{fontSize:'11px'}}>Hora: {new Date(os.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</div>
                    <div style={{marginTop:'4px', padding:'2px 6px', background:'#eee', borderRadius:'4px', display:'inline-block', fontWeight:'bold', fontSize:'10px', textTransform:'uppercase'}}>
                        Status: {os.status === 'open' ? 'Aberta' : os.status === 'completed' ? 'Finalizada' : os.status}
                    </div>
                </div>
            </div>

            {/* DADOS DO CLIENTE */}
            <div style={styles.section}>
                <div style={styles.h2}>Dados do Cliente</div>
                <div style={styles.grid}>
                    <div>
                        <span style={styles.label}>Nome:</span>
                        <span style={styles.value}>{os.client_name}</span>
                    </div>
                    <div>
                        <span style={styles.label}>Telefone / Celular:</span>
                        <span style={styles.value}>{os.client_phone || os.phone || '-'}</span>
                    </div>
                    <div>
                        <span style={styles.label}>Email:</span>
                        <span style={styles.value}>{os.client_email || '-'}</span>
                    </div>
                    <div>
                        <span style={styles.label}>Documento:</span>
                        <span style={styles.value}>{os.client_document || '-'}</span>
                    </div>
                    <div style={{gridColumn: 'span 2'}}>
                        <span style={styles.label}>Endereço:</span>
                        <span style={styles.value}>
                            {os.address ? `${os.address}, ${os.city || ''} - ${os.state || ''}` : '-'}
                        </span>
                    </div>
                </div>
            </div>

            {/* DADOS DO EQUIPAMENTO / SERVIÇO */}
            <div style={styles.section}>
                <div style={styles.h2}>Detalhes do Equipamento / Serviço</div>
                <div style={styles.grid}>
                    <div style={{gridColumn: 'span 2'}}>
                        <span style={styles.label}>Equipamento / Veículo:</span>
                        <span style={styles.value}>{os.equipment}</span>
                    </div>
                    
                    {custom_fields && custom_fields.map(f => (
                        <div key={f.id}>
                            <span style={styles.label}>{f.label}:</span>
                            <span style={styles.value}>{f.value || '-'}</span>
                        </div>
                    ))}

                    <div style={{gridColumn: 'span 2', marginTop:'4px'}}>
                        <span style={styles.label}>Relato do Problema / Solicitação:</span>
                        <div style={{...styles.value, minHeight:'30px', height:'auto', border:'1px solid #eee', padding:'4px', background:'#fbfbfb'}}>
                            {os.description}
                        </div>
                    </div>
                </div>
            </div>

            {/* ITENS E SERVIÇOS */}
            <div style={styles.section}>
                <div style={styles.h2}>Produtos e Serviços</div>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.th}>Descrição</th>
                            <th style={{...styles.th, width:'50px', textAlign:'center'}}>Qtd</th>
                            <th style={{...styles.th, width:'90px', textAlign:'right'}}>Valor Un.</th>
                            <th style={{...styles.th, width:'90px', textAlign:'right'}}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                                <td style={styles.td}>{item.description}
                                    {item.type === 'service' && <span style={{fontSize:'9px', background:'#eee', padding:'1px 4px', borderRadius:'3px', marginLeft:'6px'}}>Serviço</span>}
                                </td>
                                <td style={{...styles.td, textAlign:'center'}}>{item.quantity}</td>
                                <td style={{...styles.td, textAlign:'right'}}>R$ {Number(item.unit_price).toFixed(2)}</td>
                                <td style={{...styles.td, textAlign:'right', fontWeight:'bold'}}>R$ {Number(item.subtotal).toFixed(2)}</td>
                            </tr>
                        ))}
                        {items.length === 0 && <tr><td colSpan="4" style={{...styles.td, textAlign:'center', color:'#999'}}>Nenhum item lançado.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* TOTAIS */}
            <div style={styles.totalRow}>
                <div style={{textAlign:'right'}}>
                    <div style={{fontSize:'12px', color:'#666'}}>Total Bruto: R$ {Number(os.total_amount).toFixed(2)}</div>
                    <div style={{fontSize:'18px', fontWeight:'bold', color:'#000', marginTop:'2px'}}>
                        TOTAL A PAGAR: R$ {Number(os.total_amount).toFixed(2)}
                    </div>
                </div>
            </div>

            {/* NOVAS SEÇÕES: OBSERVAÇÕES E GARANTIA */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', marginTop:'10px'}}>
                {company?.os_observation_message && (
                    <div>
                        <div style={styles.label}>Observações:</div>
                        <div style={styles.textBox}>
                            {company.os_observation_message}
                        </div>
                    </div>
                )}
                
                {company?.os_warranty_terms && (
                    <div>
                        <div style={styles.label}>Termos de Garantia:</div>
                        <div style={styles.textBox}>
                            {company.os_warranty_terms}
                        </div>
                    </div>
                )}
            </div>

            {/* ASSINATURAS */}
            <div style={styles.footer}>
                <div>
                    <div style={styles.signatureLine}>Assinatura do Técnico / Responsável</div>
                </div>
                <div>
                    <div style={styles.signatureLine}>Assinatura do Cliente ({os.client_name})</div>
                </div>
            </div>

            {/* RODAPÉ LEGAL */}
            <div style={styles.legal}>
                {company?.footer_message || 'Garantia de 90 dias para serviços prestados. Agradecemos a preferência!'}
                <br/>Gerado por Mini ERP Finance
            </div>

            <style>{`
                @media print { 
                    @page { size: A4; margin: 5mm; } 
                    body { -webkit-print-color-adjust: exact; margin: 0; } 
                }
            `}</style>
        </div>
    );
}