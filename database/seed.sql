-- ============================================================================
-- SEED DATA - MINI ERP SAAS (CORRIGIDO)
-- ============================================================================

-- 1. CRIAR O TENANT (EMPRESA) DE TESTE
-- ID fixo para vincular tudo a esta empresa
INSERT INTO tenants (id, name, slug, plan_tier, primary_color, active)
VALUES (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    'Tech Solutions Demo', 
    'tech-solutions', 
    'pro', 
    '#2563eb', 
    true
) ON CONFLICT (slug) DO NOTHING;

-- 2. CRIAR USUÁRIOS
-- Senha hash genérica (ex: '123456') - Em produção deve ser gerada pelo bcrypt
INSERT INTO users (id, tenant_id, name, email, password_hash, role, is_super_admin, commission_rate)
VALUES 
-- Super Admin / Dono
(
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    'Leonardo Admin', 
    'admin@demo.com', 
    '$2b$10$X7V.7/8h.x.x.x.x.x.x.x.x.x.x.x', -- Hash de exemplo
    'super_admin', 
    true,
    0
),
-- Vendedor (Comissão 5%)
(
    uuid_generate_v4(), 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    'João Vendedor', 
    'vendedor@demo.com', 
    'hash_senha_vendedor', 
    'admin', 
    false,
    5.00
),
-- Técnico
(
    uuid_generate_v4(), 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    'Maria Técnica', 
    'tecnico@demo.com', 
    'hash_senha_tecnico', 
    'admin', 
    false,
    0
)
ON CONFLICT (tenant_id, email) DO NOTHING;

-- 3. CATEGORIAS FINANCEIRAS
INSERT INTO categories (tenant_id, name, type, color) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Vendas de Produtos', 'income', '#10b981'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Serviços Técnicos', 'income', '#3b82f6'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Compra de Estoque', 'expense', '#ef4444'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Energia Elétrica', 'expense', '#f59e0b'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Aluguel', 'expense', '#6366f1');

-- 4. CLIENTES
INSERT INTO clients (tenant_id, name, email, phone, document, type, status, address, city, state) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cliente Avulso', 'avulso@email.com', '11999999999', '00000000000', 'client', 'active', 'Balcão', 'São Paulo', 'SP'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Mercado Silva', 'contato@silva.com', '11888888888', '12345678000199', 'client', 'active', 'Rua das Flores, 123', 'Campinas', 'SP'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Escola Futuro', 'financeiro@futuro.edu', '11777777777', '98765432000100', 'client', 'lead', 'Av. Paulista, 1000', 'São Paulo', 'SP');

-- 5. FORNECEDORES
INSERT INTO suppliers (tenant_id, name, cnpj_cpf, email, phone, address) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Distribuidora Global', '11222333000144', 'vendas@global.com', '1133334444', 'Galpão 4, Barueri-SP'),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Tech Parts Import', '55666777000188', 'contato@techparts.com', '4130302020', 'Curitiba-PR');

-- 6. PRODUTOS E SERVIÇOS
INSERT INTO products (tenant_id, name, description, sale_price, cost_price, stock, min_stock, sku, type, commission_rate) VALUES
-- Produto com Estoque
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Roteador Wi-Fi 6', 'Roteador Gigabit Dual Band', 350.00, 180.00, 15, 5, 'ROT-001', 'product', 10),
-- Produto Baixo Estoque
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Cabo de Rede (Metro)', 'Cabo CAT6 Azul', 2.50, 0.80, 4, 10, 'CAB-CAT6', 'product', NULL),
-- Serviço (Mão de Obra)
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Instalação e Configuração', 'Visita técnica local', 150.00, 0.00, 0, 0, 'SERV-INST', 'service', 20),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Formatação Computador', 'Backup e formatação', 120.00, 0.00, 0, 0, 'SERV-FORM', 'service', 20);

-- 7. ORDENS DE SERVIÇO (OS)
-- Usa subquery para pegar ID do cliente dinamicamente
INSERT INTO service_orders (tenant_id, client_id, client_name, equipment, description, status, priority, total_amount, created_at) 
VALUES
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
    (SELECT id FROM clients WHERE name = 'Mercado Silva' LIMIT 1), 
    'Mercado Silva', 
    'PC Caixa 01', 
    'Computador não liga, verificar fonte.', 
    'in_progress', 
    'high', 
    150.00,
    NOW() - INTERVAL '2 days'
);

-- Itens da OS acima
INSERT INTO service_order_items (tenant_id, service_order_id, product_id, description, quantity, unit_price, subtotal)
VALUES
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    (SELECT id FROM service_orders WHERE client_name = 'Mercado Silva' LIMIT 1),
    (SELECT id FROM products WHERE sku = 'SERV-INST' LIMIT 1),
    'Instalação e Configuração',
    1,
    150.00,
    150.00
);

-- 8. ENTRADA DE NOTA (ESTOQUE)
-- Cria entrada e itens vinculados
WITH new_entry AS (
    INSERT INTO product_entries (tenant_id, user_id, invoice_number, supplier_name, entry_date, total_amount)
    VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
        'NF-102030',
        'Distribuidora Global',
        NOW() - INTERVAL '5 days',
        1800.00
    ) RETURNING id
)
INSERT INTO product_entry_items (entry_id, product_id, quantity, unit_cost, subtotal)
SELECT 
    (SELECT id FROM new_entry),
    (SELECT id FROM products WHERE sku = 'ROT-001' LIMIT 1),
    10,
    180.00,
    1800.00;

-- 9. VENDAS (PDV)
WITH new_sale AS (
    INSERT INTO sales (tenant_id, seller_id, client_id, total_amount, status, payment_method, amount_paid, change_amount)
    VALUES (
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22',
        NULL, -- Venda Avulsa
        350.00,
        'completed',
        'pix',
        350.00,
        0
    ) RETURNING id
)
INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal, commission_amount)
SELECT
    (SELECT id FROM new_sale),
    (SELECT id FROM products WHERE sku = 'ROT-001' LIMIT 1),
    1,
    350.00,
    350.00,
    35.00; -- 10% comissão

-- 10. TRANSAÇÕES FINANCEIRAS (Fluxo de Caixa)
INSERT INTO transactions (tenant_id, category_id, client_id, description, amount, type, cost_type, status, date, created_by)
VALUES
-- Receita da Venda acima
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    (SELECT id FROM categories WHERE name = 'Vendas de Produtos' LIMIT 1),
    NULL,
    'Venda PDV (Roteador)',
    350.00,
    'income',
    'variable',
    'completed',
    NOW(),
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22'
),
-- Despesa da Compra de Estoque
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    (SELECT id FROM categories WHERE name = 'Compra de Estoque' LIMIT 1),
    NULL,
    'Compra NF-102030 Distribuidora Global',
    1800.00,
    'expense',
    'variable',
    'completed',
    NOW() - INTERVAL '5 days',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22'
),
-- Despesa Fixa (Pendente)
(
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    (SELECT id FROM categories WHERE name = 'Aluguel' LIMIT 1),
    NULL,
    'Aluguel Escritório',
    2500.00,
    'expense',
    'fixed',
    'pending',
    NOW() + INTERVAL '10 days',
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22'
);