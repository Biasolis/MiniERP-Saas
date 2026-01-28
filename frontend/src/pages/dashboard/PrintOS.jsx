import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

export default function PrintOS() {
    const { id } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/service-orders/${id}`).then(res => {
            setData(res.data);
            setTimeout(() => window.print(), 500); // Auto-imprimir
        });
    }, [id]);

    if (!data) return <div style={{padding:'20px'}}>Carregando impressão...</div>;

    const { os, items, company } = data;

    // Estilos Inline para simular cupom fiscal
    const styles = {
        container: {
            fontFamily: '"Courier New", Courier, monospace',
            width: '80mm',
            margin: '0 auto',
            padding: '5px',
            fontSize: '12px',
            color: 'black',
            textTransform: 'uppercase'
        },
        header: {
            textAlign: 'center',
            borderBottom: '1px dashed black',
            paddingBottom: '5px',
            marginBottom: '5px'
        },
        bold: { fontWeight: 'bold' },
        row: { display: 'flex', justifyContent: 'space-between' },
        divider: { borderBottom: '1px dashed black', margin: '5px 0' },
        tableHeader: { borderBottom: '1px solid black', paddingBottom: '2px', marginBottom: '2px', display:'flex', fontWeight:'bold' },
        itemRow: { display:'flex', justifyContent:'space-between' },
        footer: { textAlign: 'center', marginTop: '10px', fontSize: '10px' },
        signature: { marginTop: '30px', borderTop: '1px solid black', paddingTop: '5px', textAlign: 'center' }
    };

    return (
        <div style={styles.container}>
            {/* CABEÇALHO EMPRESA */}
            <div style={styles.header}>
                <div style={{fontSize:'14px', fontWeight:'bold'}}>{company?.name || 'MINI ERP FINANCE'}</div>
                <div>{company?.address || 'ENDEREÇO NÃO CONFIGURADO'}</div>
                <div>FONE: {company?.phone || '-'}</div>
                {company?.document && <div>CNPJ: {company?.document}</div>}
            </div>

            {/* DADOS DA OS */}
            <div style={styles.row}>
                <span>OS NÚMERO:</span>
                <span style={styles.bold}>{String(os.id).padStart(8, '0')}</span>
            </div>
            <div style={styles.row}>
                <span>EMISSÃO:</span>
                <span>{new Date(os.created_at).toLocaleDateString('pt-BR')} {new Date(os.created_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
            </div>

            <div style={styles.divider}></div>

            {/* DADOS DO CLIENTE */}
            <div>CLIENTE: {os.client_name}</div>
            {os.client_document && <div>CPF/CNPJ: {os.client_document}</div>}
            {os.address && <div>END: {os.address}</div>}
            {os.city && <div>CIDADE: {os.city}/{os.state || ''}</div>}
            <div>FONE: {os.client_phone || '-'}</div>

            {/* DADOS DO VEÍCULO (DA IMAGEM) */}
            <div style={styles.divider}></div>
            <div style={{fontWeight:'bold'}}>VEÍCULO/OBJETO: {os.equipment}</div>
            <div style={styles.row}>
                <span>PLACA: {os.identifier || '-----'}</span>
                <span>KM: {os.mileage || '-----'}</span>
            </div>
            {os.brand && <div>MODELO: {os.brand}</div>}

            {/* ITENS */}
            <div style={styles.divider}></div>
            <div style={styles.tableHeader}>
                <span style={{flex:1}}>PRODUTO</span>
                <span style={{width:'30px', textAlign:'right'}}>QTD</span>
                <span style={{width:'50px', textAlign:'right'}}>VL UN</span>
                <span style={{width:'50px', textAlign:'right'}}>TOTAL</span>
            </div>

            {items.map(item => (
                <div key={item.id} style={{marginBottom:'2px'}}>
                    <div>{item.description}</div>
                    <div style={{display:'flex', justifyContent:'flex-end'}}>
                        <span style={{width:'30px', textAlign:'right'}}>{item.quantity}</span>
                        <span style={{width:'50px', textAlign:'right'}}>{Number(item.unit_price).toFixed(2)}</span>
                        <span style={{width:'50px', textAlign:'right'}}>{Number(item.subtotal).toFixed(2)}</span>
                    </div>
                </div>
            ))}

            <div style={styles.divider}></div>

            {/* TOTAIS */}
            <div style={styles.row}>
                <span>SUBTOTAL:</span>
                <span>{Number(os.total_amount).toFixed(2)}</span>
            </div>
            <div style={styles.row}>
                <span>DESCONTO:</span>
                <span>{Number(os.discount || 0).toFixed(2)}</span>
            </div>
            <div style={{...styles.row, fontSize:'14px', fontWeight:'bold', marginTop:'5px'}}>
                <span>TOTAL A PAGAR:</span>
                <span>{Number(os.total_amount - (os.discount || 0)).toFixed(2)}</span>
            </div>

            <div style={{marginTop:'5px'}}>
                VENDEDOR: {os.technician_id ? 'TÉCNICO' : 'BALCÃO'}
            </div>

            {/* RODAPÉ E ASSINATURAS */}
            <div style={styles.footer}>
                {company?.footer_message || 'Declaro que recebi os serviços acima descritos.'}
            </div>

            <div style={styles.signature}>
                {os.client_name}
            </div>
            
            {/* HACK para esconder o resto do site na impressão */}
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body * { visibility: hidden; }
                    #root { display: none; }
                    .print-container, .print-container * { visibility: visible; display: block; }
                    .print-container { position: absolute; left: 0; top: 0; }
                }
            `}</style>
        </div>
    );
}