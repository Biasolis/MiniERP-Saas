const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL não definida.');
    process.exit(1);
}

// Detecção inteligente: Se a URL tiver "sslmode=disable", desliga o SSL.
const disableSSL = connectionString.includes('sslmode=disable');

const pool = new Pool({
    connectionString,
    ssl: disableSSL ? false : { rejectUnauthorized: false }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool
};