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

# Crear directorios para archivos
RUN mkdir -p /app/uploads /app/temp /app/quarantine

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S fileuploadservice -u 1001

# Cambiar propietario de archivos y directorios
RUN chown -R fileuploadservice:nodejs /app
USER fileuploadservice

# Exponer puerto
EXPOSE 3005

# Volumen para persistencia de archivos
VOLUME ["/app/uploads", "/app/temp", "/app/quarantine"]

# Comando de inicio
CMD ["npm", "start"]