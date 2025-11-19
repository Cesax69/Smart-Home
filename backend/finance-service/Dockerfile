FROM mirror.gcr.io/library/node:18

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias (incluye devDependencies para el build)
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar TypeScript
RUN npm run build

# Quitar devDependencies para runtime
RUN npm prune --production

# Exponer puerto
EXPOSE 3007

# Comando de inicio
CMD ["npm", "start"]