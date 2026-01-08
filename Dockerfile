# Usa uma versão super leve do Node (Alpine) para economizar RAM
FROM node:18-alpine

# Cria a pasta de trabalho
WORKDIR /app

# Copia apenas os arquivos de dependência do servidor primeiro (para cache)
COPY server/package*.json ./server/

# Instala as dependências
RUN cd server && npm install --production

# Copia todo o restante do projeto (Client e Server)
COPY . .

# Define a pasta de trabalho para onde o server roda
WORKDIR /app/server

# Expõe a porta 3000
EXPOSE 3000

# Comando para iniciar
CMD ["node", "index.js"]