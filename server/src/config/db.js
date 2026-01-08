const { Pool } = require('pg');
require('dotenv').config();

// Verifica se estamos em produção ou dev para ajustar configurações SSL se necessário
const isProduction = process.env.NODE_ENV === 'production';

// Pega a string de conexão do .env
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('❌ ERRO CRÍTICO: DATABASE_URL não definida no arquivo .env');
    console.error('   Certifique-se de criar o arquivo .server/.env com a string de conexão do NeonDB.');
    process.exit(1);
}

const pool = new Pool({
    connectionString,
    // O NeonDB EXIGE SSL. 
    // rejectUnauthorized: false é necessário em muitos ambientes de dev/container
    // para aceitar o certificado do Neon sem configuração de CA local.
    ssl: {
        rejectUnauthorized: false 
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