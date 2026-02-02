import { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api';
import { DollarSign, FileText, Plus, Calendar } from 'lucide-react';

export default function Payroll() {
  const { addToast } = useContext(ToastContext);
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showModal, setShowModal] = useState(false);
  
  const [formData, setFormData] = useState({
    employee_id: '',
    reference_date: '',
    additions: 0,
    deductions: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [payRes, empRes] = await Promise.all([
        api.get('/payroll/payrolls'),
        api.get('/hr/employees') // Reutilizando rota do RH
      ]);
      setPayrolls(payRes.data);
      setEmployees(empRes.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
        await api.post('/payroll/payrolls', formData);
        addToast({ type: 'success', title: 'Sucesso', message: 'Folha gerada' });
        setShowModal(false);
        loadData();
    } catch (error) {
        addToast({ type: 'error', title: 'Erro', message: 'Erro ao gerar folha' });
    }
  };

  return (
    <DashboardLayout>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'2rem'}}>
        <h1>Folha de Pagamento</h1>
        <button onClick={() => setShowModal(true)} style={btnPrimary}>
            <Plus size={18}/> Gerar Folha
        </button>
      </div>

      <div style={card}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
            <thead>
                <tr style={{textAlign:'left', borderBottom:'1px solid #eee', color:'#666'}}>
                    <th style={{padding:'10px'}}>Referência</th>
                    <th style={{padding:'10px'}}>Colaborador</th>
                    <th style={{padding:'10px'}}>Salário Base</th>
                    <th style={{padding:'10px'}}>Líquido</th>
                    <th style={{padding:'10px'}}>Status</th>
                </tr>
            </thead>
            <tbody>
                {payrolls.map(p => (
                    <tr key={p.id} style={{borderBottom:'1px solid #f9fafb'}}>
                        <td style={{padding:'10px'}}>{new Date(p.reference_date).toLocaleDateString('pt-BR', {month:'long', year:'numeric'})}</td>
                        <td style={{padding:'10px'}}>{p.employee_name}</td>
                        <td style={{padding:'10px'}}>R$ {p.base_salary}</td>
                        <td style={{padding:'10px', color:'#059669', fontWeight:'bold'}}>R$ {p.net_salary}</td>
                        <td style={{padding:'10px'}}><span style={badge}>{p.status}</span></td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {showModal && (
        <div style={modalOverlay}>
            <div style={modalContent}>
                <h2>Gerar Nova Folha</h2>
                <form onSubmit={handleGenerate} style={{display:'flex', flexDirection:'column', gap:'15px'}}>
                    <select required onChange={e => setFormData({...formData, employee_id: e.target.value})} style={input}>
                        <option value="">Selecione Colaborador...</option>
                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <input type="date" required onChange={e => setFormData({...formData, reference_date: e.target.value})} style={input} />
                    <div style={{display:'flex', gap:'10px'}}>
                        <div style={{flex:1}}>
                            <label>Adicionais (R$)</label>
                            <input type="number" onChange={e => setFormData({...formData, additions: e.target.value})} style={input} />
                        </div>
                        <div style={{flex:1}}>
                            <label>Descontos (R$)</label>
                            <input type="number" onChange={e => setFormData({...formData, deductions: e.target.value})} style={input} />
                        </div>
                    </div>
                    <button type="submit" style={btnPrimary}>Processar</button>
                    <button type="button" onClick={() => setShowModal(false)} style={btnSec}>Cancelar</button>
                </form>
            </div>
        </div>
      )}
    </DashboardLayout>
  );
}

const btnPrimary = { background:'var(--primary-color)', color:'white', padding:'10px 20px', border:'none', borderRadius:'8px', cursor:'pointer', display:'flex', gap:'5px', alignItems:'center' };
const btnSec = { background:'white', border:'1px solid #ccc', padding:'10px', borderRadius:'8px', cursor:'pointer', marginTop:'10px' };
const card = { background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 2px 5px rgba(0,0,0,0.05)' };
const badge = { background:'#e0e7ff', color:'#3730a3', padding:'4px 8px', borderRadius:'10px', fontSize:'0.8rem' };
const modalOverlay = { position:'fixed', top:0, left:0, width:'100%', height:'100%', background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center', zIndex:1000 };
const modalContent = { background:'white', padding:'2rem', borderRadius:'12px', width:'400px' };
const input = { width:'100%', padding:'10px', borderRadius:'8px', border:'1px solid #ccc' };