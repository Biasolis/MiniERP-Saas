import { useEffect, useState, useContext } from 'react';
import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './TasksPage.module.css';
// Substituí Kanban por LayoutGrid para garantir compatibilidade
import { Plus, List, LayoutGrid, Calendar as CalIcon, Trash2, CheckCircle, Clock, Loader2 } from 'lucide-react';

export default function TasksPage() {
  const { addToast } = useContext(ToastContext);
  
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('kanban'); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [newTask, setNewTask] = useState({
    title: '', description: '', priority: 'normal', due_date: '', status: 'todo'
  });

  useEffect(() => {
    loadTasks();
  }, []);

  async function loadTasks() {
    setLoading(true);
    try {
        const res = await api.get('/tasks');
        // PROTEÇÃO: Garante que tasks seja sempre um array, mesmo se a API falhar
        setTasks(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
        console.error("Erro ao carregar tasks:", error);
        addToast({ type: 'error', title: 'Erro ao carregar tarefas' });
        setTasks([]); // Reseta para evitar crash no map
    } finally {
        setLoading(false);
    }
  }

  async function handleCreate(e) {
      e.preventDefault();
      try {
          const payload = { ...newTask, due_date: newTask.due_date || null };
          await api.post('/tasks', payload);
          addToast({ type: 'success', title: 'Tarefa criada!' });
          setIsModalOpen(false);
          setNewTask({ title: '', description: '', priority: 'normal', due_date: '', status: 'todo' });
          loadTasks();
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao criar' });
      }
  }

  async function handleStatusChange(id, newStatus) {
      const oldTasks = [...tasks];
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));

      try {
          await api.patch(`/tasks/${id}/status`, { status: newStatus });
      } catch (error) {
          setTasks(oldTasks);
          addToast({ type: 'error', title: 'Erro ao atualizar status' });
      }
  }

  async function handleDelete(id) {
      if(!confirm('Apagar tarefa?')) return;
      try {
          await api.delete(`/tasks/${id}`);
          setTasks(prev => prev.filter(t => t.id !== id));
          addToast({ type: 'success', title: 'Tarefa removida' });
      } catch (error) {
          addToast({ type: 'error', title: 'Erro ao remover' });
      }
  }

  // Helper seguro
  const getTasksByStatus = (status) => {
      if (!Array.isArray(tasks)) return [];
      return tasks.filter(t => t.status === status);
  };

  const renderTaskCard = (task) => (
      <div key={task.id} className={styles.taskCard}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'5px'}}>
             <span className={`${styles.priorityBadge} ${
                 task.priority === 'high' ? styles.priorityHigh : 
                 task.priority === 'normal' ? styles.priorityNormal : styles.priorityLow
             }`}>
                 {task.priority === 'high' ? 'Alta' : task.priority === 'normal' ? 'Normal' : 'Baixa'}
             </span>
             <button onClick={() => handleDelete(task.id)} style={{border:'none', background:'transparent', cursor:'pointer', color:'#ef4444'}}>
                 <Trash2 size={14} />
             </button>
          </div>
          <div className={styles.taskTitle}>{task.title}</div>
          {task.description && <p style={{fontSize:'0.8rem', color:'#6b7280', marginBottom:'8px'}}>{task.description}</p>}
          
          <div className={styles.taskMeta}>
              {task.due_date ? (
                  <span style={{display:'flex', alignItems:'center', gap:'4px'}}>
                      <CalIcon size={12} /> {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
              ) : <span>Sem data</span>}
              
              <div style={{display:'flex', gap:'5px'}}>
                  {task.status !== 'todo' && (
                      <button onClick={() => handleStatusChange(task.id, 'todo')} title="Mover para A Fazer" style={{cursor:'pointer', fontSize:'0.7rem'}}>⬅</button>
                  )}
                  {task.status !== 'done' && (
                      <button onClick={() => handleStatusChange(task.id, 'done')} title="Concluir" style={{cursor:'pointer', fontSize:'0.7rem'}}>➡</button>
                  )}
              </div>
          </div>
      </div>
  );

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
            <h2>Gestão de Tarefas</h2>
            <div style={{display:'flex', gap:'1rem', alignItems: 'center'}}>
                <div className={styles.viewToggle}>
                    <button className={`${styles.viewBtn} ${viewMode==='kanban'?styles.active:''}`} onClick={()=>setViewMode('kanban')}>
                        <LayoutGrid size={16} /> Kanban
                    </button>
                    <button className={`${styles.viewBtn} ${viewMode==='list'?styles.active:''}`} onClick={()=>setViewMode('list')}>
                        <List size={16} /> Lista
                    </button>
                </div>
                <button className={styles.btnNew} onClick={() => setIsModalOpen(true)}>
                    <Plus size={18} /> <span style={{display: 'none', '@media (min-width: 600px)': { display: 'inline' }}}>Nova Tarefa</span>
                </button>
            </div>
        </div>

        {loading ? <div style={{padding: '2rem', textAlign: 'center'}}>Carregando tarefas...</div> : (
            <>
              {viewMode === 'kanban' ? (
                  <div className={styles.kanbanBoard}>
                      {/* COLUNA A FAZER */}
                      <div className={styles.kanbanColumn}>
                          <div className={styles.columnHeader}>
                              <span>A Fazer ({getTasksByStatus('todo').length})</span>
                              <Clock size={16} color="#6b7280" />
                          </div>
                          {getTasksByStatus('todo').map(renderTaskCard)}
                          {getTasksByStatus('todo').length === 0 && <small style={{color:'#9ca3af', textAlign:'center', marginTop:'10px'}}>Vazio</small>}
                      </div>

                      {/* COLUNA EM PROGRESSO */}
                      <div className={styles.kanbanColumn}>
                          <div className={styles.columnHeader}>
                              <span>Em Progresso ({getTasksByStatus('in_progress').length})</span>
                              <Loader2 size={16} color="#3b82f6" />
                          </div>
                          {getTasksByStatus('in_progress').map(renderTaskCard)}
                      </div>

                      {/* COLUNA CONCLUÍDO */}
                      <div className={styles.kanbanColumn}>
                          <div className={styles.columnHeader}>
                              <span>Concluído ({getTasksByStatus('done').length})</span>
                              <CheckCircle size={16} color="#10b981" />
                          </div>
                          {getTasksByStatus('done').map(renderTaskCard)}
                      </div>
                  </div>
              ) : (
                  <div className={styles.listContainer}>
                      <table className={styles.listTable}>
                          <thead>
                              <tr>
                                  <th>Status</th>
                                  <th>Título</th>
                                  <th>Prioridade</th>
                                  <th>Vencimento</th>
                                  <th>Ações</th>
                              </tr>
                          </thead>
                          <tbody>
                              {tasks.map(t => (
                                  <tr key={t.id}>
                                      <td>
                                          <select 
                                              value={t.status} 
                                              onChange={(e) => handleStatusChange(t.id, e.target.value)}
                                              style={{padding:'4px', borderRadius:'4px', border:'1px solid #d1d5db'}}
                                          >
                                              <option value="todo">A Fazer</option>
                                              <option value="in_progress">Fazendo</option>
                                              <option value="done">Pronto</option>
                                          </select>
                                      </td>
                                      <td>{t.title}</td>
                                      <td>{t.priority}</td>
                                      <td>{t.due_date ? new Date(t.due_date).toLocaleDateString('pt-BR') : '-'}</td>
                                      <td>
                                          <button onClick={() => handleDelete(t.id)} style={{color:'#ef4444', border:'none', background:'transparent', cursor:'pointer'}}>
                                              <Trash2 size={16} />
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {tasks.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:'1rem'}}>Nenhuma tarefa encontrada.</td></tr>}
                          </tbody>
                      </table>
                  </div>
              )}
            </>
        )}

        {/* MODAL */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nova Tarefa">
            <form onSubmit={handleCreate}>
                <div>
                    <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem'}}>Título</label>
                    <input required className={styles.input} value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} />
                </div>
                <div>
                    <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem'}}>Descrição</label>
                    <textarea className={styles.textarea} value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} />
                </div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    <div>
                        <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem'}}>Prioridade</label>
                        <select className={styles.input} value={newTask.priority} onChange={e => setNewTask({...newTask, priority: e.target.value})}>
                            <option value="low">Baixa</option>
                            <option value="normal">Normal</option>
                            <option value="high">Alta</option>
                        </select>
                    </div>
                    <div>
                        <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem'}}>Vencimento</label>
                        <input type="date" className={styles.input} value={newTask.due_date} onChange={e => setNewTask({...newTask, due_date: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label style={{display:'block', marginBottom:'5px', fontSize:'0.9rem'}}>Status Inicial</label>
                    <select className={styles.input} value={newTask.status} onChange={e => setNewTask({...newTask, status: e.target.value})}>
                        <option value="todo">A Fazer</option>
                        <option value="in_progress">Em Progresso</option>
                        <option value="done">Concluído</option>
                    </select>
                </div>
                <button type="submit" className={styles.btnNew} style={{width:'100%', justifyContent:'center', marginTop:'10px'}}>Salvar Tarefa</button>
            </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
}