-- Habilita extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. TABELA DE TENANTS (EMPRESAS/CLIENTES)
-- ==========================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL, -- Para identificar a empresa na URL ou Login
    logo_url TEXT,
    primary_color VARCHAR(7) DEFAULT '#000000', -- Configuração White-label
    secondary_color VARCHAR(7) DEFAULT '#ffffff', -- Configuração White-label
    plan_tier VARCHAR(50) DEFAULT 'basic', -- 'basic', 'pro', 'enterprise'
    ai_usage_limit INTEGER DEFAULT 100, -- Limite de requisições ao Gemini
    ai_usage_current INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 2. TABELA DE USUÁRIOS
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- Isolamento
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- 'super_admin', 'admin', 'viewer'
    is_super_admin BOOLEAN DEFAULT FALSE, -- Acesso global
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email) -- Email único por empresa
);

-- ==========================================
-- 3. TABELA DE CATEGORIAS FINANCEIRAS
-- ==========================================
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 4. TABELA DE TRANSAÇÕES (Financeiro)
-- ==========================================
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL, -- Suporte a grandes valores
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    cost_type VARCHAR(20) CHECK (cost_type IN ('fixed', 'variable')), -- Fixo ou Variável
    status VARCHAR(20) DEFAULT 'completed', -- 'pending', 'completed'
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- ==========================================
-- 5. TABELA DE LOGS DE IA (Gemini)
-- ==========================================
CREATE TABLE IF NOT EXISTS ai_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    interaction_type VARCHAR(100), -- 'financial_analysis', 'categorization'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para Performance (Extremamente Importante para SQL Puro)
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_categories_tenant ON categories(tenant_id);

-- 1. Adiciona configuração de fechamento na empresa
ALTER TABLE tenants ADD COLUMN closing_day INTEGER DEFAULT 1;

-- 2. Garante que a coluna status existe (caso não tenha criado)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'completed';

-- 3. Preenche transações antigas que podem estar com status NULL (Isso corrige o "não aparece nada")
UPDATE transactions SET status = 'completed' WHERE status IS NULL;

CREATE TABLE IF NOT EXISTS service_orders (
  id SERIAL PRIMARY KEY,
  -- AQUI ESTAVA O ERRO: Mudamos de INTEGER para UUID para bater com a tabela tenants
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_name VARCHAR(255) NOT NULL,
  equipment VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'open', -- open, in_progress, waiting, completed
  priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high
  price NUMERIC(10, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  document VARCHAR(50), -- CPF ou CNPJ
  address TEXT,
  type VARCHAR(20) DEFAULT 'client', -- client, supplier, both
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Opcional: Adicionar coluna client_id na tabela service_orders para vincular futuramente
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);

-- Tabela para guardar os modelos de recorrência
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  type VARCHAR(20) NOT NULL, -- income, expense
  frequency VARCHAR(20) DEFAULT 'monthly', -- monthly, weekly, yearly
  start_date DATE NOT NULL,
  next_run DATE NOT NULL, -- A data que deve gerar a próxima transação
  active BOOLEAN DEFAULT true,
  category_id INTEGER, -- Opcional: vincular categoria
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adiciona a coluna client_id nas transações para saber QUEM pagou/recebeu
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(id);

-- Índice para melhorar a performance dos relatórios
CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  sale_price NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Preço de Venda
  cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0, -- Preço de Custo (para calcular lucro futuro)
  stock INTEGER NOT NULL DEFAULT 0,             -- Quantidade Atual
  min_stock INTEGER DEFAULT 5,                  -- Ponto de Pedido (Alerta)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 1. Tabela de Auditoria (Rastreabilidade)
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id), -- CORREÇÃO: Alterado de INTEGER para UUID
  action VARCHAR(50) NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN
  entity VARCHAR(50) NOT NULL, -- TRANSACTION, PRODUCT, SERVICE_ORDER
  entity_id INTEGER,           -- ID do item afetado (Assume que produtos/transações usam ID numérico)
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Notificações
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  type VARCHAR(20) DEFAULT 'info', -- info, warning, success, error
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;

-- Tabela de Planos (Modelos)
CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE, -- Ex: 'Basic', 'Gold', 'Diamond'
  max_users INTEGER DEFAULT 5,
  ai_usage_limit INTEGER DEFAULT 100,
  price NUMERIC(10, 2) DEFAULT 0.00,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir alguns planos padrão para começar
INSERT INTO plans (name, max_users, ai_usage_limit, price) VALUES 
('Start', 3, 50, 49.90),
('Pro', 10, 500, 149.90),
('Business', 50, 2000, 399.90)
ON CONFLICT DO NOTHING;

-- Adiciona coluna de anexo nas transações
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS attachment_path TEXT;

-- Adiciona coluna de avatar na tabela de usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_path TEXT;

-- Adiciona colunas para recuperação de senha
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP;

-- 1. Tabela de Tarefas (Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'todo', -- 'todo', 'in_progress', 'done'
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high'
    due_date TIMESTAMP WITH TIME ZONE, -- Se tiver data, aparece na agenda
    assigned_to UUID REFERENCES users(id), -- Quem vai fazer
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Eventos Manuais da Agenda (Calendar Events)
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    color VARCHAR(20) DEFAULT '#3b82f6', -- Azul padrão
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON calendar_events(start_date, end_date);

-- 1. Melhorar Tabela de Clientes (Mais dados para CRM e NFE)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'lead'; -- 'lead', 'active', 'inactive', 'churned'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source VARCHAR(50); -- 'google', 'instagram', 'indication', 'other'
ALTER TABLE clients ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(2);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT; -- Notas gerais fixas

-- 2. Tabela de Interações (Timeline do CRM)
CREATE TABLE IF NOT EXISTS client_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id), -- Quem registrou (vendedor)
    type VARCHAR(20) NOT NULL, -- 'call', 'meeting', 'email', 'whatsapp', 'note'
    description TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_interactions_client ON client_interactions(client_id);

-- 1. Melhorar Tabela de Produtos
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku VARCHAR(50); -- Código único
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock INTEGER DEFAULT 5; -- Estoque mínimo para alerta
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(10) DEFAULT 'un'; -- un, kg, lt, m
ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR(50); -- Categoria do produto

-- 2. Tabela de Movimentações de Estoque (Histórico)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL, -- 'in' (entrada), 'out' (saída)
    quantity INTEGER NOT NULL,
    reason VARCHAR(50), -- 'purchase', 'sale', 'adjustment', 'return'
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_movements(product_id);

-- 1. Melhorar Tabela de OS (Campos Financeiros e Técnicos)
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS technician_id UUID REFERENCES users(id); -- Quem fez
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS notes TEXT; -- Observações internas
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- 2. Tabela de Itens da OS (Produtos/Serviços usados)
CREATE TABLE IF NOT EXISTS service_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    service_order_id INTEGER REFERENCES service_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    description VARCHAR(255), -- Caso seja um item avulso ou nome do produto
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_os_items_order ON service_order_items(service_order_id);

-- 1. Melhorar Tabela de Tenants (Dados da Empresa para Impressão)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS document VARCHAR(50); -- CNPJ
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_contact VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS footer_message TEXT DEFAULT 'Obrigado pela preferência!';

-- 2. Melhorar Tabela de OS (Campos Específicos da Imagem)
-- identifier = Placa, Serial ou Patrimônio
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS identifier VARCHAR(50); 
-- mileage = KM ou Medidor
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS mileage VARCHAR(50);
-- brand = Marca/Modelo
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS brand VARCHAR(100);

-- 1. Tabela de Definição dos Campos (O que a empresa quer cobrar)
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL, -- 'service_order', 'sale', 'client'
    label VARCHAR(100) NOT NULL, -- Ex: 'Placa', 'IMEI', 'Modelo'
    type VARCHAR(20) DEFAULT 'text', -- 'text', 'number', 'date'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Valores (O dado preenchido na OS)
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL, -- ID da OS ou Venda
    entity_type VARCHAR(50) NOT NULL, -- 'service_order'
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_custom_def_tenant ON custom_field_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_val_entity ON custom_field_values(entity_id, entity_type);

-- Opcional: Se quiser limpar os campos fixos criados anteriormente
ALTER TABLE service_orders DROP COLUMN identifier;
ALTER TABLE service_orders DROP COLUMN mileage;
ALTER TABLE service_orders DROP COLUMN brand;

-- TABELA DE DEFINIÇÃO DE CAMPOS (Configuração da Empresa)
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL, -- 'service_order'
    label VARCHAR(100) NOT NULL, -- 'Placa', 'KM', 'Modelo'
    type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TABELA DE VALORES (Dados salvos na OS)
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL, -- ID da OS
    entity_type VARCHAR(50) NOT NULL, -- 'service_order'
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1. Tabela de Definição dos Campos (Ex: Placa, KM, Marca)
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL, -- 'service_order'
    label VARCHAR(100) NOT NULL, 
    type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Valores (O dado preenchido na OS: 'ABC-1234')
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL, -- ID da OS
    entity_type VARCHAR(50) NOT NULL, -- 'service_order'
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_custom_def_tenant ON custom_field_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_val_entity ON custom_field_values(entity_id, entity_type);

-- 1. Melhorar Tabela de Tenants (Dados da Empresa para Impressão)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS document VARCHAR(50); -- CNPJ
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_contact VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS footer_message TEXT DEFAULT 'Obrigado pela preferência!';

-- 2. Tabela de Definição dos Campos Personalizados (Ex: Placa, KM)
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module VARCHAR(50) NOT NULL, -- 'service_order'
    label VARCHAR(100) NOT NULL, 
    type VARCHAR(20) DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Valores (O dado preenchido na OS)
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    field_definition_id UUID REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
    entity_id INTEGER NOT NULL, -- ID da OS
    entity_type VARCHAR(50) NOT NULL, -- 'service_order'
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_custom_def_tenant ON custom_field_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_val_entity ON custom_field_values(entity_id, entity_type);

-- Índices para acelerar o Dashboard
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_service_orders_created_at ON service_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);

-- Adiciona a coluna de tipo (padrão 'product' para os já existentes)
ALTER TABLE products ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'product';

-- Garante que serviços não tenham estoque negativo ou estranho (opcional, apenas limpeza)
UPDATE products SET stock = 0 WHERE type = 'service';

-- Garante que a coluna type existe
ALTER TABLE products ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'product';

-- 1. Atualizar Tabela de Usuários (Taxa padrão do vendedor)
ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'admin'; -- Garantir coluna role

-- 2. Atualizar Tabela de Produtos (Taxa específica do produto - sobrepõe a do vendedor)
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT NULL;

-- 3. Tabela de Vendas (Header)
CREATE TABLE IF NOT EXISTS sales (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    seller_id UUID REFERENCES users(id), -- Quem vendeu
    client_id INTEGER REFERENCES clients(id), -- Opcional (venda balcão)
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'completed', -- completed, cancelled
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Itens da Venda
CREATE TABLE IF NOT EXISTS sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0 -- Valor da comissão gerada por ESTE item
);

-- 5. Controle de Comissões (Extrato)
CREATE TABLE IF NOT EXISTS commissions (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    seller_id UUID REFERENCES users(id),
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL, -- Total da comissão da venda
    status VARCHAR(20) DEFAULT 'pending', -- pending (pendente), paid (paga)
    created_at TIMESTAMP DEFAULT NOW(),
    paid_at TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_sales_tenant ON sales(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_commissions_seller ON commissions(seller_id);

-- 1. Tabela de Entradas (Cabeçalho da Nota)
CREATE TABLE IF NOT EXISTS product_entries (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id),
    invoice_number VARCHAR(50), -- Número da NF
    invoice_url TEXT, -- Link do arquivo/foto da NF
    supplier_name VARCHAR(100),
    entry_date TIMESTAMP DEFAULT NOW(),
    total_amount DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Itens da Entrada
CREATE TABLE IF NOT EXISTS product_entry_items (
    id SERIAL PRIMARY KEY,
    entry_id INTEGER REFERENCES product_entries(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL, -- Preço de Custo nesta nota
    subtotal DECIMAL(10,2) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_entries_tenant ON product_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entry_items_entry ON product_entry_items(entry_id);

-- 1. Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    name VARCHAR(100) NOT NULL,
    cnpj_cpf VARCHAR(20),
    email VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Atualizar tabela de Entradas para vincular Fornecedor
ALTER TABLE product_entries ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);

-- Adicionar campos de pagamento e desconto na tabela de Vendas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash'; -- money, credit, debit, pix
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0; -- Valor pago pelo cliente
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2) DEFAULT 0; -- Troco
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;

-- Adicionar campos de pagamento e desconto na tabela de Vendas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'cash'; -- money, credit, debit, pix
ALTER TABLE sales ADD COLUMN IF NOT EXISTS discount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0; -- Valor entregue pelo cliente
ALTER TABLE sales ADD COLUMN IF NOT EXISTS change_amount DECIMAL(10,2) DEFAULT 0; -- Troco devolvido
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT; -- Observações da venda

-- Vincular a OS a uma transação financeira (para controle de pagamento)
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Garantir colunas de totais
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS total_parts DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS total_services DECIMAL(10,2) DEFAULT 0;

-- Adicionar mensagem de rodapé personalizada na configuração da empresa
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS footer_message TEXT DEFAULT 'Obrigado pela preferência! Garantia de 90 dias para serviços.';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website VARCHAR(255);

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS document VARCHAR(20); -- CNPJ/CPF
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS email_contact VARCHAR(100);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS footer_message TEXT DEFAULT 'Garantia de 90 dias.';

-- Adicionar controle de parcelas nas transações
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_index INT DEFAULT 1; -- Número da parcela (1, 2, 3...)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installments_total INT DEFAULT 1; -- Total de parcelas (3)

-- 1. Adicionar campos de Endereço na tabela de Clientes
ALTER TABLE clients ADD COLUMN IF NOT EXISTS zip_code VARCHAR(10);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS street VARCHAR(150);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS number VARCHAR(20);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS complement VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(100);
-- (City e State já existem, mas garantimos aqui)
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE clients ADD COLUMN IF NOT EXISTS state VARCHAR(2);

-- 2. Criar Tabela de Projetos / Oportunidades (CRM)
-- CORREÇÃO: client_id definido como INTEGER para coincidir com clients.id
CREATE TABLE IF NOT EXISTS client_projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE, 
    title VARCHAR(200) NOT NULL, 
    description TEXT,
    value DECIMAL(10, 2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'lead', -- lead, negotiation, in_progress, completed, lost
    due_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Criar Índices
CREATE INDEX IF NOT EXISTS idx_projects_client ON client_projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON client_projects(tenant_id);

-- Adicionar colunas para controle de parcelamento
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_index INTEGER DEFAULT 1; -- Qual é a parcela (1, 2...)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installments_total INTEGER DEFAULT 1; -- Total de parcelas (ex: 12)

-- Tabela de Cabeçalho de Orçamentos
CREATE TABLE IF NOT EXISTS quotes (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id),
    client_name VARCHAR(255), -- Snapshot do nome caso seja cliente avulso ou editado
    status VARCHAR(20) DEFAULT 'open', -- open, approved, rejected, converted
    total_amount DECIMAL(10,2) DEFAULT 0,
    discount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    valid_until DATE, -- Validade da proposta
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens do Orçamento
CREATE TABLE IF NOT EXISTS quote_items (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES quotes(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    description VARCHAR(255),
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL
);

-- Índice
CREATE INDEX IF NOT EXISTS idx_quotes_tenant ON quotes(tenant_id);

-- 1. Tabela de Drivers de Custo (Base de Cálculo Customizável)
-- Ex: "Hora Máquina", "Energia Elétrica", "Mão de Obra"
CREATE TABLE IF NOT EXISTS pcp_cost_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) DEFAULT 'R$', -- R$, %, h, un
    default_value DECIMAL(10, 2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabela de Ordens de Produção (Cabeçalho)
CREATE TABLE IF NOT EXISTS pcp_production_orders (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id), -- Produto final a ser produzido
    quantity DECIMAL(10,2) NOT NULL, -- Qtd a produzir
    status VARCHAR(20) DEFAULT 'planned', -- planned, in_production, quality_check, completed, cancelled
    start_date DATE,
    due_date DATE,
    
    -- Custos Consolidados
    total_raw_material DECIMAL(10, 2) DEFAULT 0, -- Soma dos insumos
    total_operation_cost DECIMAL(10, 2) DEFAULT 0, -- Soma dos drivers
    total_cost DECIMAL(10, 2) DEFAULT 0,
    unit_cost DECIMAL(10, 2) DEFAULT 0, -- Custo final unitário
    
    notes TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Itens consumidos na Ordem (Matéria Prima / Insumos)
CREATE TABLE IF NOT EXISTS pcp_order_items (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER REFERENCES pcp_production_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id), -- Matéria prima
    quantity DECIMAL(10,2) NOT NULL,
    unit_cost DECIMAL(10,2) NOT NULL, -- Custo no momento da produção
    subtotal DECIMAL(10,2) NOT NULL
);

-- 4. Valores dos Drivers aplicados nesta Ordem Específica
CREATE TABLE IF NOT EXISTS pcp_order_costs (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER REFERENCES pcp_production_orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES pcp_cost_drivers(id),
    name VARCHAR(100), -- Snapshot do nome para histórico
    value DECIMAL(10, 2) NOT NULL -- Valor aplicado nesta ordem
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pcp_orders_tenant ON pcp_production_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pcp_drivers_tenant ON pcp_cost_drivers(tenant_id);

-- Adicionar coluna de status ativo na tabela de usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Categorias Financeiras (Ex: Vendas, Serviços, Energia, Aluguel)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'income' ou 'expense'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Transações Financeiras (Já deve existir, mas reforçando colunas importantes)
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type VARCHAR(20) NOT NULL, -- 'income' ou 'expense'
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'cancelled'
    date DATE NOT NULL, -- Data de Vencimento ou Pagamento
    category_id INTEGER REFERENCES categories(id),
    client_id INTEGER REFERENCES clients(id),
    supplier_id INTEGER REFERENCES suppliers(id),
    
    -- Controle de Parcelas
    installment_index INTEGER DEFAULT 1,
    installments_total INTEGER DEFAULT 1,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_transactions_tenant ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

-- Adicionar coluna supplier_id na tabela transactions
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id);

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_transactions_supplier ON transactions(supplier_id);