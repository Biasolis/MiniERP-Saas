const { Pool } = require('pg');
require('dotenv').config();

let connectionString = process.env.DATABASE_URL;

// --- GARANTIA DE SSL ---
// Se for NeonDB e não tiver 'sslmode' na string, adicionamos.
// Isso ajuda a forçar a negociação segura imediatamente.
if (connectionString && connectionString.includes('neon.tech') && !connectionString.includes('sslmode')) {
    connectionString += '?sslmode=require';
}

console.log('🔌 Tentando conectar em:', connectionString ? connectionString.split('@')[1] : 'URL não definida');

const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false, // Aceita o certificado do Neon
  },
  connectionTimeoutMillis: 10000, // Reduzi para 10s para falhar mais rápido se for bloqueio
});

// --- TESTE DE CONEXÃO IMEDIATO (DIAGNÓSTICO) ---
pool.connect()
    .then(client => {
        console.log('✅ CONEXÃO COM O BANCO BEM SUCEDIDA!');
        return client.query('SELECT NOW()')
            .then(res => {
                console.log('⏰ Hora no Banco:', res.rows[0].now);
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
        console.error('------------------------------------------------');
        console.error('DICA: Se você estiver em uma rede corporativa/VPN,');
        console.error('a porta 5432 (PostgreSQL) pode estar bloqueada.');
        console.error('Tente rotear a internet pelo 4G do celular para testar.');
        console.error('------------------------------------------------\n');
    });

// Listener de erros (evita crash)
pool.on('error', (err) => {
  console.error('❌ Erro inesperado no pool:', err.message);
});

const query = async (text, params) => {
  const start = Date.now();
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