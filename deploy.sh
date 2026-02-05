#!/bin/bash

# ==========================================
# CONFIGURAÇÕES PADRÃO (Podem ser alteradas aqui)
# ==========================================
DB_USER="minierpuser"
DB_PASS="minierppass"
DB_NAME="minierp"
REPO_URL="https://github.com/Biasolis/minierp-saas.git"
INSTALL_DIR="/var/www/minierp"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}   INSTALADOR AUTOMÁTICO MINI ERP (V. ENV)    ${NC}"
echo -e "${GREEN}==============================================${NC}"

# ==========================================
# 0. PERGUNTA O DOMÍNIO
# ==========================================
echo -e "${YELLOW}>>> Configuração de Domínio${NC}"
read -p "Digite o domínio onde o sistema rodará (ex: app.meuerp.com.br): " DOMAIN_INPUT

if [ -z "$DOMAIN_INPUT" ]; then
    echo -e "${RED}Erro: O domínio é obrigatório.${NC}"
    exit 1
fi

DOMAIN=$(echo "$DOMAIN_INPUT" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
echo -e "${GREEN}>>> Domínio configurado para: ${DOMAIN}${NC}"
sleep 2

# ==========================================
# 1. AMBIENTE
# ==========================================
echo -e "${YELLOW}>>> [1/8] Preparando Ambiente (Node, Git, Postgres)...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
dpkg --remove --force-all libnode-dev libnode72 2>/dev/null
apt-get remove -y nodejs nodejs-doc npm 2>/dev/null
apt-get autoremove -y -qq

apt-get install -y curl git build-essential wget unzip -qq
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs postgresql postgresql-contrib -qq
npm install -g pm2 serve

systemctl start postgresql
systemctl enable postgresql

# ==========================================
# 2. BANCO DE DADOS
# ==========================================
echo -e "${YELLOW}>>> [2/8] Configurando Banco de Dados...${NC}"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
sudo -u postgres psql -d $DB_NAME -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pgcrypto";'

# ==========================================
# 3. CLONAGEM DO REPOSITÓRIO
# ==========================================
echo -e "${YELLOW}>>> [3/8] Baixando Código Fonte...${NC}"
mkdir -p /var/www
cd /var/www

if [ -d "$INSTALL_DIR" ]; then
    echo "Diretório existente encontrado. Fazendo backup..."
    mv $INSTALL_DIR "${INSTALL_DIR}_backup_$(date +%s)"
fi

git clone $REPO_URL minierp
cd $INSTALL_DIR

# ==========================================
# 4. BACKEND SETUP (.ENV)
# ==========================================
echo -e "${YELLOW}>>> [4/8] Configurando Backend...${NC}"
cd $INSTALL_DIR/backend
npm install --silent
mkdir -p uploads && chmod 777 uploads

GENERATED_JWT=$(openssl rand -hex 32)

if [ -f ".env.example" ]; then
    cp .env.example .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|g" .env
    sed -i "s|PORT=.*|PORT=3000|g" .env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$GENERATED_JWT|g" .env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" .env
    sed -i "s|NODE_ENV=.*|NODE_ENV=production|g" .env
    if ! grep -q "STORAGE_TYPE" .env; then echo "STORAGE_TYPE=local" >> .env; fi
else
    cat > .env <<EOF
PORT=3000
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
JWT_SECRET=$GENERATED_JWT
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN
STORAGE_TYPE=local
EOF
fi

sed -i "/const app = express();/a app.set('trust proxy', 1);" src/app.js 2>/dev/null || true

# ==========================================
# 5. ESTRUTURA DO BANCO E PERMISSÕES
# ==========================================
echo -e "${YELLOW}>>> [5/8] Criando Tabelas e Ajustando Permissões...${NC}"
cd $INSTALL_DIR
sudo -u postgres psql -d $DB_NAME -f database/init.sql 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -f database/seed.sql 2>/dev/null || true

# AJUSTE DE PERMISSÕES DO BD
echo "Concedendo privilégios ao usuário $DB_USER..."
sudo -u postgres psql -d $DB_NAME -c "
GRANT USAGE ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;
"

# ==========================================
# 6. FRONTEND SETUP (.ENV)
# ==========================================
echo -e "${YELLOW}>>> [6/8] Configurando Frontend...${NC}"
cd $INSTALL_DIR/frontend
npm install --silent

if [ -f ".env.example" ]; then
    cp .env.example .env.production
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|g" .env.production
else
    echo "VITE_API_URL=https://$DOMAIN/api" > .env.production
fi

echo "Buildando Frontend..."
npm run build

# ==========================================
# 7. CONFIGURAÇÃO PM2 (DETECÇÃO DINÂMICA)
# ==========================================
echo -e "${YELLOW}>>> [7/8] Inicializando Serviços...${NC}"
cd $INSTALL_DIR

# Verifica se o arquivo está em src/server.js ou server.js
if [ -f "backend/src/server.js" ]; then
    BACKEND_ENTRY="src/server.js"
else
    BACKEND_ENTRY="server.js"
fi

cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: "minierp-backend",
      cwd: "./backend",
      script: "$BACKEND_ENTRY",
      env: { NODE_ENV: "production" },
    },
    {
      name: "minierp-frontend",
      cwd: "./frontend",
      script: "serve",
      env: {
        PM2_SERVE_PATH: './dist',
        PM2_SERVE_PORT: 5173,
        PM2_SERVE_SPA: 'true',
        PM2_SERVE_HOMEPAGE: '/index.html'
      }
    },
  ],
};
EOF

pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup | tail -n 1 > /tmp/pm2_startup_cmd && chmod +x /tmp/pm2_startup_cmd && /tmp/pm2_startup_cmd

# ==========================================
# 8. CONFIGURAÇÃO NGINX (REVERSO)
# ==========================================
echo -e "${YELLOW}>>> [8/8] Configurando Nginx...${NC}"
apt-get install -y nginx -qq

cat > /etc/nginx/sites-available/minierp <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    location /api/ {
        rewrite ^/api/(.*) /\$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

ln -sf /etc/nginx/sites-available/minierp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

# SSL Automático com Certbot
if command -v snap >/dev/null; then
    snap install core; snap refresh core
    snap install --classic certbot
    ln -sf /snap/bin/certbot /usr/bin/certbot
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN --redirect || echo "Aviso: Certbot falhou. Verifique o DNS."
fi

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}   INSTALAÇÃO CONCLUÍDA COM SUCESSO!          ${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "Acesse seu sistema em: https://$DOMAIN"