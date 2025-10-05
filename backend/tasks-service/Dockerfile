# Usar imagen oficial de Node.js LTS
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluye devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Limpiar devDependencies después del build
RUN npm prune --production

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S tasksservice -u 1001

# Cambiar propietario de archivos
RUN chown -R tasksservice:nodejs /app
USER tasksservice

# Exponer puerto
EXPOSE 3002

# Comando de inicio
CMD ["npm", "start"]