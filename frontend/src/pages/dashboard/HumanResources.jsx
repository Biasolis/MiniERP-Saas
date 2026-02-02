import { useState, useEffect, useContext } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ToastContext } from '../../context/ToastContext';
import api from '../../services/api';
import { 
  Users, Briefcase, Building, Plus, Trash2, Edit2, 
  FileText, UserMinus, Search, ExternalLink, ClipboardList, Lock, MinusCircle
} from 'lucide-react';

export default function HumanResources() {
  const [activeTab, setActiveTab] = useState('employees'); 
  const { addToast } = useContext(ToastContext);
  const [loading, setLoading] = useState(true);

  // Data States
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [jobOpenings, setJobOpenings] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [terminations, setTerminations] = useState([]);
  const [forms, setForms] = useState([]);

  // Form States
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState(''); 

  // Form Data
  const [empData, setEmpData] = useState({ 
      name: '', email: '', phone: '', cpf: '', salary: '', 
      status: 'active', department_id: '', position_id: '', 
      password: '' // Novo campo de senha
  });
  const [deptData, setDeptData] = useState({ name: '', manager_name: '' });
  const [posData, setPosData] = useState({ title: '', base_salary: '', description: '' });
  const [openingData, setOpeningData] = useState({ title: '', description: '', department_id: '', position_id: '', status: 'open' });
  const [candData, setCandData] = useState({ job_opening_id: '', name: '', email: '', phone: '', resume_link: '', status: 'applied', notes: '' });
  const [termData, setTermData] = useState({ employee_id: '', termination_date: new Date().toISOString().split('T')[0], reason: '', type: 'voluntary' });
  const [formData, setFormData] = useState({ title: '', description: '', is_private: false, fields: [] });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, deptRes, posRes] = await Promise.all([
        api.get('/hr/employees'),
        api.get('/hr/departments'),
        api.get('/hr/positions')
      ]);
      setEmployees(empRes.data);
      setDepartments(deptRes.data);
      setPositions(posRes.data);

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

  const handleDelete = async (id, type) => {
    if (!confirm('Tem certeza?')) return;
    try {
      let endpoint = '';
      if (type === 'employee') endpoint = `/hr/employees/${id}`;
      if (type === 'department') endpoint = `/hr/departments/${id}`;
      if (type === 'position') endpoint = `/hr/positions/${id}`;
      if (type === 'opening') endpoint = `/hr/recruitment/openings/${id}`;
      if (type === 'candidate') endpoint = `/hr/recruitment/candidates/${id}`;
      if (type === 'form') endpoint = `/hr/forms/${id}`;

      await api.delete(endpoint);
      addToast({ type: 'success', title: 'Sucesso', message: 'Item removido' });
      fetchData();
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
    setEmpData({ name: '', email: '', phone: '', cpf: '', salary: '', status: 'active', department_id: '', position_id: '', password: '' });
    setDeptData({ name: '', manager_name: '' });
    setPosData({ title: '', base_salary: '', description: '' });
    setOpeningData({ title: '', description: '', department_id: '', position_id: '', status: 'open' });
    setCandData({ job_opening_id: '', name: '', email: '', phone: '', resume_link: '', status: 'applied', notes: '' });
    setTermData({ employee_id: '', termination_date: new Date().toISOString().split('T')[0], reason: '', type: 'voluntary' });
    setFormData({ title: '', description: '', is_private: false, fields: [] });

    if (item) {
      if (type === 'employee') setEmpData({ ...item, password: '' }); // Limpa senha ao editar para não mostrar hash
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
            <th style={{padding: '12px'}}>Cargo</th>
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

  const renderRecruitment = () => (
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

  const renderTerminations = () => (
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

  const renderForms = () => (
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
        {['employees', 'recruitment', 'forms', 'departments', 'positions', 'terminations'].map(tab => (
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
                {tab === 'recruitment' && 'Recrutamento'}
                {tab === 'forms' && 'Formulários & Privados'}
                {tab === 'departments' && 'Departamentos'}
                {tab === 'positions' && 'Cargos'}
                {tab === 'terminations' && 'Desligamentos'}
            </button>
        ))}
      </div>

      {loading ? <p>Carregando...</p> : (
        <>
          {activeTab === 'employees' && renderEmployees()}
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
            <h2 style={{marginBottom: '1.5rem', color: '#1f2937', textTransform:'capitalize'}}>
               {editingItem ? 'Editar' : 'Novo'} {modalType}
            </h2>
            
            <form onSubmit={handleSave} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              
              {/* --- FORMULÁRIO DE COLABORADOR ATUALIZADO --- */}
              {modalType === 'employee' && (
                <>
                  <input required placeholder="Nome Completo" value={empData.name} onChange={e => setEmpData({...empData, name: e.target.value})} style={inputStyle} />
                  <div style={rowStyle}>
                    <input required type="email" placeholder="Email (Login)" value={empData.email} onChange={e => setEmpData({...empData, email: e.target.value})} style={inputStyle} />
                    <input placeholder="Telefone" value={empData.phone} onChange={e => setEmpData({...empData, phone: e.target.value})} style={inputStyle} />
                  </div>
                  
                  {/* --- CAMPO DE SENHA ADICIONADO --- */}
                  <input 
                    type="password" 
                    placeholder={editingItem ? "Nova Senha (deixe em branco para manter)" : "Senha de Acesso ao Portal"} 
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
                </>
              )}

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