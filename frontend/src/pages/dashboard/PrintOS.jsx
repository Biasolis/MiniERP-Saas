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
// LAYOUT 1: TÉRMICO (CUPOM 80mm)
// ==========================================
function LayoutThermal({ data }) {
    const { os, items, company, custom_fields } = data;
    
    const styles = {
        container: { fontFamily: '"Courier New", Courier, monospace', width: '80mm', margin: '0 auto', fontSize: '12px', textTransform: 'uppercase', color: '#000' },
        header: { textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: '5px', marginBottom: '5px' },
        row: { display: 'flex', justifyContent: 'space-between' },
        divider: { borderBottom: '1px dashed #000', margin: '5px 0' },
        bold: { fontWeight: 'bold' },
        center: { textAlign: 'center' }
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

            <div style={{marginTop:'15px', ...styles.center, fontSize:'10px'}}>
                {company?.footer_message || 'Obrigado pela preferência!'}
            </div>
            
            <style>{`@media print { @page { margin: 0; } body { margin: 5px; } }`}</style>
        </div>
    );
}

// ==========================================
// LAYOUT 2: A4 / A5 (OFICIAL)
// ==========================================
function LayoutA4({ data }) {
    const { os, items, company, custom_fields } = data;

    // CSS Inline para garantir impressão perfeita sem depender de arquivos externos
    const styles = {
        page: { fontFamily: 'Helvetica, Arial, sans-serif', width: '100%', maxWidth: '210mm', margin: '0 auto', color: '#111', lineHeight: '1.4' },
        header: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #333' },
        companyInfo: { flex: 1 },
        osInfo: { textAlign: 'right' },
        h1: { margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#000' },
        h2: { margin: '0 0 5px 0', fontSize: '16px', fontWeight: 'bold', backgroundColor: '#eee', padding: '5px' },
        section: { marginBottom: '15px' },
        grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
        label: { fontWeight: 'bold', fontSize: '12px', color: '#555', textTransform: 'uppercase' },
        value: { fontSize: '14px', borderBottom: '1px solid #ddd', paddingBottom: '2px', display:'block', minHeight:'18px' },
        table: { width: '100%', borderCollapse: 'collapse', marginTop: '10px' },
        th: { textAlign: 'left', borderBottom: '2px solid #000', padding: '8px', fontSize: '12px', textTransform: 'uppercase' },
        td: { borderBottom: '1px solid #ddd', padding: '8px', fontSize: '13px' },
        totalRow: { display: 'flex', justifyContent: 'flex-end', marginTop: '15px', borderTop: '2px solid #000', paddingTop: '10px' },
        footer: { marginTop: '50px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', textAlign: 'center' },
        signatureLine: { borderTop: '1px solid #000', marginTop: '40px', paddingTop: '5px', fontSize: '12px' },
        legal: { marginTop: '20px', fontSize: '10px', color: '#666', textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '5px' }
    };

    return (
        <div style={styles.page}>
            {/* CABEÇALHO */}
            <div style={styles.header}>
                <div style={styles.companyInfo}>
                    <div style={styles.h1}>{company?.name || 'Nome da Empresa'}</div>
                    <div style={{fontSize:'12px', marginTop:'5px'}}>
                        {company?.address}<br/>
                        {company?.phone} | {company?.email_contact}<br/>
                        {company?.document && <span>CNPJ: {company?.document}</span>}
                    </div>
                </div>
                <div style={styles.osInfo}>
                    <div style={{fontSize:'32px', fontWeight:'bold', color:'#333'}}>OS #{String(os.id).padStart(6,'0')}</div>
                    <div style={{fontSize:'12px'}}>Data: {new Date(os.created_at).toLocaleDateString('pt-BR')}</div>
                    <div style={{fontSize:'12px'}}>Hora: {new Date(os.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</div>
                    <div style={{marginTop:'5px', padding:'4px 8px', background:'#eee', borderRadius:'4px', display:'inline-block', fontWeight:'bold', fontSize:'12px', textTransform:'uppercase'}}>
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
                        <span style={styles.label}>Documento (CPF/CNPJ):</span>
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
                    
                    {/* Campos Personalizados */}
                    {custom_fields && custom_fields.map(f => (
                        <div key={f.id}>
                            <span style={styles.label}>{f.label}:</span>
                            <span style={styles.value}>{f.value || '-'}</span>
                        </div>
                    ))}

                    <div style={{gridColumn: 'span 2', marginTop:'5px'}}>
                        <span style={styles.label}>Relato do Problema / Solicitação:</span>
                        <div style={{...styles.value, minHeight:'40px', height:'auto', border:'1px solid #eee', padding:'5px', background:'#fbfbfb'}}>
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
                            <th style={{...styles.th, width:'60px', textAlign:'center'}}>Qtd</th>
                            <th style={{...styles.th, width:'100px', textAlign:'right'}}>Valor Un.</th>
                            <th style={{...styles.th, width:'100px', textAlign:'right'}}>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => (
                            <tr key={item.id} style={{backgroundColor: idx % 2 === 0 ? '#fff' : '#f9f9f9'}}>
                                <td style={styles.td}>{item.description}</td>
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
                    <div style={{fontSize:'14px', color:'#666'}}>Total Bruto: R$ {Number(os.total_amount).toFixed(2)}</div>
                    {/* Se tiver desconto futuro, entra aqui */}
                    <div style={{fontSize:'24px', fontWeight:'bold', color:'#000', marginTop:'5px'}}>
                        TOTAL A PAGAR: R$ {Number(os.total_amount).toFixed(2)}
                    </div>
                </div>
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
                    @page { size: A4; margin: 10mm; } 
                    body { -webkit-print-color-adjust: exact; } 
                }
            `}</style>
        </div>
    );
}