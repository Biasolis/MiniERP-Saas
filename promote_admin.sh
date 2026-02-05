#!/bin/bash

# ==========================================
# PROMOVER USUÁRIO A SUPER ADMIN
# ==========================================
DB_NAME="minierp"

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}>>> Promoção de Super Administrador${NC}"
echo "Este script dará acesso total (Super Admin) a um usuário existente."
echo ""

# 1. Solicita o E-mail
read -p "Digite o E-MAIL do usuário: " EMAIL_INPUT

if [ -z "$EMAIL_INPUT" ]; then
    echo -e "${RED}Erro: O e-mail é obrigatório.${NC}"
    exit 1
fi

# 2. Verifica se o usuário existe
USER_EXISTS=$(sudo -u postgres psql -d $DB_NAME -tAc "SELECT count(*) FROM users WHERE email = '$EMAIL_INPUT'")

if [ "$USER_EXISTS" -eq "0" ]; then
    echo -e "${RED}❌ Erro: Usuário com e-mail '$EMAIL_INPUT' não encontrado no banco de dados.${NC}"
    echo "Certifique-se de que o usuário já se cadastrou ou foi inserido no seed."
    exit 1
fi

# 3. Executa a Atualização
# Define is_super_admin como TRUE e também ajusta o role para 'super_admin' para garantir
sudo -u postgres psql -d $DB_NAME -c "UPDATE users SET is_super_admin = TRUE, role = 'super_admin' WHERE email = '$EMAIL_INPUT';" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Sucesso! O usuário '$EMAIL_INPUT' agora é um Super Administrador.${NC}"
    echo -e "Peça para o usuário fazer logout e login novamente para ver as alterações."
else
    echo -e "${RED}❌ Erro ao atualizar o banco de dados.${NC}"
fi