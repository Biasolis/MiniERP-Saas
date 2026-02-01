const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const compression = require('compression');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const tenantRoutes = require('./routes/tenantRoutes');
const serviceOrderRoutes = require('./routes/serviceOrderRoutes');
const clientRoutes = require('./routes/clientRoutes');
const recurringRoutes = require('./routes/recurringRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const reportRoutes = require('./routes/reportRoutes');
const productRoutes = require('./routes/productRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const auditRoutes = require('./routes/auditRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const calendarRoutes = require('./routes/calendarRoutes');
const taskRoutes = require('./routes/taskRoutes');
const planRoutes = require('./routes/planRoutes');
const saleRoutes = require('./routes/saleRoutes');
const entryRoutes = require('./routes/entryRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const pcpRoutes = require('./routes/pcpRoutes');
const posRoutes = require('./routes/posRoutes');
const hrRoutes = require('./routes/hrRoutes'); // <--- 1. IMPORTAR

const { apiLimiter, authLimiter } = require('./middlewares/rateLimiter');
const logger = require('./config/logger');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
    logger.http(`${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

app.use('/api', apiLimiter);
app.use('/uploads', express.static(path.resolve(__dirname, '..', '..', 'uploads')));

// ROTAS
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/admin', superAdminRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/service-orders', serviceOrderRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/recurring', recurringRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/entries', entryRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/pcp', pcpRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/hr', hrRoutes); // <--- 2. REGISTRAR

app.get('/', (req, res) => {
    res.json({ status: 'API Online 🚀', version: '1.9.7', mode: 'Full ERP + HR' });
});

module.exports = app;