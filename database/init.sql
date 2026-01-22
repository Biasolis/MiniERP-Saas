-- database/init.sql
-- =========================================================
-- ARQUITETURA SAAS FINANCEIRO V2 (ENTERPRISE)
-- =========================================================

-- Habilita extensão para UUIDs (Identificadores únicos globais)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE EMPRESAS (TENANTS)
-- Cada registro aqui é um cliente do seu SaaS (ou a sua própria empresa Host)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_name VARCHAR(255) NOT NULL, -- Nome Fantasia
    legal_name VARCHAR(255) NOT NULL, -- Razão Social
    document VARCHAR(20) UNIQUE NOT NULL, -- CNPJ (chave de unicidade da empresa)
    
    -- Configurações do SaaS
    plan_tier VARCHAR(50) DEFAULT 'FREE', -- Controle de planos: FREE, PRO, ENTERPRISE
    is_active BOOLEAN DEFAULT TRUE,       -- Bloqueio administrativo (ex: inadimplência)
    
    -- Whitelabel (Configuração visual da empresa)
    theme_config JSONB DEFAULT '{"primaryColor": "#000000", "logoUrl": null}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABELA DE USUÁRIOS
-- Usuários pertencem a UMA empresa. O login é único pelo email.
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    
    -- Controle de Acesso (RBAC Simples)
    role VARCHAR(20) DEFAULT 'USER' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'USER', 'AUDITOR')),
    
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE CONTAS BANCÁRIAS / CAIXAS
-- Empresas têm várias fontes de dinheiro. Ex: "Cofre Loja 1", "Itaú", "Nubank"
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) CHECK (type IN ('CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT', 'CREDIT_CARD')),
    
    initial_balance NUMERIC(15, 2) DEFAULT 0.00,
    current_balance NUMERIC(15, 2) DEFAULT 0.00, -- Atualizado via Trigger/App
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABELA DE CONTATOS (CLIENTES E FORNECEDORES)
-- Essencial para B2B: Saber QUEM pagou ou A QUEM pagamos.
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name VARCHAR(200) NOT NULL,
    document VARCHAR(20), -- CPF ou CNPJ do terceiro
    type VARCHAR(20) CHECK (type IN ('CLIENT', 'SUPPLIER', 'EMPLOYEE', 'OTHER')),
    email VARCHAR(255),
    phone VARCHAR(20),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE CATEGORIAS (PLANO DE CONTAS)
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('income', 'expense')),
    color VARCHAR(7) DEFAULT '#000000',
    
    parent_id UUID REFERENCES categories(id), -- Permite subcategorias
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABELA DE TRANSAÇÕES (O CORE DO SISTEMA)
-- Centraliza toda movimentação financeira.
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Vínculos Obrigatórios para consistência
    account_id UUID NOT NULL REFERENCES accounts(id), -- De onde saiu o dinheiro?
    user_id UUID REFERENCES users(id),                -- Quem lançou?
    
    -- Vínculos Opcionais (Classificação)
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Cliente/Fornecedor
    
    amount NUMERIC(15, 2) NOT NULL,   -- Positivo (Entrada) ou Negativo (Saída)
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    due_date DATE,                    -- Para Fluxo de Caixa Futuro (Contas a Pagar/Receber)
    
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABELA DE INVESTIMENTOS (ADAPTADA PARA PJ)
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id), -- Vincula a conta de origem
    
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50),
    invested_amount NUMERIC(15, 2) NOT NULL,
    current_amount NUMERIC(15, 2) NOT NULL,
    start_date DATE NOT NULL,
    
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. TABELA DE LOGS DE AUDITORIA
-- Segurança para rastrear ações críticas (Ex: Admin apagou um usuário)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action VARCHAR(50) NOT NULL,      -- Ex: "DELETE_USER", "UPDATE_PLAN"
    entity_name VARCHAR(50) NOT NULL, -- Ex: "users", "companies"
    entity_id UUID,                   -- ID do item afetado
    details JSONB,                    -- Snapshot dos dados (antes/depois)
    
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- ÍNDICES DE PERFORMANCE (OBRIGATÓRIOS PARA SAAS)
-- =========================================================

-- Garante que queries filtrando por empresa sejam rápidas
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

CREATE INDEX IF NOT EXISTS idx_transactions_company_date ON transactions(company_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);

CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_categories_company ON categories(company_id);
CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);

-- FIM DO SCRIPT

-- Adicionar após a tabela categories

CREATE TABLE IF NOT EXISTS cost_centers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20), -- Ex: "CC-001"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar campo na tabela transactions
ALTER TABLE transactions ADD COLUMN cost_center_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL;