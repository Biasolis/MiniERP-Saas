import { useEffect, useState, useContext, useCallback } from 'react';
import { Calendar, momentLocalizer, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/pt-br';
import 'react-big-calendar/lib/css/react-big-calendar.css';

import api from '../../services/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Modal from '../../components/ui/Modal';
import { ToastContext } from '../../context/ToastContext';
import styles from './CalendarPage.module.css';
import { Plus } from 'lucide-react';

// Configuração do Moment
moment.locale('pt-br');
const localizer = momentLocalizer(moment);

const messages = {
    allDay: 'Dia todo',
    previous: 'Anterior',
    next: 'Próximo',
    today: 'Hoje',
    month: 'Mês',
    week: 'Semana',
    day: 'Dia',
    agenda: 'Agenda',
    date: 'Data',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'Não há eventos neste período.',
};

export default function CalendarPage() {
    const { addToast } = useContext(ToastContext);
    
    // ESTADOS DE CONTROLE (Correção dos botões)
    const [view, setView] = useState(Views.MONTH);
    const [date, setDate] = useState(new Date());

    const [events, setEvents] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [newEvent, setNewEvent] = useState({
        title: '', 
        description: '', 
        start_date: '', 
        start_time: '08:00', 
        end_date: '', 
        end_time: '09:00', 
        color: '#6366f1'
    });

    useEffect(() => {
        loadEvents();
    }, []);

    async function loadEvents() {
        try {
            const response = await api.get('/calendar');
            const formattedEvents = response.data.map(evt => ({
                ...evt,
                start: new Date(evt.start),
                end: new Date(evt.end)
            }));
            setEvents(formattedEvents);
        } catch (error) {
            console.error(error);
            addToast({ type: 'error', title: 'Erro ao carregar agenda' });
        }
    }

    // MANIPULADORES DE ESTADO (Obrigatórios para os botões funcionarem)
    const handleOnChangeView = (selectedView) => {
        setView(selectedView);
    };

    const handleOnNavigate = (newDate) => {
        setDate(newDate);
    };

    async function handleCreate(e) {
        e.preventDefault();
        try {
            const startISO = `${newEvent.start_date}T${newEvent.start_time}:00`;
            const endISO = `${newEvent.end_date}T${newEvent.end_time}:00`;

            await api.post('/calendar', {
                title: newEvent.title,
                description: newEvent.description,
                start_date: startISO,
                end_date: endISO,
                color: newEvent.color
            });

            addToast({ type: 'success', title: 'Evento criado!' });
            setIsModalOpen(false);
            setNewEvent({ title: '', description: '', start_date: '', start_time: '08:00', end_date: '', end_time: '09:00', color: '#6366f1' });
            loadEvents();
        } catch (error) {
            addToast({ type: 'error', title: 'Erro ao criar evento' });
        }
    }

    const eventStyleGetter = (event) => {
        return {
            style: {
                backgroundColor: event.color || '#3174ad',
                borderRadius: '4px',
                opacity: 0.9,
                color: 'white',
                border: '0px',
                display: 'block',
                fontSize: '0.8rem'
            }
        };
    };

    return (
        <DashboardLayout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <div>
                        <h2>Agenda</h2>
                        <div className={styles.legend}>
                            <span className={styles.legendItem}><div className={styles.dot} style={{background: '#3b82f6'}}></div> OS</span>
                            <span className={styles.legendItem}><div className={styles.dot} style={{background: '#10b981'}}></div> Financeiro</span>
                            <span className={styles.legendItem}><div className={styles.dot} style={{background: '#f59e0b'}}></div> Tarefas</span>
                            <span className={styles.legendItem}><div className={styles.dot} style={{background: '#6366f1'}}></div> Eventos</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        style={{
                            background:'var(--primary-color)', 
                            color:'white', 
                            border:'none', 
                            padding:'0.6rem 1rem', 
                            borderRadius:'6px', 
                            display:'flex', 
                            gap:'5px', 
                            cursor:'pointer',
                            fontWeight: '600',
                            alignItems: 'center'
                        }} 
                    >
                        <Plus size={18} /> Novo Evento
                    </button>
                </div>

                <div className={styles.calendarWrapper}>
                    <Calendar
                        localizer={localizer}
                        events={events}
                        // Controle Total (Isso corrige os botões)
                        view={view}
                        date={date}
                        onView={handleOnChangeView}
                        onNavigate={handleOnNavigate}
                        // Configurações
                        views={['month', 'week', 'day', 'agenda']} // Explicita as views
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%' }}
                        messages={messages}
                        eventPropGetter={eventStyleGetter}
                        culture="pt-br"
                        onSelectEvent={evt => addToast({type: 'info', title: evt.title})}
                    />
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Evento na Agenda">
                <form onSubmit={handleCreate}>
                    <div style={{marginBottom:'10px'}}>
                        <label style={{display:'block', fontSize:'0.9rem', fontWeight: 500, marginBottom: '4px'}}>Título</label>
                        <input required style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'4px'}} value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
                    </div>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                        <div>
                            <label style={{display:'block', fontSize:'0.9rem', fontWeight: 500, marginBottom: '4px'}}>Início</label>
                            <input required type="date" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'4px'}} value={newEvent.start_date} onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} />
                            <input required type="time" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'4px', marginTop:'5px'}} value={newEvent.start_time} onChange={e => setNewEvent({...newEvent, start_time: e.target.value})} />
                        </div>
                        <div>
                            <label style={{display:'block', fontSize:'0.9rem', fontWeight: 500, marginBottom: '4px'}}>Fim</label>
                            <input required type="date" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'4px'}} value={newEvent.end_date} onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} />
                            <input required type="time" style={{width:'100%', padding:'8px', border:'1px solid #d1d5db', borderRadius:'4px', marginTop:'5px'}} value={newEvent.end_time} onChange={e => setNewEvent({...newEvent, end_time: e.target.value})} />
                        </div>
                    </div>
                    <div style={{marginBottom:'15px'}}>
                        <label style={{display:'block', fontSize:'0.9rem', fontWeight: 500, marginBottom: '4px'}}>Cor do Evento</label>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <input type="color" style={{width:'50px', height:'40px', border:'none', cursor: 'pointer', background: 'none'}} value={newEvent.color} onChange={e => setNewEvent({...newEvent, color: e.target.value})} />
                            <span style={{fontSize: '0.8rem', color: '#666'}}>{newEvent.color}</span>
                        </div>
                    </div>
                    <button type="submit" style={{width:'100%', padding:'10px', background:'var(--primary-color)', color:'white', border:'none', borderRadius:'6px', fontWeight:'bold', cursor:'pointer'}}>Salvar Evento</button>
                </form>
            </Modal>
        </DashboardLayout>
    );
}