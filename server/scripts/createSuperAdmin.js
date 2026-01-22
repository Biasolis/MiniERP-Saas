// server/scripts/createSuperAdmin.js
const bcrypt = require('bcrypt');
const db = require('../src/config/db');
require('dotenv').config(); // Garante que lê o .env da raiz ou pasta server

async function createSuperAdmin() {
    const client = await db.pool.connect();
    
    try {
        console.log('🚀 Iniciando criação do Super Admin...');
        await client.query('BEGIN');

        // 1. Dados do Super Admin
        const adminData = {
            email: process.env.ADMIN_EMAIL || 'admin@saas.com',
            password: process.env.ADMIN_PASSWORD || 'admin123', // Altere no .env!
            name: 'Super Administrator',
            cpf: '00000000000' // CPF fictício de sistema
        };

        // 2. Verifica se já existe
        const checkUser = await client.query('SELECT id FROM users WHERE email = $1', [adminData.email]);
        if (checkUser.rows.length > 0) {
            console.log('⚠️  Super Admin já existe. Abortando.');
            await client.query('ROLLBACK');
            return;
        }

        // 3. Cria a Empresa "Host" (Dona do SaaS)
        const companyRes = await client.query(`
            INSERT INTO companies (trade_name, legal_name, document, plan_tier, is_active)
            VALUES ($1, $2, $3, 'UNLIMITED', true)
            RETURNING id`,
            ['SaaS Host', 'SaaS System Admin', '00000000000000']
        );
        const companyId = companyRes.rows[0].id;
        console.log(`✅ Empresa Host criada: ${companyId}`);

        // 4. Cria o Usuário Super Admin
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(adminData.password, salt);

        await client.query(`
            INSERT INTO users (company_id, name, email, password_hash, cpf, role, is_active)
            VALUES ($1, $2, $3, $4, $5, 'SUPER_ADMIN', true)`,
            [companyId, adminData.name, adminData.email, passwordHash, adminData.cpf]
        );
        console.log(`✅ Usuário Super Admin criado: ${adminData.email}`);

        await client.query('COMMIT');
        console.log('🏁 Configuração concluída com sucesso!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Erro ao criar Super Admin:', error);
    } finally {
        client.release();
        // Encerra o pool para finalizar o script
        await db.pool.end(); 
    }
}

createSuperAdmin();