#!/bin/bash

# ==========================================
# CONFIGURAR API DO GEMINI (IA)
# ==========================================
ENV_FILE="/var/www/minierp/backend/.env"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}>>> Configuração da Inteligência Artificial (Google Gemini)${NC}"
echo "Você pode gerar uma chave gratuita em: https://aistudio.google.com/app/apikey"
echo ""

# 1. Verifica se o arquivo .env existe
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}❌ Erro: Arquivo de configuração não encontrado em $ENV_FILE${NC}"
    exit 1
fi

# 2. Solicita a Chave
read -p "Cole sua GEMINI API KEY aqui: " API_KEY_INPUT

if [ -z "$API_KEY_INPUT" ]; then
    echo -e "${RED}Erro: A chave não pode ser vazia.${NC}"
    exit 1
fi

# 3. Atualiza o .env
# Verifica se a chave já existe no arquivo
if grep -q "GEMINI_API_KEY=" "$ENV_FILE"; then
    # Se existe, substitui a linha inteira (usando | como delimitador para evitar erros com caracteres especiais)
    sed -i "s|GEMINI_API_KEY=.*|GEMINI_API_KEY=$API_KEY_INPUT|g" "$ENV_FILE"
    echo -e "${GREEN}✔ Chave atualizada no arquivo .env${NC}"
else
    # Se não existe, adiciona no final
    echo "" >> "$ENV_FILE" # Garante uma nova linha
    echo "GEMINI_API_KEY=$API_KEY_INPUT" >> "$ENV_FILE"
    echo -e "${GREEN}✔ Chave adicionada ao arquivo .env${NC}"
fi

# 4. Reinicia a Aplicação
echo -e "${YELLOW}>>> Reiniciando o Backend para aplicar as alterações...${NC}"
pm2 restart minierp-backend

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Configuração concluída com sucesso! A IA está ativa.${NC}"
else
    echo -e "${RED}❌ Erro ao reiniciar o serviço do backend.${NC}"
fi