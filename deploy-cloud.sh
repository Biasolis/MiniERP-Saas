#!/bin/bash

# ==========================================
# CONFIGURAÇÕES INICIAIS
# ==========================================
DB_USER="minierpuser"
DB_PASS="minierppass" # Recomendo alterar para algo forte
DB_NAME="minierp"
REPO_URL="https://github.com/Biasolis/minierp-saas.git"
INSTALL_DIR="/var/www/minierp"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}   DEPLOY CLOUD COMPLETO (NGINX + SSL)        ${NC}"
echo -e "${GREEN}==============================================${NC}"

# ==========================================
# 0. COLETA DE DADOS
# ==========================================
echo -e "${YELLOW}>>> Configuração Inicial${NC}"
read -p "Digite o DOMÍNIO (ex: app.meuerp.com.br): " DOMAIN_INPUT
read -p "Digite seu EMAIL (para o certificado SSL): " EMAIL_INPUT

if [ -z "$DOMAIN_INPUT" ] || [ -z "$EMAIL_INPUT" ]; then
    echo -e "${RED}Erro: Domínio e Email são obrigatórios.${NC}"
    exit 1
fi

# Limpa o domínio (remove http/https/barras)
DOMAIN=$(echo "$DOMAIN_INPUT" | sed -e 's|^[^/]*//||' -e 's|/.*$||')

echo -e "${GREEN}>>> Instalação iniciada para: https://$DOMAIN${NC}"
sleep 2

# ==========================================
# 1. ATUALIZAÇÃO E DEPENDÊNCIAS
# ==========================================
echo -e "${YELLOW}>>> [1/9] Atualizando Sistema e Instalando Dependências...${NC}"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get upgrade -y -qq

# Instala essenciais + Nginx + Certbot
apt-get install -y curl git build-essential wget unzip nginx certbot python3-certbot-nginx -qq

# Limpa instalações antigas do Node
dpkg --remove --force-all libnode-dev libnode72 2>/dev/null
apt-get remove -y nodejs nodejs-doc npm 2>/dev/null
apt-get autoremove -y -qq

# Instala Node v20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs postgresql postgresql-contrib -qq

# Instala Gerenciador de Processos
npm install -g pm2 serve

# Inicia serviços
systemctl start postgresql
systemctl enable postgresql
systemctl start nginx
systemctl enable nginx

# ==========================================
# 2. BANCO DE DADOS
# ==========================================
echo -e "${YELLOW}>>> [2/9] Configurando PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;"
# Extensões
sudo -u postgres psql -d $DB_NAME -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; CREATE EXTENSION IF NOT EXISTS "pgcrypto";'

# ==========================================
# 3. CÓDIGO FONTE
# ==========================================
echo -e "${YELLOW}>>> [3/9] Baixando Aplicação...${NC}"
mkdir -p /var/www
cd /var/www

if [ -d "$INSTALL_DIR" ]; then
    echo "Backup da versão anterior..."
    mv $INSTALL_DIR "${INSTALL_DIR}_backup_$(date +%s)"
fi

git clone $REPO_URL minierp
cd $INSTALL_DIR

# ==========================================
# 4. BACKEND SETUP
# ==========================================
echo -e "${YELLOW}>>> [4/9] Configurando Backend...${NC}"
cd $INSTALL_DIR/backend
npm install --silent
mkdir -p uploads && chmod 777 uploads

# Gera Token Seguro
GENERATED_JWT=$(openssl rand -hex 32)

# Copia e Ajusta .env
if [ -f ".env.example" ]; then
    cp .env.example .env
    # Substituições
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME|g" .env
    sed -i "s|PORT=.*|PORT=3000|g" .env
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$GENERATED_JWT|g" .env
    sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|g" .env
    sed -i "s|NODE_ENV=.*|NODE_ENV=production|g" .env
    
    # Adiciona STORAGE se não existir
    if ! grep -q "STORAGE_TYPE" .env; then
        echo "STORAGE_TYPE=local" >> .env
    fi
else
    # Fallback se não tiver example
    cat > .env <<EOF
PORT=3000
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
JWT_SECRET=$GENERATED_JWT
NODE_ENV=production
FRONTEND_URL=https://$DOMAIN
STORAGE_TYPE=local
EOF
fi

# Ajuste Trust Proxy (Vital para Nginx)
sed -i "/const app = express();/a app.set('trust proxy', 1);" src/app.js 2>/dev/null || true

# ==========================================
# 5. ESTRUTURA E SEED
# ==========================================
echo -e "${YELLOW}>>> [5/9] Populando Banco de Dados...${NC}"
cd $INSTALL_DIR
sudo -u postgres psql -d $DB_NAME -f database/init.sql 2>/dev/null || true
sudo -u postgres psql -d $DB_NAME -f database/seed.sql 2>/dev/null || true

# ==========================================
# 6. FRONTEND SETUP
# ==========================================
echo -e "${YELLOW}>>> [6/9] Compilando Frontend...${NC}"
cd $INSTALL_DIR/frontend
npm install --silent

if [ -f ".env.example" ]; then
    cp .env.example .env.production
    # Aponta para o Nginx (/api) e não porta 3000 direta
    sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://$DOMAIN/api|g" .env.production
else
    echo "VITE_API_URL=https://$DOMAIN/api" > .env.production
fi

# Build
npm run build

# ==========================================
# 7. SERVIÇOS PM2
# ==========================================
echo -e "${YELLOW}>>> [7/9] Iniciando Processos...${NC}"
cd $INSTALL_DIR

cat > ecosystem.config.js <<EOF
module.exports = {
  apps: [
    {
      name: "minierp-backend",
      cwd: "./backend",
      script: "src/server.js",
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
# 8. NGINX (CONFIGURAÇÃO)
# ==========================================
echo -e "${YELLOW}>>> [8/9] Configurando Nginx...${NC}"

# Cria arquivo de config do Nginx
cat > /etc/nginx/sites-available/minierp <<EOF
server {
    server_name $DOMAIN;

    # Logs
    access_log /var/log/nginx/minierp_access.log;
    error_log /var/log/nginx/minierp_error.log;

    # Frontend (Proxy para o PM2 Serve na porta 5173)
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API (Proxy para o Node na porta 3000)
    location /api/ {
        # Remove o /api da URL antes de enviar para o backend
        rewrite ^/api/(.*) /\$1 break;
        
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Ativa o site e remove o default
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/minierp /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# ==========================================
# 9. SSL (LET'S ENCRYPT)
# ==========================================
echo -e "${YELLOW}>>> [9/9] Gerando Certificado SSL (HTTPS)...${NC}"

# Configura Firewall Básico (UFW) se estiver ativo
if command -v ufw >/dev/null; then
    ufw allow 'Nginx Full'
    ufw allow OpenSSH
    # ufw enable # Descomente se quiser forçar a ativação (cuidado para não se trancar fora)
fi

# Roda Certbot Automático
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

echo -e "${GREEN}==============================================${NC}"
echo -e "${GREEN}   INSTALAÇÃO FINALIZADA!                     ${NC}"
echo -e "${GREEN}==============================================${NC}"
echo -e "Acesse: https://$DOMAIN"
echo -e "Status do PM2: 'pm2 status'"
echo -e "Logs do Nginx: '/var/log/nginx/'"