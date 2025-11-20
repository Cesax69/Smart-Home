FROM node:18-alpine

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY dist ./dist

# Exponer puerto
EXPOSE 3007

# Comando de inicio
CMD ["node", "dist/server.js"]
