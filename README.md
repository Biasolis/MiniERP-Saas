Mini ERP SaaS - Gestão Inteligente de Negócios
O Mini ERP SaaS é uma plataforma de gestão empresarial multi-tenant projetada para pequenas e médias empresas. Ele combina funcionalidades essenciais de ERP (Financeiro, Vendas, Estoque, OS, RH) com o poder da Inteligência Artificial para categorização automática e insights financeiros.

🚀 Principais Funcionalidades
Arquitetura SaaS Multi-Tenant: Isolamento completo de dados entre empresas (tenants).

Financeiro Inteligente: Fluxo de caixa, parcelamentos e integração com Google Gemini AI para categorização automática.

PDV & Vendas: Ponto de venda intuitivo com baixa automática de estoque e integração financeira.

Gestão de Estoque: Histórico de movimentações, entradas por nota e alertas de estoque mínimo.

Ordens de Serviço: Gestão completa de manutenção, técnicos e materiais.

Módulo RH: Cadastro de funcionários, departamentos, cargos e registro de ponto.

Dashboard Avançado: Gráficos interativos e relatórios gerados por IA.

🛠️ Tecnologias Utilizadas
Stack Tecnológica:

Frontend: React.js, Vite, Lucide React, CSS Modules.

Backend: Node.js, Express.

Banco de Dados: PostgreSQL (Extensões UUID e PGCrypto).

IA: Google Gemini API.

DevOps: Nginx (Proxy Reverso), PM2, Certbot (SSL).

📦 Instalação e Deploy
Preparamos scripts automatizados para facilitar a instalação em servidores Linux (Ubuntu 22.04+).

Opção 1: Deploy Cloud Automático (Recomendado)
Este script configura Node, Postgres, Nginx e gera o certificado SSL (HTTPS) automaticamente.

Aponte seu domínio (ex: app.seuerp.com) para o IP da sua VPS.

No terminal da sua VPS, execute:

Bash
wget https://raw.githubusercontent.com/Biasolis/minierp-saas/main/deploy-cloud.sh
chmod +x deploy-cloud.sh
sudo ./deploy-cloud.sh
Opção 2: Instalação Manual
Caso prefira configurar passo a passo, siga a ordem:

Execute o database/init.sql no seu PostgreSQL.

Configure o .env no /backend e /frontend baseado nos arquivos .env.example.

Instale as dependências: npm install em ambas as pastas.

🔧 Scripts Utilitários
Após a instalação, você pode utilizar os utilitários incluídos na raiz do projeto:

1. Configurar Inteligência Artificial
Para ativar os recursos de IA, insira sua chave da API do Gemini:

Bash
./setup_ai.sh
2. Promover Super Administrador
Para gerenciar o painel SaaS (planos e tenants), promova seu usuário:

Bash
./promote_admin.sh
📂 Estrutura do Projeto
Plaintext
├── backend/            # API REST em Node.js
│   ├── src/            # Código fonte (Controllers, Routes, Services)
│   └── uploads/        # Armazenamento local de anexos
├── frontend/           # Interface em React
│   ├── src/            # Componentes e Páginas
│   └── dist/           # Build final para produção
├── database/           # Scripts SQL (Init e Seed)
└── scripts/            # Scripts de automação e deploy
📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

🤝 Contribuição
Faça um Fork do projeto.

Crie uma Branch para sua Feature (git checkout -b feature/NovaFeature).

Commit suas mudanças (git commit -m 'Adicionando nova feature').

Push para a Branch (git push origin feature/NovaFeature).

Abra um Pull Request.