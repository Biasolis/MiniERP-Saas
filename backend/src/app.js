const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Importação das Rotas
const authRoutes = require('./routes/authRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const productRoutes = require('./routes/productRoutes');
const clientRoutes = require('./routes/clientRoutes');
const saleRoutes = require('./routes/saleRoutes');
const serviceOrderRoutes = require('./routes/serviceOrderRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const reportRoutes = require('./routes/reportRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const auditRoutes = require('./routes/auditRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const taskRoutes = require('./routes/taskRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const pcpRoutes = require('./routes/pcpRoutes');
const entryRoutes = require('./routes/entryRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const posRoutes = require('./routes/posRoutes');
const planRoutes = require('./routes/planRoutes');
const hrRoutes = require('./routes/hrRoutes');
const payrollRoutes = require('./routes/payrollRoutes');
const employeePortalRoutes = require('./routes/employeePortalRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const ticketRoutes = require('./routes/ticketRoutes'); 

const app = express();

// Middlewares Globais
app.use(helmet({
    crossOriginResourcePolicy: false,
}));

app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'tenant-id']
}));

app.use(express.json());

// Rate Limiting Global
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 1000, 
    message: { error: 'Muitas requisições, tente novamente mais tarde.' }
});
app.use(limiter);

// --- CONFIGURAÇÃO DE ROTAS ---

app.use('/api/auth', authRoutes);

// --- CORREÇÃO AQUI: Registrar singular E plural ---
app.use('/api/tenants', tenantRoutes); // Para listas (Admin)
app.use('/api/tenant', tenantRoutes);  // Para contexto da empresa logada (Configurações)
// --------------------------------------------------

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/products', productRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/admin', superAdminRoutes); 
app.use('/api/pcp', pcpRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/portal', employeePortalRoutes);
app.use('/api/tickets', ticketRoutes);

// Rota de Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Middleware de Erro Global
app.use((err, req, res, next) => {
    console.error('Erro Global:', err);
    res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

module.exports = app;