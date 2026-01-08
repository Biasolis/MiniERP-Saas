const express = require('express');
const cors = require('cors');
const path = require('path'); // Importante para caminhos de arquivos
const db = require('./src/config/db');

// Importação das Rotas
const authRoutes = require('./src/routes/authRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const advisorRoutes = require('./src/routes/advisorRoutes');
const investmentRoutes = require('./src/routes/investmentRoutes');
const settingsRoutes = require('./src/routes/settingsRoutes');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middlewares Globais ---
app.use(cors());
app.use(express.json());

// --- 1. Servir Arquivos Estáticos (Frontend) ---
// Isso permite que o navegador acesse style.css, script.js, manifest.json, etc.
// O path.join garante que funcione em qualquer sistema operacional (Windows/Linux)
app.use(express.static(path.join(__dirname, '../client')));

// --- 2. Rotas da API ---
// É importante que as rotas da API venham ANTES do "catch-all"
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/advisor', advisorRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/settings', settingsRoutes);

// Health Check (Para verificar se o servidor está vivo)
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.json({ status: 'online', database: 'connected', timestamp: new Date() });
    } catch (error) {
        res.status(500).json({ status: 'error', error: error.message });
    }
});

// --- 3. Rota "Catch-All" para SPA (Single Page Application) ---
// Qualquer requisição que NÃO for para /api e NÃO for um arquivo estático
// será redirecionada para o index.html. Isso permite que o Router do frontend
// (router.js) gerencie a navegação (ex: /investments, /settings) sem erro 404.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client', 'index.html'));
});

// --- Inicialização do Servidor ---
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📂 Servindo frontend de: ${path.join(__dirname, '../client')}`);
});