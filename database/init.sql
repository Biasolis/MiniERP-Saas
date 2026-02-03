-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. ESTRUTURA CORE (Tenants & Users)
-- ==========================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#ffffff',
    
    -- Configurações de Plano e Limites
    plan_tier VARCHAR(50) DEFAULT 'basic',
    max_users INTEGER DEFAULT 5,
    ai_usage_limit INTEGER DEFAULT 100,
    ai_usage_current INTEGER DEFAULT 0,
    
    -- Dados Cadastrais e Contato
    document VARCHAR(50), -- CNPJ/CPF
    phone VARCHAR(50),
    email_contact VARCHAR(100),
    address VARCHAR(255),
    website VARCHAR(255),
    
    -- Configurações de Mensagens
    footer_message TEXT DEFAULT 'Obrigado pela preferência!',
    os_observation_message TEXT DEFAULT '',
    os_warranty_terms TEXT DEFAULT 'Garantia de 90 dias.',
    closing_day INTEGER DEFAULT 1,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- 'super_admin', 'admin', 'agent'
    is_super_admin BOOLEAN DEFAULT FALSE,
    avatar_path TEXT,
    reset_token TEXT,
    reset_expires TIMESTAMP,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
);

-- ==========================================
-- 2. CADASTROS BÁSICOS (SERIAL/INTEIRO)
-- ==========================================

-- Categorias Financeiras (CORRIGIDO PARA SERIAL)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clientes
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    document VARCHAR(50),
    type VARCHAR(20) DEFAULT 'client',
    status VARCHAR(20) DEFAULT 'lead', -- lead, active, inactive
    source VARCHAR(50),
    
    -- Endereço
    zip_code VARCHAR(10),
    address VARCHAR(255),
    street VARCHAR(150),
    number VARCHAR(20),
    complement VARCHAR(100),
    neighborhood VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(2),
    
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    cnpj_cpf VARCHAR(20),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Produtos
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(50),
    category VARCHAR(50),
    type VARCHAR(20) DEFAULT 'product', -- product, service
    sale_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit VARCHAR(10) DEFAULT 'un',
    commission_rate DECIMAL(5,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 3. FINANCEIRO E OPERACIONAL
-- ==========================================

-- Transações Financeiras
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL, -- CORRIGIDO PARA INTEGER
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    cost_type VARCHAR(20) CHECK (cost_type IN ('fixed', 'variable')),
    status VARCHAR(20) DEFAULT 'completed',
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    installment_index INTEGER DEFAULT 1,
    installments_total INTEGER DEFAULT 1,
    attachment_path TEXT,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ordens de Serviço (OS)
CREATE TABLE IF NOT EXISTS service_orders (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES users(id),
    
    client_name VARCHAR(255), -- Snapshot
    equipment VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    
    -- Financeiro OS
    total_parts DECIMAL(10,2) DEFAULT 0.00,
    total_services DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    price NUMERIC(10, 2) DEFAULT 0.00, -- Legado
    
    -- Campos Personalizados Fixos (Legado/Compatibilidade)
    identifier VARCHAR(50), 
    mileage VARCHAR(50),
    brand VARCHAR(100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Itens da OS
CREATE TABLE IF NOT EXISTS service_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    service_order_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    description VARCHAR(255),
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. VENDAS E PDV
-- ==========================================

-- Sessões de Caixa (PDV)
CREATE TABLE IF NOT EXISTS pos_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'open',
    opened_at TIMESTAMP DEFAULT NOW(),
    closed_at TIMESTAMP,
    notes TEXT
);

-- Movimentações de Caixa
CREATE TABLE IF NOT EXISTS pos_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES pos_sessions(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'supply', 'bleed'
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Vendas
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    seller_id UUID REFERENCES users(id),
    client_id INTEGER REFERENCES clients(id),
    pos_session_id UUID REFERENCES pos_sessions(id),
    
    total_amount DECIMAL(10,2) NOT NULL,
    discount DECIMAL(10,2) DEFAULT 0,
    amount_paid DECIMAL(10,2) DEFAULT 0,
    change_amount DECIMAL(10,2) DEFAULT 0,
    payment_method VARCHAR(50) DEFAULT 'cash',
    status VARCHAR(20) DEFAULT 'completed',
    notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Itens da Venda
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0
);

-- ==========================================
-- 5. RECURSOS HUMANOS (RH)
-- ==========================================

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    manager_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    base_salary DECIMAL(10, 2) DEFAULT 0.00,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    cpf VARCHAR(20),
    admission_date DATE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    salary DECIMAL(10, 2),
    work_hours_daily DECIMAL(4,2) DEFAULT 8.00,
    status VARCHAR(50) DEFAULT 'active',
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    record_type VARCHAR(20) NOT NULL, -- entry, lunch_out, lunch_in, exit
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location_coords VARCHAR(100),
    ip_address VARCHAR(50),
    manual_entry BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 6. HELPDESK & TICKETS
-- ==========================================

CREATE TABLE IF NOT EXISTS helpdesk_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    portal_title VARCHAR(100) DEFAULT 'Central de Ajuda',
    primary_color VARCHAR(20) DEFAULT '#4f46e5',
    logo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clientes do Helpdesk
CREATE TABLE IF NOT EXISTS support_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL, -- CORRIGIDO PARA INTEGER
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS ticket_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number BIGSERIAL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    category_id UUID REFERENCES ticket_categories(id),
    
    requester_type VARCHAR(20) NOT NULL, -- 'employee', 'support_user', 'user'
    requester_id UUID NOT NULL,
    assigned_agent_id UUID REFERENCES users(id),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL,
    sender_id UUID NOT NULL,
    message TEXT NOT NULL,
    is_internal_note BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. UTILITÁRIOS (Logs, Tasks, Configs)
-- ==========================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo',
    priority VARCHAR(20) DEFAULT 'normal',
    due_date TIMESTAMP WITH TIME ZONE,
    assigned_to UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    type VARCHAR(20) DEFAULT 'text',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id TEXT,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(20) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    interaction_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 8. ÍNDICES DE PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_tenant ON service_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tickets_tenant ON tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON employees(tenant_id);

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Adiciona colunas faltantes na tabela helpdesk_config
ALTER TABLE helpdesk_config
ADD COLUMN IF NOT EXISTS support_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS auto_assign BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_guest_tickets BOOLEAN DEFAULT FALSE;

-- Garante que a tabela de categorias tenha o campo de SLA (caso também falte)
ALTER TABLE ticket_categories
ADD COLUMN IF NOT EXISTS sla_hours INTEGER DEFAULT 24;

-- 1. Tabela de Logs de Auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER, -- Tenta capturar se disponível na linha
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
    record_id TEXT, -- ID do registro afetado
    old_data JSONB, -- Dados antes da alteração
    new_data JSONB, -- Dados depois da alteração
    changed_by TEXT, -- Usuário do banco ou aplicação (se passado via variavel de sessão)
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Função Genérica do Trigger
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
    rec_id TEXT;
    old_val JSONB := NULL;
    new_val JSONB := NULL;
    op TEXT := TG_OP;
    tenant INTEGER := NULL;
    app_user TEXT := NULL;
BEGIN
    -- Tenta capturar o ID do registro (assume que a PK é 'id')
    IF TG_OP = 'DELETE' THEN
        rec_id := OLD.id::TEXT;
        old_val := to_jsonb(OLD);
        -- Tenta pegar tenant_id se existir na tabela
        BEGIN 
            tenant := OLD.tenant_id; 
        EXCEPTION WHEN OTHERS THEN 
            tenant := NULL; 
        END;
    ELSE
        rec_id := NEW.id::TEXT;
        new_val := to_jsonb(NEW);
        
        IF TG_OP = 'UPDATE' THEN
            old_val := to_jsonb(OLD);
        END IF;

        -- Tenta pegar tenant_id se existir na tabela
        BEGIN 
            tenant := NEW.tenant_id; 
        EXCEPTION WHEN OTHERS THEN 
            tenant := NULL; 
        END;
    END IF;

    -- Tenta capturar o usuário da aplicação se foi setado via "SET app.current_user = '...'"
    -- Se não, pega o usuário do banco (ex: postgres)
    BEGIN
        app_user := current_setting('app.current_user');
    EXCEPTION WHEN OTHERS THEN
        app_user := session_user;
    END;

    -- Insere o Log
    INSERT INTO audit_logs (
        tenant_id, 
        table_name, 
        operation, 
        record_id, 
        old_data, 
        new_data, 
        changed_by
    ) VALUES (
        tenant,
        TG_TABLE_NAME,
        op,
        rec_id,
        old_val,
        new_val,
        app_user
    );

    RETURN NULL; -- Trigger AFTER não precisa retornar o registro
END;
$$ LANGUAGE plpgsql;

-- 3. Script para aplicar o Trigger em TODAS as tabelas automaticamente
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name != 'audit_logs' -- Não audita a própria tabela de log
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', t);
        EXECUTE format('CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()', t);
    END LOOP;
END;
$$;

-- Adiciona a coluna 'operation' (INSERT, UPDATE, DELETE)
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS operation TEXT;

-- Adiciona outras colunas essenciais que também podem estar faltando
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS record_id TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS changed_by TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS table_name TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS tenant_id INTEGER;

-- (Opcional) Se a coluna 'action' existir (legado), renomeia ou remove para não confundir
-- ALTER TABLE audit_logs DROP COLUMN IF EXISTS action;