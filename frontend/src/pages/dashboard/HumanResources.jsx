import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import { Users, Plus, Trash2 } from 'lucide-react';

export default function HumanResources() {
    const { addToast } = useContext(ToastContext);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form States
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', cpf: '', admission_date: '', 
        position: '', salary: '', department_id: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const res = await api.get('/hr/employees');
            setEmployees(res.data);
        } catch (e) {
            // console.error(e); 
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await api.post('/hr/employees', formData);
            addToast({ type: 'success', title: 'Funcionário cadastrado!' });
            setIsModalOpen(false);
            setFormData({ name: '', email: '', phone: '', cpf: '', admission_date: '', position: '', salary: '', department_id: '' });
            loadData();
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao salvar' });
        }
    }

    async function handleDelete(id) {
        if(!confirm('Excluir funcionário?')) return;
        try {
            await api.delete(`/hr/employees/${id}`);
            loadData();
            addToast({ type: 'success', title: 'Removido' });
        } catch(e) {
            addToast({ type: 'error', title: 'Erro ao remover' });
        }
    }

    const fmtMoney = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                        <Users size={28} /> Recursos Humanos
                    </h2>
                    <button onClick={() => setIsModalOpen(true)} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <Plus size={18} /> Novo Funcionário
                    </button>
                </div>

                {loading ? <p>Carregando...</p> : (
                    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Nome</th>
                                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Cargo</th>
                                    <th style={{ padding: '15px', textAlign: 'left', borderBottom: '1px solid #eee' }}>Contato</th>
                                    <th style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #eee' }}>Salário</th>
                                    <th style={{ padding: '15px', textAlign: 'center', borderBottom: '1px solid #eee' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '15px', fontWeight: '500' }}>{emp.name}</td>
                                        <td style={{ padding: '15px' }}>{emp.position}</td>
                                        <td style={{ padding: '15px', fontSize: '0.9rem' }}>{emp.email}<br/>{emp.phone}</td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                                            {fmtMoney(emp.salary)}
                                        </td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}>
                                            <button onClick={() => handleDelete(emp.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}>
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {employees.length === 0 && <tr><td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>Nenhum funcionário cadastrado.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}

                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Funcionário">
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'block', marginBottom: 5 }}>Nome Completo</label>
                            <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 5 }}>Email</label>
                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 5 }}>Cargo</label>
                            <input required value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: 5 }}>Salário (R$)</label>
                            <input type="number" step="0.01" required value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                        </div>
                        
                        <div style={{ gridColumn: 'span 2' }}>
                            <button type="submit" style={{ width: '100%', padding: '12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}>Salvar</button>
                        </div>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}