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
    const [formData, setFormData] = useState({ name: '', email: '', phone: '', cpf: '', admission_date: '', position: '', salary: '', department_id: '' });

    useEffect(() => {
        api.get('/hr/employees').then(res => setEmployees(res.data)).catch(()=>{}).finally(() => setLoading(false));
    }, []);

    async function handleSubmit(e) {
        e.preventDefault();
        try {
            await api.post('/hr/employees', formData);
            addToast({ type: 'success', title: 'Salvo!' });
            setIsModalOpen(false);
            const res = await api.get('/hr/employees');
            setEmployees(res.data);
        } catch (error) { addToast({ type: 'error', title: 'Erro' }); }
    }

    async function handleDelete(id) {
        if(!confirm('Excluir?')) return;
        try { await api.delete(`/hr/employees/${id}`); setEmployees(employees.filter(e=>e.id!==id)); } catch(e){}
    }

    const fmtMoney = (v) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <DashboardLayout>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}><Users size={28} /> RH</h2>
                    <button onClick={() => setIsModalOpen(true)} style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display:'flex', gap:5 }}><Plus size={18}/> Novo</button>
                </div>
                {loading ? <p>Carregando...</p> : (
                    <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Nome</th>
                                    <th style={{ padding: '15px', textAlign: 'left' }}>Cargo</th>
                                    <th style={{ padding: '15px', textAlign: 'right' }}>Salário</th>
                                    <th style={{ padding: '15px', textAlign: 'center' }}>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map(emp => (
                                    <tr key={emp.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '15px' }}>{emp.name}</td>
                                        <td style={{ padding: '15px' }}>{emp.position}</td>
                                        <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{fmtMoney(emp.salary)}</td>
                                        <td style={{ padding: '15px', textAlign: 'center' }}><button onClick={() => handleDelete(emp.id)} style={{ border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={18} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Funcionário">
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px' }}>
                        <input required placeholder="Nome" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                        <input required placeholder="Cargo" value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                        <input required type="number" placeholder="Salário" value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }} />
                        <button type="submit" style={{ padding: '12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>Salvar</button>
                    </form>
                </Modal>
            </div>
        </DashboardLayout>
    );
}