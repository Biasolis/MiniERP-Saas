const { pool } = require('./db'); // Certifique-se que o caminho está correto
require('dotenv').config();

const setup = async () => {
    const client = await pool.connect();
    try {
        console.log("🔄 Iniciando sincronização do Banco de Dados com init.sql...");

        // 1. Habilitar extensão UUID (Fundamental para o seu SQL)
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // ==========================================
        // 1. TENANTS (Empresas) - UUID
        // ==========================================
        console.log("📦 Verificando tabela: Tenants...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS tenants (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                logo_url TEXT,
                primary_color VARCHAR(7) DEFAULT '#000000',
                secondary_color VARCHAR(7) DEFAULT '#ffffff',
                plan_tier VARCHAR(50) DEFAULT 'basic',
                ai_usage_limit INTEGER DEFAULT 100,
                ai_usage_current INTEGER DEFAULT 0,
                active BOOLEAN DEFAULT TRUE,
                max_users INTEGER DEFAULT 5,
                closing_day INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 2. USERS (Usuários) - UUID
        // ==========================================
        console.log("👤 Verificando tabela: Users...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                is_super_admin BOOLEAN DEFAULT FALSE,
                avatar_path TEXT,
                reset_token TEXT,
                reset_expires TIMESTAMP,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
            );
        `);

        // ==========================================
        // 3. CATEGORIES (Categorias) - UUID
        // ==========================================
        console.log("🗂️ Verificando tabela: Categories...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                type VARCHAR(20) CHECK (type IN ('income', 'expense')),
                color VARCHAR(7),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 4. CLIENTS (Clientes) - SERIAL (Mantido do seu SQL)
        // ==========================================
        console.log("🤝 Verificando tabela: Clients...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS clients (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(50),
                document VARCHAR(50),
                address TEXT,
                type VARCHAR(20) DEFAULT 'client',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 5. TRANSACTIONS (Transações) - UUID
        // ==========================================
        console.log("💰 Verificando tabela: Transactions...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS transactions (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
                client_id INTEGER REFERENCES clients(id),
                description TEXT NOT NULL,
                amount NUMERIC(15, 2) NOT NULL,
                type VARCHAR(20) CHECK (type IN ('income', 'expense')),
                cost_type VARCHAR(20) CHECK (cost_type IN ('fixed', 'variable')),
                status VARCHAR(20) DEFAULT 'completed',
                date TIMESTAMP WITH TIME ZONE NOT NULL,
                attachment_path TEXT,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 6. AI LOGS (Gemini) - UUID
        // ==========================================
        console.log("🤖 Verificando tabela: AI Logs...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS ai_logs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id),
                prompt_tokens INTEGER,
                completion_tokens INTEGER,
                interaction_type VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 7. PLANS (Planos) - SERIAL
        // ==========================================
        console.log("💎 Verificando tabela: Plans...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS plans (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                max_users INTEGER DEFAULT 5,
                ai_usage_limit INTEGER DEFAULT 100,
                price NUMERIC(10, 2) DEFAULT 0.00,
                active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // Seed de Planos
        await client.query(`
            INSERT INTO plans (name, max_users, ai_usage_limit, price) VALUES 
            ('Start', 3, 50, 49.90),
            ('Pro', 10, 500, 149.90),
            ('Business', 50, 2000, 399.90)
            ON CONFLICT (name) DO NOTHING;
        `);

        // ==========================================
        // 8. PRODUCTS (Produtos) - SERIAL
        // ==========================================
        console.log("📦 Verificando tabela: Products...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                sale_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
                cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
                stock INTEGER NOT NULL DEFAULT 0,
                min_stock INTEGER DEFAULT 5,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 9. SERVICE ORDERS (OS) - SERIAL
        // ==========================================
        console.log("🛠️ Verificando tabela: Service Orders...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS service_orders (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                client_id INTEGER REFERENCES clients(id),
                client_name VARCHAR(255) NOT NULL,
                equipment VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(50) DEFAULT 'open',
                priority VARCHAR(20) DEFAULT 'normal',
                price NUMERIC(10, 2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 10. RECURRING (Recorrência) - SERIAL
        // ==========================================
        console.log("🔄 Verificando tabela: Recurring Transactions...");
        // OBS: category_id alterado para UUID para bater com a tabela categories
        await client.query(`
            CREATE TABLE IF NOT EXISTS recurring_transactions (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                description VARCHAR(255) NOT NULL,
                amount NUMERIC(10, 2) NOT NULL,
                type VARCHAR(20) NOT NULL,
                frequency VARCHAR(20) DEFAULT 'monthly',
                start_date DATE NOT NULL,
                next_run DATE NOT NULL,
                active BOOLEAN DEFAULT true,
                category_id UUID, 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 11. AUDIT & NOTIFICATIONS
        // ==========================================
        console.log("🛡️ Verificando tabelas de Sistema...");
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id),
                action VARCHAR(50) NOT NULL,
                entity VARCHAR(50) NOT NULL,
                entity_id INTEGER, 
                details TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT,
                type VARCHAR(20) DEFAULT 'info',
                is_read BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // ==========================================
        // 12. ÍNDICES (Performance)
        // ==========================================
        console.log("🚀 Criando índices...");
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);`);

        console.log("✅ Banco de Dados sincronizado com sucesso!");

    } catch (error) {
        console.error("❌ Erro ao configurar banco:", error);
    } finally {
        client.release();
        process.exit();
    }
};

setup();