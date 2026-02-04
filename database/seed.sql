-- ============================================================================
-- SEED.SQL - DADOS DE TESTE PARA MINI ERP SAAS
-- ============================================================================
-- ATENÇÃO: Isso limpará os dados das tabelas principais da empresa de teste.
-- ============================================================================

-- Desabilita triggers temporariamente para evitar erros de FK durante o truncate
SET session_replication_role = 'replica';

-- Limpeza de tabelas (Ordem importa se não usar CASCADE, mas CASCADE resolve)
TRUNCATE TABLE tenants, users, categories, products, clients, suppliers, 
service_orders, service_order_items, sales, sale_items, 
transactions, inventory_movements RESTART IDENTITY CASCADE;

-- Reabilita triggers
SET session_replication_role = 'origin';

-- ============================================================================
-- 1. EMPRESA (TENANT)
-- ============================================================================
-- ID Fixo: d7a5b3a1-1111-4444-8888-c7e5d2a1b001
INSERT INTO tenants (id, name, slug, document, email_contact, phone, active, plan_tier, primary_color, secondary_color)
VALUES (
    'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 
    'Tech Solutions Ltda', 
    'tech-solutions', 
    '12.345.678/0001-99', 
    'contato@techsolutions.com', 
    '(11) 99999-8888', 
    true, 
    'premium',
    '#2563eb', -- Azul
    '#1e293b'  -- Escuro
);

-- ============================================================================
-- 2. USUÁRIOS (EQUIPE)
-- ============================================================================
-- Senha padrão para todos: "123456"
-- Hash Bcrypt: $2a$10$9f6geyCHqBaDFEIsmc2byu1kHCkmf7TGnN04/WbTWJqUqdPZc8OTy

INSERT INTO users (id, tenant_id, name, email, password_hash, role, active, is_super_admin)
VALUES 
-- ADMIN (Acesso Total)
(
    'a1b2c3d4-1111-2222-3333-e5f6g7h8i9j0', 
    'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 
    'Leonardo Admin', 
    'admin@tech.com', 
    '$2a$10$9f6geyCHqBaDFEIsmc2byu1kHCkmf7TGnN04/WbTWJqUqdPZc8OTy', 
    'admin', 
    true, 
    false
),
-- VENDEDOR (Acesso Vendas/Clientes)
(
    'a1b2c3d4-2222-3333-4444-e5f6g7h8i9j1', 
    'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 
    'Maria Vendas', 
    'vendas@tech.com', 
    '$2a$10$9f6geyCHqBaDFEIsmc2byu1kHCkmf7TGnN04/WbTWJqUqdPZc8OTy', 
    'vendedor', 
    true, 
    false
),
-- TÉCNICO (Acesso OS/Produção)
(
    'a1b2c3d4-3333-4444-5555-e5f6g7h8i9j2', 
    'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 
    'Carlos Técnico', 
    'tech@tech.com', 
    '$2a$10$9f6geyCHqBaDFEIsmc2byu1kHCkmf7TGnN04/WbTWJqUqdPZc8OTy', 
    'producao', 
    true, 
    false
),
-- CAIXA (Acesso PDV)
(
    'a1b2c3d4-4444-5555-6666-e5f6g7h8i9j3', 
    'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 
    'Ana Caixa', 
    'caixa@tech.com', 
    '$2a$10$9f6geyCHqBaDFEIsmc2byu1kHCkmf7TGnN04/WbTWJqUqdPZc8OTy', 
    'caixa', 
    true, 
    false
);

-- ============================================================================
-- 3. CATEGORIAS
-- ============================================================================
INSERT INTO categories (id, tenant_id, name, type) VALUES
('c1c1c1c1-0001-0000-0000-000000000001', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Eletrônicos', 'product'),
('c1c1c1c1-0002-0000-0000-000000000002', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Periféricos', 'product'),
('c1c1c1c1-0003-0000-0000-000000000003', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Serviços Técnicos', 'service'),
('c1c1c1c1-0004-0000-0000-000000000004', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Vendas de Produtos', 'income'),
('c1c1c1c1-0005-0000-0000-000000000005', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Serviços Prestados', 'income'),
('c1c1c1c1-0006-0000-0000-000000000006', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Despesas Operacionais', 'expense'),
('c1c1c1c1-0007-0000-0000-000000000007', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Fornecedores', 'expense');

-- ============================================================================
-- 4. FORNECEDORES E CLIENTES
-- ============================================================================
INSERT INTO suppliers (id, tenant_id, name, email, phone, document) VALUES
('s1s1s1s1-0001-0000-0000-000000000001', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Mega Distribuidora', 'contato@mega.com', '1133334444', '11222333000199'),
('s1s1s1s1-0002-0000-0000-000000000002', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Global Parts', 'sales@global.com', '1155556666', '99888777000155');

INSERT INTO clients (id, tenant_id, name, email, phone, document, address) VALUES
('cl1cl1cl-0001-0000-0000-000000000001', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'João da Silva', 'joao@gmail.com', '11988887777', '12345678900', 'Rua das Flores, 123'),
('cl1cl1cl-0002-0000-0000-000000000002', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Empresa Cliente S.A.', 'compras@cliente.com', '1133221100', '55444333000122', 'Av. Paulista, 1000');

-- ============================================================================
-- 5. PRODUTOS E SERVIÇOS
-- ============================================================================
INSERT INTO products (id, tenant_id, name, description, cost_price, sale_price, stock_quantity, min_stock, category_id, type, sku, unit, barcode) VALUES
-- Produtos Físicos
('p1p1p1p1-0001-0000-0000-000000000001', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Cabo USB-C Original', 'Cabo de 1 metro reforçado', 15.00, 45.00, 50, 10, 'c1c1c1c1-0002-0000-0000-000000000002', 'product', 'CAB-USBC', 'un', '789123456001'),
('p1p1p1p1-0002-0000-0000-000000000002', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'SSD 240GB Kingston', 'SATA 3 2.5 polegadas', 120.00, 250.00, 15, 5, 'c1c1c1c1-0001-0000-0000-000000000001', 'product', 'SSD-240', 'un', '789123456002'),
('p1p1p1p1-0003-0000-0000-000000000003', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Memória RAM 8GB DDR4', '2666Mhz Desktop', 180.00, 350.00, 8, 3, 'c1c1c1c1-0001-0000-0000-000000000001', 'product', 'RAM-8GB', 'un', '789123456003'),

-- Serviços (Mão de Obra)
('p1p1p1p1-0004-0000-0000-000000000004', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Formatação Completa', 'Backup + Windows + Office', 0.00, 120.00, 0, 0, 'c1c1c1c1-0003-0000-0000-000000000003', 'service', 'SERV-FORM', 'hr', null),
('p1p1p1p1-0005-0000-0000-000000000005', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Troca de Tela Celular', 'Mão de obra especializada', 0.00, 150.00, 0, 0, 'c1c1c1c1-0003-0000-0000-000000000003', 'service', 'SERV-TELA', 'un', null);

-- Movimentação de Estoque Inicial
INSERT INTO inventory_movements (tenant_id, product_id, user_id, type, quantity, reason, created_at) VALUES
('d7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'p1p1p1p1-0001-0000-0000-000000000001', 'a1b2c3d4-1111-2222-3333-e5f6g7h8i9j0', 'in', 50, 'Estoque Inicial', NOW()),
('d7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'p1p1p1p1-0002-0000-0000-000000000002', 'a1b2c3d4-1111-2222-3333-e5f6g7h8i9j0', 'in', 15, 'Estoque Inicial', NOW()),
('d7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'p1p1p1p1-0003-0000-0000-000000000003', 'a1b2c3d4-1111-2222-3333-e5f6g7h8i9j0', 'in', 8, 'Estoque Inicial', NOW());

-- ============================================================================
-- 6. VENDAS (PDV)
-- ============================================================================
INSERT INTO sales (id, tenant_id, client_id, user_id, total_amount, payment_method, status, created_at) VALUES
('v1v1v1v1-0001-0000-0000-000000000001', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', null, 'a1b2c3d4-4444-5555-6666-e5f6g7h8i9j3', 90.00, 'money', 'completed', NOW() - INTERVAL '2 days'),
('v1v1v1v1-0002-0000-0000-000000000002', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'cl1cl1cl-0001-0000-0000-000000000001', 'a1b2c3d4-4444-5555-6666-e5f6g7h8i9j3', 250.00, 'credit_card', 'completed', NOW());

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES
('v1v1v1v1-0001-0000-0000-000000000001', 'p1p1p1p1-0001-0000-0000-000000000001', 2, 45.00, 90.00), -- 2 Cabos
('v1v1v1v1-0002-0000-0000-000000000002', 'p1p1p1p1-0002-0000-0000-000000000002', 1, 250.00, 250.00); -- 1 SSD

-- Ajusta estoque pós-venda (Simulação)
UPDATE products SET stock_quantity = stock_quantity - 2 WHERE id = 'p1p1p1p1-0001-0000-0000-000000000001';
UPDATE products SET stock_quantity = stock_quantity - 1 WHERE id = 'p1p1p1p1-0002-0000-0000-000000000002';

-- ============================================================================
-- 7. ORDENS DE SERVIÇO (OS)
-- ============================================================================
-- OS 1: Aberta
INSERT INTO service_orders (id, tenant_id, client_id, user_id, status, equipment, issue_reported, created_at) VALUES
('os1os1os-0001-0000-0000-000000000001', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'cl1cl1cl-0001-0000-0000-000000000001', 'a1b2c3d4-3333-4444-5555-e5f6g7h8i9j2', 'pending', 'Notebook Dell Vostro', 'Não liga, tela azul', NOW() - INTERVAL '1 day');

-- OS 2: Concluída
INSERT INTO service_orders (id, tenant_id, client_id, user_id, status, equipment, issue_reported, diagnosis, total_amount, created_at, finished_at) VALUES
('os1os1os-0002-0000-0000-000000000002', 'd7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'cl1cl1cl-0002-0000-0000-000000000002', 'a1b2c3d4-3333-4444-5555-e5f6g7h8i9j2', 'completed', 'PC Desktop HP', 'Lentidão extrema', 'Realizada formatação e limpeza', 120.00, NOW() - INTERVAL '3 days', NOW());

INSERT INTO service_order_items (service_order_id, product_id, quantity, unit_price, subtotal) VALUES
('os1os1os-0002-0000-0000-000000000002', 'p1p1p1p1-0004-0000-0000-000000000004', 1, 120.00, 120.00); -- Formatação

-- ============================================================================
-- 8. FINANCEIRO (TRANSAÇÕES)
-- ============================================================================
INSERT INTO transactions (tenant_id, description, amount, type, status, category_id, date, created_by) VALUES
-- Receitas (Vendas e Serviços)
('d7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Venda PDV #1', 90.00, 'income', 'paid', 'c1c1c1c1-0004-0000-0000-000000000004', NOW() - INTERVAL '2 days', 'a1b2c3d4-4444-5555-6666-e5f6g7h8i9j3'),
('d7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Venda PDV #2', 250.00, 'income', 'paid', 'c1c1c1c1-0004-0000-0000-000000000004', NOW(), 'a1b2c3d4-4444-5555-6666-e5f6g7h8i9j3'),
('d7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Serviço OS #2', 120.00, 'income', 'paid', 'c1c1c1c1-0005-0000-0000-000000000005', NOW(), 'a1b2c3d4-3333-4444-5555-e5f6g7h8i9j2'),

-- Despesas
('d7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Conta de Luz', 350.00, 'expense', 'pending', 'c1c1c1c1-0006-0000-0000-000000000006', NOW() + INTERVAL '5 days', 'a1b2c3d4-1111-2222-3333-e5f6g7h8i9j0'),
('d7a5b3a1-1111-4444-8888-c7e5d2a1b001', 'Compra de SSDs', 1200.00, 'expense', 'paid', 'c1c1c1c1-0007-0000-0000-000000000007', NOW() - INTERVAL '10 days', 'a1b2c3d4-1111-2222-3333-e5f6g7h8i9j0');