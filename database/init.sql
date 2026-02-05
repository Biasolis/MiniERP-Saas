-- ====================================================================
-- MINI ERP - INIT.SQL (CONSOLIDADO E CORRIGIDO - FEV/2026)
-- ====================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 2. CORE (Tenants, Users, Plans)
-- ==========================================

CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    max_users INTEGER,
    ai_usage_limit INTEGER DEFAULT 100,
    max_disk_space_mb INTEGER,
    features JSONB DEFAULT '{}',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#000000',
    secondary_color VARCHAR(7) DEFAULT '#ffffff',
    plan_tier VARCHAR(50) DEFAULT 'basic',
    max_users INTEGER DEFAULT 5,
    ai_usage_limit INTEGER DEFAULT 100,
    ai_usage_current INTEGER DEFAULT 0,
    document VARCHAR(50),
    phone VARCHAR(50),
    email_contact VARCHAR(100),
    address VARCHAR(255),
    website VARCHAR(255),
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
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'vendedor', 'caixa', 'producao', 'financeiro', 'rh', 'suporte', 'agent')),
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
-- 3. CADASTROS BÁSICOS (IDs Inteiros)
-- ==========================================

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(50),
    document VARCHAR(50),
    type VARCHAR(20) DEFAULT 'client',
    status VARCHAR(20) DEFAULT 'lead',
    source VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    cnpj_cpf VARCHAR(20),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(50),
    barcode VARCHAR(100),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    category VARCHAR(100),
    type VARCHAR(20) DEFAULT 'product',
    sale_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER DEFAULT 5,
    unit VARCHAR(10) DEFAULT 'un',
    commission_rate DECIMAL(5,2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- ==========================================
-- 4. FINANCEIRO E OPERACIONAL
-- ==========================================

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
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

CREATE TABLE IF NOT EXISTS recurring_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    frequency VARCHAR(20) DEFAULT 'monthly' CHECK (frequency IN ('weekly', 'monthly', 'yearly')),
    start_date DATE NOT NULL,
    next_run DATE NOT NULL,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_orders (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id),
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    technician_id UUID REFERENCES users(id),
    client_name VARCHAR(255),
    equipment VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    notes TEXT,
    total_parts DECIMAL(10,2) DEFAULT 0.00,
    total_services DECIMAL(10,2) DEFAULT 0.00,
    discount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount NUMERIC(10, 2) DEFAULT 0.00,
    identifier VARCHAR(50), 
    mileage VARCHAR(50),
    brand VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

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
-- 5. VENDAS, ESTOQUE E PDV
-- ==========================================

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

CREATE TABLE IF NOT EXISTS pos_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES pos_sessions(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

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

CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'rejected')),
    total_amount NUMERIC(10,2) DEFAULT 0,
    valid_until DATE,
    description TEXT,
    items JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('in', 'out', 'adjustment')),
    quantity NUMERIC(10,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS product_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id),
    invoice_number VARCHAR(50),
    entry_date TIMESTAMP DEFAULT NOW(),
    total_amount NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_entry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_id UUID NOT NULL REFERENCES product_entries(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity NUMERIC(10,2) NOT NULL,
    cost_price NUMERIC(10,2) DEFAULT 0,
    total NUMERIC(10,2) DEFAULT 0
);

-- ==========================================
-- 6. RECURSOS HUMANOS (RH) - IDs UUID
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

-- Folha de Pagamento (NOVA)
CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    reference_date DATE NOT NULL,
    base_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_additions NUMERIC(10,2) DEFAULT 0,
    total_deductions NUMERIC(10,2) DEFAULT 0,
    net_salary NUMERIC(10,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'draft',
    payment_date DATE,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_openings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_opening_id UUID REFERENCES job_openings(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100),
    phone VARCHAR(20),
    resume_link TEXT,
    status VARCHAR(20) DEFAULT 'applied',
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS terminations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    termination_date DATE NOT NULL,
    reason TEXT,
    type VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_private BOOLEAN DEFAULT FALSE,
    fields JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS time_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    record_type VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    location_coords VARCHAR(100),
    ip_address VARCHAR(50),
    manual_entry BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 7. CRM E PROJETOS
-- ==========================================

CREATE TABLE IF NOT EXISTS client_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'active',
    budget NUMERIC(10,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS client_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(50) DEFAULT 'note',
    description TEXT,
    date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- ==========================================
-- 8. PCP E AGENDA
-- ==========================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    color VARCHAR(50) DEFAULT '#3788d8',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pcp_cost_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(50),
    default_value NUMERIC(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pcp_production_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity NUMERIC(10,2) NOT NULL,
    due_date DATE,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'planned',
    total_raw_material NUMERIC(15,2) DEFAULT 0,
    total_operation_cost NUMERIC(15,2) DEFAULT 0,
    total_cost NUMERIC(15,2) DEFAULT 0,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pcp_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_order_id UUID NOT NULL REFERENCES pcp_production_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity NUMERIC(10,2) NOT NULL,
    unit_cost NUMERIC(15,2) DEFAULT 0,
    subtotal NUMERIC(15,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pcp_order_costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    production_order_id UUID NOT NULL REFERENCES pcp_production_orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES pcp_cost_drivers(id),
    name VARCHAR(100),
    value NUMERIC(15,2) DEFAULT 0
);

-- ==========================================
-- 9. HELPDESK
-- ==========================================

CREATE TABLE IF NOT EXISTS helpdesk_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    slug VARCHAR(50) NOT NULL UNIQUE,
    portal_title VARCHAR(100) DEFAULT 'Central de Ajuda',
    primary_color VARCHAR(20) DEFAULT '#4f46e5',
    logo_url TEXT,
    support_email VARCHAR(255),
    auto_assign BOOLEAN DEFAULT FALSE,
    allow_guest_tickets BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_helpdesk_tenant UNIQUE (tenant_id)
);

CREATE TABLE IF NOT EXISTS support_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, email)
);

CREATE TABLE IF NOT EXISTS ticket_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    sla_hours INTEGER DEFAULT 24,
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
    requester_type VARCHAR(20) NOT NULL,
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
-- 10. UTILITÁRIOS E AUDITORIA BLINDADA
-- ==========================================

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(20) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Auditoria com IDs em TEXTO
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    record_id TEXT,
    old_data JSONB,
    new_data JSONB,
    changed_by TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Função de Trigger Segura
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
    rec_id TEXT;
    old_val JSONB := NULL;
    new_val JSONB := NULL;
    op TEXT := TG_OP;
    tenant TEXT := NULL;
    app_user TEXT := NULL;
BEGIN
    IF TG_OP = 'DELETE' THEN
        rec_id := OLD.id::TEXT;
        old_val := to_jsonb(OLD);
        BEGIN tenant := OLD.tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN tenant := NULL; END;
    ELSE
        rec_id := NEW.id::TEXT;
        new_val := to_jsonb(NEW);
        IF TG_OP = 'UPDATE' THEN old_val := to_jsonb(OLD); END IF;
        BEGIN tenant := NEW.tenant_id::TEXT; EXCEPTION WHEN OTHERS THEN tenant := NULL; END;
    END IF;

    BEGIN app_user := current_setting('app.current_user'); EXCEPTION WHEN OTHERS THEN app_user := session_user; END;

    INSERT INTO audit_logs (tenant_id, table_name, operation, record_id, old_data, new_data, changed_by)
    VALUES (tenant, TG_TABLE_NAME, op, rec_id, old_val, new_val, app_user);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para bloquear movimentação de estoque de Serviços
CREATE OR REPLACE FUNCTION check_service_stock_movement() RETURNS TRIGGER AS $$
DECLARE product_type VARCHAR;
BEGIN
    SELECT type INTO product_type FROM products WHERE id = NEW.product_id;
    IF product_type = 'service' THEN
        RAISE EXCEPTION 'Não é permitido movimentar estoque de Serviços.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_block_service_stock ON inventory_movements;
CREATE TRIGGER trg_block_service_stock BEFORE INSERT ON inventory_movements FOR EACH ROW EXECUTE FUNCTION check_service_stock_movement();

-- Aplicação Automática da Auditoria em Todas as Tabelas
DO $$
DECLARE t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name != 'audit_logs' LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', t);
        EXECUTE format('CREATE TRIGGER audit_trigger AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_trigger_function()', t);
    END LOOP;
END;
$$;