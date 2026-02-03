const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;

// --- GARANTIA DE SSL ---
if (connectionString && connectionString.includes('neon.tech') && !connectionString.includes('sslmode')) {
    connectionString += '?sslmode=require';
}

console.log('🔌 Tentando conectar em:', connectionString ? connectionString.split('@')[1] : 'URL não definida');

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 10000,
  // --- CORREÇÃO DEFINITIVA DE TIMEZONE ---
  // Isso força qualquer conexão deste pool a usar o fuso de SP nativamente
  options: '-c timezone=America/Sao_Paulo' 
});

// --- TESTE DE CONEXÃO IMEDIATO ---
pool.connect()
    .then(client => {
        console.log('✅ CONEXÃO COM O BANCO BEM SUCEDIDA!');
        // Testamos o NOW() para ver se o Timezone pegou
        return client.query('SELECT NOW()')
            .then(res => {
                // Deve mostrar o horário -03:00
                console.log('⏰ Hora no Banco (Brasília):', res.rows[0].now);
                client.release();
            })
            .catch(e => {
                console.error('❌ Erro no teste de query:', e.message);
                client.release();
            });
    })
    .catch(err => {
        console.error('\n🔴 FALHA CRÍTICA DE CONEXÃO:');
        console.error(err.message);
    });

// Listener de erros
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool:', err.message);
});

const query = async (text, params) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (error) {
    console.error('❌ Erro na query:', { text, error: error.message });
    throw error;
  }
};

module.exports = {
  query,
  pool,
};