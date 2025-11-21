# Etapa de build: compila TypeScript a dist dentro de la imagen
FROM node:18-alpine AS builder
WORKDIR /app

# Copiar archivos de dependencias e instalar (incluye devDependencies para compilar)
COPY package*.json ./
RUN npm ci

# Copiar el resto del código y compilar
COPY . .
RUN npm run build

# Etapa de runtime: imagen liviana con solo dependencias de producción
FROM node:18-alpine AS runner
WORKDIR /app

# Copiar package.json y lock, instalar solo producción
COPY package*.json ./
RUN npm ci --only=production

# Copiar artefactos compilados desde el builder
COPY --from=builder /app/dist ./dist

# Exponer puerto
EXPOSE 3007

# Comando de inicio
CMD ["node", "dist/server.js"]
