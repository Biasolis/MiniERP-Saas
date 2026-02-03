import { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api';
import { 
  Users, Briefcase, Building, Plus, Trash2, Edit2, 
  FileText, UserMinus, Search, ExternalLink, ClipboardList, Lock, MinusCircle, 
  Calendar, Clock, Save, X 
} from 'lucide-react';

export default function HumanResources() {
  const [activeTab, setActiveTab] = useState('employees'); 
  const { addToast } = useContext(ToastContext);
  const [loading, setLoading] = useState(true);

  // Data States Gerais
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [terminations, setTerminations] = useState([]);
  const [forms, setForms] = useState([]);

  // Data States Ponto (Timesheet)
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [timesheet, setTimesheet] = useState([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Form States
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState(''); 

  // Form Data (Diversos)
  const [empData, setEmpData] = useState({ 
      name: '', email: '', phone: '', cpf: '', salary: '', 
      status: 'active', department_id: '', position_id: '', 
      password: '', work_hours_daily: 8 // Adicionado carga horária
  });
  const [deptData, setDeptData] = useState({ name: '', manager_name: '' });
  const [posData, setPosData] = useState({ title: '', base_salary: '', description: '' });
  const [openingData, setOpeningData] = useState({ title: '', description: '', department_id: '', position_id: '', status: 'open' });
  const [candData, setCandData] = useState({ job_opening_id: '', name: '', email: '', phone: '', resume_link: '', status: 'applied', notes: '' });
  const [termData, setTermData] = useState({ employee_id: '', termination_date: new Date().toISOString().split('T')[0], reason: '', type: 'voluntary' });
  const [formData, setFormData] = useState({ title: '', description: '', is_private: false, fields: [] });
  
  // Form Data (Ponto)
  const [pointData, setPointData] = useState({ date: '', time: '', type: 'entry' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Carrega ponto quando muda funcionário ou data (apenas na aba timesheet)
  useEffect(() => {
      if (activeTab === 'timesheet' && selectedEmployee) {
          fetchTimesheet();
      }
  }, [selectedEmployee, month, year, activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Sempre carrega funcionários para selects
      const empRes = await api.get('/hr/employees');
      setEmployees(empRes.data);

      if (activeTab === 'employees' || activeTab === 'departments' || activeTab === 'positions') {
          const [deptRes, posRes] = await Promise.all([
            api.get('/hr/departments'),
            api.get('/hr/positions')
          ]);
          setDepartments(deptRes.data);
          setPositions(posRes.data);
      }

      if (activeTab === 'recruitment') {
        const [jobsRes, candRes] = await Promise.all([
            api.get('/hr/recruitment/openings'),
            api.get('/hr/recruitment/candidates')
        ]);
        setJobOpenings(jobsRes.data);
        setCandidates(candRes.data);
      }

      if (activeTab === 'terminations') {
        const termRes = await api.get('/hr/terminations');
        setTerminations(termRes.data);
      }

      if (activeTab === 'forms') {
        const formsRes = await api.get('/hr/forms');
        setForms(formsRes.data);
      }

    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro', message: 'Falha ao carregar dados' });
    } finally {
      setLoading(false);
    }
  };

  const fetchTimesheet = async () => {
      try {
          const res = await api.get(`/hr/timesheet/${selectedEmployee}?month=${month}&year=${year}`);
          setTimesheet(res.data);
      } catch (e) {
          addToast({ type: 'error', title: 'Erro', message: 'Erro ao carregar ponto' });
      }
  };

  const handleDelete = async (id, type) => {
    if (!confirm('Tem certeza que deseja excluir?')) return;
    try {
      let endpoint = '';
      if (type === 'employee') endpoint = `/hr/employees/${id}`;
      if (type === 'department') endpoint = `/hr/departments/${id}`;
      if (type === 'position') endpoint = `/hr/positions/${id}`;
      if (type === 'opening') endpoint = `/hr/recruitment/openings/${id}`;
      if (type === 'candidate') endpoint = `/hr/recruitment/candidates/${id}`;
      if (type === 'form') endpoint = `/hr/forms/${id}`;
      if (type === 'timesheet') endpoint = `/hr/timesheet/${id}`;

      await api.delete(endpoint);
      addToast({ type: 'success', title: 'Sucesso', message: 'Item removido' });
      
      if (type === 'timesheet') fetchTimesheet();
      else fetchData();

    } catch (error) {
      addToast({ type: 'error', title: 'Erro', message: 'Erro ao remover' });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      let endpoint = '';
      let payload = {};

      if (modalType === 'employee') { endpoint = '/hr/employees'; payload = empData; }
      if (modalType === 'department') { endpoint = '/hr/departments'; payload = deptData; }
      if (modalType === 'position') { endpoint = '/hr/positions'; payload = posData; }
      if (modalType === 'opening') { endpoint = '/hr/recruitment/openings'; payload = openingData; }
      if (modalType === 'candidate') { endpoint = '/hr/recruitment/candidates'; payload = candData; }
      if (modalType === 'termination') { endpoint = '/hr/terminations'; payload = termData; }
      if (modalType === 'form') { endpoint = '/hr/forms'; payload = formData; }
      
      // Lógica específica para Ponto
      if (modalType === 'timesheet') {
          if (editingItem) {
              await api.put(`/hr/timesheet/${editingItem.id}`, { time: pointData.time, date: pointData.date });
          } else {
              await api.post('/hr/timesheet/manual', { 
                  employee_id: selectedEmployee, 
                  ...pointData, 
                  reason: 'Ajuste Manual RH' 
              });
          }
          addToast({ type: 'success', title: 'Sucesso', message: 'Ponto salvo' });
          setShowModal(false);
          setEditingItem(null);
          fetchTimesheet();
          return;
      }

      if (editingItem && modalType !== 'termination' && modalType !== 'form') { 
        await api.put(`${endpoint}/${editingItem.id}`, payload);
      } else {
        await api.post(endpoint, payload);
      }
      
      addToast({ type: 'success', title: 'Sucesso', message: 'Registro salvo com sucesso' });
      setShowModal(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      console.error(error);
      addToast({ type: 'error', title: 'Erro', message: 'Erro ao salvar' });
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setEditingItem(item);
    
    // Reset inputs
    setEmpData({ name: '', email: '', phone: '', cpf: '', salary: '', status: 'active', department_id: '', position_id: '', password: '', work_hours_daily: 8 });
    setDeptData({ name: '', manager_name: '' });
    setPosData({ title: '', base_salary: '', description: '' });
    setOpeningData({ title: '', description: '', department_id: '', position_id: '', status: 'open' });
    setCandData({ job_opening_id: '', name: '', email: '', phone: '', resume_link: '', status: 'applied', notes: '' });
    setTermData({ employee_id: '', termination_date: new Date().toISOString().split('T')[0], reason: '', type: 'voluntary' });
    setFormData({ title: '', description: '', is_private: false, fields: [] });
    
    // Reset Ponto
    if (type === 'timesheet') {
        if (item) {
            setPointData({ date: item.date_str, time: item.time_str, type: item.record_type });
        } else {
            const defaultDate = `${year}-${String(month).padStart(2,'0')}-01`;
            setPointData({ date: defaultDate, time: '08:00', type: 'entry' });
        }
    }

    if (item && type !== 'timesheet') {
      if (type === 'employee') setEmpData({ ...item, password: '' }); 
      if (type === 'department') setDeptData(item);
      if (type === 'position') setPosData(item);
      if (type === 'opening') setOpeningData(item);
      if (type === 'candidate') setCandData(item);
    }
    setShowModal(true);
  };

  // --- FORM BUILDER HELPERS ---
  const addField = () => {
    setFormData({
        ...formData,
        fields: [...formData.fields, { label: '', type: 'text', required: false }]
    });
  };

  const updateField = (index, key, value) => {
    const newFields = [...formData.fields];
    newFields[index][key] = value;
    setFormData({ ...formData, fields: newFields });
  };

  const removeField = (index) => {
    const newFields = formData.fields.filter((_, i) => i !== index);
    setFormData({ ...formData, fields: newFields });
  };

  // --- RENDERIZADORES ---

  const renderEmployees = () => (
    <div style={{overflowX: 'auto'}}>
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'10px'}}>
            <button onClick={() => openModal('employee')} className="btn-primary"><Plus size={18}/> Novo Colaborador</button>
        </div>
      <table style={{width: '100%', borderCollapse: 'collapse'}}>
        <thead>
          <tr style={{borderBottom: '2px solid #e5e7eb', textAlign: 'left', color: '#6b7280'}}>
            <th style={{padding: '12px'}}>Nome</th>
            <th style={{padding: '12px'}}>Cargo/Depto</th>
            <th style={{padding: '12px'}}>Status</th>
            <th style={{padding: '12px', textAlign: 'right'}}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {employees.map(emp => (
            <tr key={emp.id} style={{borderBottom: '1px solid #f3f4f6'}}>
              <td style={{padding: '12px'}}>
                <div style={{fontWeight:'600'}}>{emp.name}</div>
                <small style={{color:'#6b7280'}}>{emp.email}</small>
              </td>
              <td style={{padding: '12px'}}>
                <div>{emp.position_title || '-'}</div>
                <small>{emp.department_name}</small>
              </td>
              <td style={{padding: '12px'}}>
                <span style={{
                  padding: '4px 8px', borderRadius: '12px', fontSize: '0.75rem',
                  backgroundColor: emp.status === 'active' ? '#dcfce7' : '#fee2e2',
                  color: emp.status === 'active' ? '#166534' : '#991b1b'
                }}>
                  {emp.status === 'active' ? 'Ativo' : 'Inativo'}
                </span>
              </td>
              <td style={{padding: '12px', textAlign: 'right'}}>
                <button onClick={() => openModal('employee', emp)} style={iconBtn}><Edit2 size={18} color="#4f46e5"/></button>
                <button onClick={() => handleDelete(emp.id, 'employee')} style={iconBtn}><Trash2 size={18} color="#ef4444"/></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTimesheet = () => {
      // Agrupa registros por dia
      const grouped = timesheet.reduce((acc, rec) => {
          if (!acc[rec.date_str]) acc[rec.date_str] = [];
          acc[rec.date_str].push(rec);
          return acc;
      }, {});
      const sortedDays = Object.keys(grouped).sort();

      return (
          <div style={{display:'grid', gridTemplateColumns:'250px 1fr', gap:'20px'}}>
              {/* LISTA DE SELEÇÃO */}
              <div style={{background:'white', padding:'15px', borderRadius:'12px', border:'1px solid #e5e7eb', height:'calc(100vh - 200px)', overflowY:'auto'}}>
                  <h3 style={{fontSize:'1rem', marginBottom:'10px', color:'#374151'}}>Selecione:</h3>
                  {employees.map(emp => (
                      <div key={emp.id} onClick={() => setSelectedEmployee(emp.id)}
                           style={{
                               padding:'10px', borderRadius:'8px', cursor:'pointer', marginBottom:'5px',
                               background: selectedEmployee === emp.id ? '#eff6ff' : 'transparent',
                               color: selectedEmployee === emp.id ? '#2563eb' : '#4b5563',
                               fontWeight: selectedEmployee === emp.id ? '600' : 'normal'
                           }}>
                          {emp.name}
                      </div>
                  ))}
              </div>

              {/* ÁREA DE ESPELHO */}
              <div style={{background:'white', padding:'20px', borderRadius:'12px', border:'1px solid #e5e7eb', height:'calc(100vh - 200px)', display:'flex', flexDirection:'column'}}>
                  {selectedEmployee ? (
                      <>
                          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px', borderBottom:'1px solid #f3f4f6', paddingBottom:'10px'}}>
                              <div style={{display:'flex', gap:'10px'}}>
                                  <select value={month} onChange={e => setMonth(e.target.value)} style={inputStyle}>
                                      {[...Array(12)].map((_,i) => <option key={i} value={i+1}>{new Date(0, i).toLocaleString('pt-BR',{month:'long'})}</option>)}
                                  </select>
                                  <select value={year} onChange={e => setYear(e.target.value)} style={inputStyle}>
                                      <option value="2025">2025</option>
                                      <option value="2026">2026</option>
                                  </select>
                              </div>
                              <button onClick={() => openModal('timesheet')} className="btn-primary"><Plus size={16}/> Adicionar Batida</button>
                          </div>

                          <div style={{overflowY:'auto', flex:1}}>
                              {sortedDays.length === 0 ? <p style={{textAlign:'center', color:'#999'}}>Sem registros.</p> : (
                                  <table style={{width:'100%', borderCollapse:'collapse'}}>
                                      <thead>
                                          <tr style={{textAlign:'left', color:'#6b7280', fontSize:'0.9rem'}}><th style={{padding:'10px'}}>Data</th><th style={{padding:'10px'}}>Registros</th></tr>
                                      </thead>
                                      <tbody>
                                          {sortedDays.map(day => (
                                              <tr key={day} style={{borderBottom:'1px solid #f9fafb'}}>
                                                  <td style={{padding:'10px', verticalAlign:'top', width:'120px'}}>
                                                      <strong>{new Date(day + "T00:00:00").toLocaleDateString('pt-BR')}</strong><br/>
                                                      <small style={{color:'#9ca3af'}}>{new Date(day + "T00:00:00").toLocaleDateString('pt-BR',{weekday:'short'})}</small>
                                                  </td>
                                                  <td style={{padding:'10px'}}>
                                                      <div style={{display:'flex', flexWrap:'wrap', gap:'8px'}}>
                                                          {grouped[day].map(rec => (
                                                              <div key={rec.id} style={{display:'flex', alignItems:'center', background:'#f3f4f6', padding:'4px 10px', borderRadius:'15px', border:'1px solid #e5e7eb'}}>
                                                                  <span style={{fontWeight:'bold', marginRight:'5px'}}>{rec.time_str}</span>
                                                                  <small style={{textTransform:'uppercase', fontSize:'0.7rem', color:'#6b7280'}}>
                                                                      {rec.record_type === 'lunch_out' ? 'S.Almoço' : rec.record_type === 'lunch_in' ? 'V.Almoço' : rec.record_type === 'entry' ? 'Entrada' : 'Saída'}
                                                                  </small>
                                                                  <button onClick={() => openModal('timesheet', rec)} style={{...iconBtn, marginLeft:'5px'}}><Edit2 size={12} color="#2563eb"/></button>
                                                                  <button onClick={() => handleDelete(rec.id, 'timesheet')} style={iconBtn}><Trash2 size={12} color="#ef4444"/></button>
                                                              </div>
                                                          ))}
                                                      </div>
                                                  </td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              )}
                          </div>
                      </>
                  ) : <p style={{textAlign:'center', color:'#999', marginTop:'50px'}}>Selecione um colaborador ao lado.</p>}
              </div>
          </div>
      );
  };

  const renderRecruitment = () => ( /* ... Mantido Igual ... */ 
    <div>
      <div style={{display:'flex', gap:'20px', marginBottom:'20px'}}>
        <button onClick={() => openModal('opening')} className="btn-primary"><Plus size={18}/> Nova Vaga</button>
        <button onClick={() => openModal('candidate')} className="btn-secondary"><Plus size={18}/> Novo Candidato</button>
      </div>
      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
        <div style={cardStyle}>
            <h3 style={{marginBottom:'15px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>Vagas Abertas</h3>
            {jobOpenings.map(job => (
                <div key={job.id} style={{marginBottom:'15px', padding:'10px', backgroundColor:'#f9fafb', borderRadius:'8px'}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                        <strong style={{color:'#1f2937'}}>{job.title}</strong>
                        <button onClick={() => handleDelete(job.id, 'opening')} style={iconBtn}><Trash2 size={16} color="#ef4444"/></button>
                    </div>
                    <p style={{fontSize:'0.85rem', color:'#6b7280', margin:'5px 0'}}>{job.department_name}</p>
                </div>
            ))}
        </div>
        <div style={cardStyle}>
            <h3 style={{marginBottom:'15px', borderBottom:'1px solid #eee', paddingBottom:'10px'}}>Últimos Candidatos</h3>
            {candidates.map(cand => (
                <div key={cand.id} style={{marginBottom:'15px', padding:'10px', backgroundColor:'#f9fafb', borderRadius:'8px'}}>
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                        <strong>{cand.name}</strong>
                        <button onClick={() => handleDelete(cand.id, 'candidate')} style={iconBtn}><Trash2 size={16} color="#ef4444"/></button>
                    </div>
                    <p style={{fontSize:'0.85rem', color:'#6b7280', margin:'2px 0'}}>Vaga: {cand.job_title || 'Geral'}</p>
                </div>
            ))}
        </div>
      </div>
    </div>
  );

  const renderTerminations = () => ( /* ... Mantido Igual ... */
    <div>
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'10px'}}>
            <button onClick={() => openModal('termination')} className="btn-danger">
                <UserMinus size={18} style={{marginRight:'8px'}}/> Registrar Demissão
            </button>
        </div>
        <div style={cardStyle}>
            <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                    <tr style={{textAlign:'left', color:'#6b7280', borderBottom:'1px solid #e5e7eb'}}>
                        <th style={{padding:'10px'}}>Colaborador</th>
                        <th style={{padding:'10px'}}>Data Saída</th>
                        <th style={{padding:'10px'}}>Tipo</th>
                    </tr>
                </thead>
                <tbody>
                    {terminations.map(term => (
                        <tr key={term.id} style={{borderBottom:'1px solid #f9fafb'}}>
                            <td style={{padding:'10px'}}><strong>{term.employee_name}</strong></td>
                            <td style={{padding:'10px'}}>{new Date(term.termination_date).toLocaleDateString()}</td>
                            <td style={{padding:'10px'}}>{term.type}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderForms = () => ( /* ... Mantido Igual ... */ 
    <div>
        <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'10px'}}>
            <button onClick={() => openModal('form')} className="btn-primary"><Plus size={18}/> Criar Formulário</button>
        </div>
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px'}}>
            {forms.map(form => (
                <div key={form.id} style={{
                    backgroundColor: 'white', padding: '20px', borderRadius: '12px', border: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                            <div style={{padding:'5px', background:'#e0e7ff', borderRadius:'5px', color:'#3730a3'}}>
                                <ClipboardList size={20} />
                            </div>
                            {form.is_private && <Lock size={16} color="#ef4444" title="Privado" />}
                        </div>
                        <h3 style={{margin:0, color:'#1f2937'}}>{form.title}</h3>
                        <p style={{color:'#6b7280', fontSize:'0.9rem', marginTop:'5px'}}>{form.description}</p>
                        <p style={{fontSize:'0.8rem', color:'#999', marginTop:'10px'}}>
                            {form.fields.length} perguntas
                        </p>
                    </div>
                    <div style={{marginTop:'15px', borderTop:'1px solid #f3f4f6', paddingTop:'10px', display:'flex', justifyContent:'flex-end'}}>
                        <button onClick={() => handleDelete(form.id, 'form')} style={{color:'#ef4444', background:'none', border:'none', cursor:'pointer', fontSize:'0.9rem', display:'flex', alignItems:'center', gap:'5px'}}>
                            <Trash2 size={16}/> Excluir
                        </button>
                    </div>
                </div>
            ))}
        </div>
        {forms.length === 0 && <p style={{textAlign:'center', color:'#999', marginTop:'30px'}}>Nenhum formulário criado.</p>}
    </div>
  );

  return (
    <DashboardLayout>
      <div style={{marginBottom: '2rem'}}>
        <h1 style={{fontSize: '1.8rem', fontWeight: 'bold', color: '#1f2937'}}>Recursos Humanos</h1>
        <p style={{color: '#6b7280'}}>Gestão completa de capital humano</p>
      </div>

      {/* MENU DE ABAS */}
      <div style={{display: 'flex', gap: '20px', borderBottom: '1px solid #e5e7eb', marginBottom: '20px', overflowX: 'auto'}}>
        {['employees', 'timesheet', 'recruitment', 'forms', 'departments', 'positions', 'terminations'].map(tab => (
            <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                    padding: '10px 5px', background: 'none', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                    borderBottom: activeTab === tab ? '3px solid var(--primary-color)' : '3px solid transparent',
                    color: activeTab === tab ? 'var(--primary-color)' : '#6b7280', fontWeight: '600',
                    textTransform: 'capitalize'
                }}
            >
                {tab === 'employees' && 'Colaboradores'}
                {tab === 'timesheet' && 'Gestão de Ponto'}
                {tab === 'recruitment' && 'Recrutamento'}
                {tab === 'forms' && 'Formulários'}
                {tab === 'departments' && 'Departamentos'}
                {tab === 'positions' && 'Cargos'}
                {tab === 'terminations' && 'Desligamentos'}
            </button>
        ))}
      </div>

      {loading ? <p>Carregando...</p> : (
        <>
          {activeTab === 'employees' && renderEmployees()}
          {activeTab === 'timesheet' && renderTimesheet()}
          {activeTab === 'recruitment' && renderRecruitment()}
          {activeTab === 'forms' && renderForms()}
          {activeTab === 'terminations' && renderTerminations()}
          
          {/* DEPARTAMENTOS SIMPLES */}
          {activeTab === 'departments' && (
             <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                <div style={{display:'flex', justifyContent:'flex-end'}}>
                    <button onClick={() => openModal('department')} className="btn-primary"><Plus size={18}/> Novo Depto</button>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px'}}>
                    {departments.map(d => (
                        <div key={d.id} style={miniCard}>
                            <strong>{d.name}</strong>
                            <p style={{fontSize:'0.85rem', color:'#666'}}>Gestor: {d.manager_name || '-'}</p>
                            <button onClick={() => handleDelete(d.id, 'department')} style={{...iconBtn, marginTop:'10px'}}><Trash2 size={16} color="#ef4444"/></button>
                        </div>
                    ))}
                </div>
             </div>
          )}

          {/* CARGOS SIMPLES */}
          {activeTab === 'positions' && (
             <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                <div style={{display:'flex', justifyContent:'flex-end'}}>
                    <button onClick={() => openModal('position')} className="btn-primary"><Plus size={18}/> Novo Cargo</button>
                </div>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px'}}>
                    {positions.map(p => (
                        <div key={p.id} style={miniCard}>
                            <strong>{p.title}</strong>
                            <p style={{fontSize:'0.85rem', color:'#059669', fontWeight:'bold'}}>R$ {p.base_salary}</p>
                            <button onClick={() => handleDelete(p.id, 'position')} style={{...iconBtn, marginTop:'10px'}}><Trash2 size={16} color="#ef4444"/></button>
                        </div>
                    ))}
                </div>
             </div>
          )}
        </>
      )}

      {/* MODAL */}
      {showModal && (
        <div style={modalOverlay}>
          <div style={modalContent}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
                <h2 style={{margin:0, color: '#1f2937', textTransform:'capitalize'}}>
                   {editingItem ? 'Editar' : 'Novo'} {modalType === 'timesheet' ? 'Registro de Ponto' : modalType}
                </h2>
                <button onClick={() => setShowModal(false)} style={{border:'none', background:'transparent', cursor:'pointer'}}><X/></button>
            </div>
            
            <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              
              {/* --- FORMULÁRIO DE PONTO --- */}
              {modalType === 'timesheet' && (
                  <>
                      <label style={labelStyle}>Data</label>
                      <input type="date" required value={pointData.date} onChange={e => setPointData({...pointData, date: e.target.value})} style={inputStyle} />
                      
                      <label style={labelStyle}>Horário</label>
                      <input type="time" required value={pointData.time} onChange={e => setPointData({...pointData, time: e.target.value})} style={inputStyle} />
                      
                      {/* Se for edição, não deixa mudar o tipo */}
                      {!editingItem && (
                          <>
                              <label style={labelStyle}>Tipo</label>
                              <select value={pointData.type} onChange={e => setPointData({...pointData, type: e.target.value})} style={inputStyle}>
                                  <option value="entry">Entrada</option>
                                  <option value="lunch_out">Saída Almoço</option>
                                  <option value="lunch_in">Retorno Almoço</option>
                                  <option value="exit">Saída</option>
                              </select>
                          </>
                      )}
                  </>
              )}

              {/* --- FORMULÁRIO DE COLABORADOR --- */}
              {modalType === 'employee' && (
                <>
                  <input required placeholder="Nome Completo" value={empData.name} onChange={e => setEmpData({...empData, name: e.target.value})} style={inputStyle} />
                  <div style={rowStyle}>
                    <input required type="email" placeholder="Email (Login)" value={empData.email} onChange={e => setEmpData({...empData, email: e.target.value})} style={inputStyle} />
                    <input placeholder="Telefone" value={empData.phone} onChange={e => setEmpData({...empData, phone: e.target.value})} style={inputStyle} />
                  </div>
                  
                  <input 
                    type="password" 
                    placeholder={editingItem ? "Nova Senha (opcional)" : "Senha de Acesso"} 
                    value={empData.password || ''} 
                    onChange={e => setEmpData({...empData, password: e.target.value})} 
                    style={{...inputStyle, border: '1px solid #93c5fd', backgroundColor: '#eff6ff'}} 
                  />

                  <div style={rowStyle}>
                    <select value={empData.department_id} onChange={e => setEmpData({...empData, department_id: e.target.value})} style={inputStyle}>
                        <option value="">Departamento...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <select value={empData.position_id} onChange={e => setEmpData({...empData, position_id: e.target.value})} style={inputStyle}>
                        <option value="">Cargo...</option>
                        {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                  <div style={rowStyle}>
                      <input type="number" placeholder="Carga Horária (h)" value={empData.work_hours_daily} onChange={e => setEmpData({...empData, work_hours_daily: e.target.value})} style={inputStyle} />
                      <input placeholder="CPF" value={empData.cpf} onChange={e => setEmpData({...empData, cpf: e.target.value})} style={inputStyle} />
                  </div>
                </>
              )}

              {/* OUTROS FORMULÁRIOS (MANTIDOS) */}
              {modalType === 'opening' && (
                <>
                    <input required placeholder="Título da Vaga" value={openingData.title} onChange={e => setOpeningData({...openingData, title: e.target.value})} style={inputStyle} />
                    <textarea placeholder="Descrição" value={openingData.description} onChange={e => setOpeningData({...openingData, description: e.target.value})} style={{...inputStyle, height:'80px'}} />
                    <div style={rowStyle}>
                        <select value={openingData.department_id} onChange={e => setOpeningData({...openingData, department_id: e.target.value})} style={inputStyle}>
                            <option value="">Departamento...</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <select value={openingData.status} onChange={e => setOpeningData({...openingData, status: e.target.value})} style={inputStyle}>
                            <option value="open">Aberta</option>
                            <option value="closed">Fechada</option>
                        </select>
                    </div>
                </>
              )}

              {modalType === 'candidate' && (
                <>
                    <input required placeholder="Nome" value={candData.name} onChange={e => setCandData({...candData, name: e.target.value})} style={inputStyle} />
                    <div style={rowStyle}>
                        <input placeholder="Email" value={candData.email} onChange={e => setCandData({...candData, email: e.target.value})} style={inputStyle} />
                        <input placeholder="Telefone" value={candData.phone} onChange={e => setCandData({...candData, phone: e.target.value})} style={inputStyle} />
                    </div>
                    <select value={candData.job_opening_id} onChange={e => setCandData({...candData, job_opening_id: e.target.value})} style={inputStyle}>
                        <option value="">Vaga...</option>
                        {jobOpenings.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                    <input placeholder="Link Currículo" value={candData.resume_link} onChange={e => setCandData({...candData, resume_link: e.target.value})} style={inputStyle} />
                </>
              )}

              {modalType === 'termination' && (
                <>
                    <select required value={termData.employee_id} onChange={e => setTermData({...termData, employee_id: e.target.value})} style={inputStyle}>
                        <option value="">Selecione o Colaborador...</option>
                        {employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <div style={rowStyle}>
                        <input type="date" required value={termData.termination_date} onChange={e => setTermData({...termData, termination_date: e.target.value})} style={inputStyle} />
                        <select value={termData.type} onChange={e => setTermData({...termData, type: e.target.value})} style={inputStyle}>
                            <option value="voluntary">Pedido Demissão</option>
                            <option value="involuntary">Sem Justa Causa</option>
                            <option value="cause">Justa Causa</option>
                        </select>
                    </div>
                    <textarea required placeholder="Motivo" value={termData.reason} onChange={e => setTermData({...termData, reason: e.target.value})} style={{...inputStyle, height:'80px'}} />
                </>
              )}

              {modalType === 'form' && (
                <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <input required placeholder="Título do Formulário" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} style={inputStyle} />
                    <input placeholder="Descrição (opcional)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={inputStyle} />
                    
                    <label style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'0.9rem', cursor:'pointer'}}>
                        <input type="checkbox" checked={formData.is_private} onChange={e => setFormData({...formData, is_private: e.target.checked})} />
                        Marcar como Privado (Apenas RH vê)
                    </label>

                    <div style={{borderTop:'1px solid #eee', paddingTop:'10px', marginTop:'10px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px'}}>
                            <h4 style={{margin:0}}>Perguntas</h4>
                            <button type="button" onClick={addField} style={{fontSize:'0.8rem', color:'#4f46e5', background:'none', border:'none', cursor:'pointer', fontWeight:'600'}}>
                                + Adicionar Campo
                            </button>
                        </div>
                        
                        <div style={{maxHeight:'200px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'10px'}}>
                            {formData.fields.map((field, idx) => (
                                <div key={idx} style={{display:'flex', gap:'5px', alignItems:'center', background:'#f9fafb', padding:'5px', borderRadius:'5px'}}>
                                    <input 
                                        placeholder="Pergunta / Label" 
                                        value={field.label} 
                                        onChange={e => updateField(idx, 'label', e.target.value)}
                                        style={{...inputStyle, flex: 2}}
                                        required
                                    />
                                    <select 
                                        value={field.type} 
                                        onChange={e => updateField(idx, 'type', e.target.value)}
                                        style={{...inputStyle, flex: 1}}
                                    >
                                        <option value="text">Texto</option>
                                        <option value="number">Número</option>
                                        <option value="date">Data</option>
                                        <option value="textarea">Área de Texto</option>
                                    </select>
                                    <button type="button" onClick={() => removeField(idx)} style={{border:'none', background:'none', color:'#ef4444', cursor:'pointer'}}>
                                        <MinusCircle size={18} />
                                    </button>
                                </div>
                            ))}
                            {formData.fields.length === 0 && <p style={{fontSize:'0.8rem', color:'#999', textAlign:'center'}}>Nenhuma pergunta adicionada.</p>}
                        </div>
                    </div>
                </div>
              )}

              {(modalType === 'department') && <input placeholder="Nome" value={deptData.name} onChange={e => setDeptData({...deptData, name: e.target.value})} style={inputStyle} />}
              {(modalType === 'position') && (
                  <>
                    <input placeholder="Título" value={posData.title} onChange={e => setPosData({...posData, title: e.target.value})} style={inputStyle} />
                    <input type="number" placeholder="Salário Base" value={posData.base_salary} onChange={e => setPosData({...posData, base_salary: e.target.value})} style={inputStyle} />
                  </>
              )}

              <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem'}}>
                <button type="button" onClick={() => setShowModal(false)} style={{padding: '10px 20px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', cursor: 'pointer'}}>Cancelar</button>
                <button type="submit" style={{padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer'}}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .btn-primary { background-color: var(--primary-color); color: white; padding: 8px 16px; border-radius: 6px; border: none; display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; }
        .btn-secondary { background-color: white; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 8px 16px; border-radius: 6px; display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; }
        .btn-danger { background-color: #ef4444; color: white; padding: 8px 16px; border-radius: 6px; border: none; display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; }
      `}</style>
    </DashboardLayout>
  );
}

const cardStyle = { backgroundColor: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' };
const miniCard = { backgroundColor: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.95rem' };
const rowStyle = { display: 'flex', gap: '10px' };
const iconBtn = { background: 'none', border: 'none', cursor: 'pointer', padding:'4px' };
const modalOverlay = { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const modalContent = { backgroundColor: 'white', padding: '2rem', borderRadius: '12px', width: '550px', maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' };
const labelStyle = { fontSize: '0.85rem', fontWeight: '600', color: '#4b5563', marginBottom: '2px', display: 'block' };