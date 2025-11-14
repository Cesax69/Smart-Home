# Usar imagen oficial de Node.js LTS
FROM mirror.gcr.io/library/node:18

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias (incluyendo devDependencies para el build)
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build

# Limpiar devDependencies después del build
RUN npm prune --production

# Ejecutar como usuario por defecto en la imagen base
# (Se elimina la creación de usuario por compatibilidad de la base image)

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["npm", "start"]