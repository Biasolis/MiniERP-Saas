const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERRO CRÍTICO: DATABASE_URL não definida no arquivo .env');
    process.exit(1);
}

// LÓGICA HÍBRIDA (NeonDB vs Local Docker)
// ----------------------------------------
// O NeonDB sempre tem 'neon.tech' (ou similar) na URL e EXIGE SSL.
// O Docker local geralmente roda sem SSL na rede interna (http).
const isNeonDB = connectionString.includes('neon.tech') || connectionString.includes('aws.neon');

// Se for Neon, ativa SSL com rejectUnauthorized false (padrão serverless).
// Se for Local, desativa SSL (false) para evitar erro de "connection reset".
const sslConfig = isNeonDB ? { rejectUnauthorized: false } : false;

const pool = new Pool({
    connectionString,
    ssl: sslConfig
});

pool.on('connect', () => {
    // Log opcional para você saber onde conectou
    if (process.env.NODE_ENV !== 'production') {
        console.log(`🔌 Conectado ao banco: ${isNeonDB ? 'NeonDB (Nuvem) ☁️' : 'Postgres Local 🏠'}`);
    }
});

pool.on('error', (err, client) => {
    console.error('❌ Erro inesperado no cliente do PostgreSQL', err);
    process.exit(-1);
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};