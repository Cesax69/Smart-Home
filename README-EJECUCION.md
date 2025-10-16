# 🏠 Smart Home - Guía de Ejecución Rápida

## 📋 Requisitos Previos

- **Node.js** 18+ instalado
- **PostgreSQL** instalado y ejecutándose
- **Redis** instalado y ejecutándose
- **PowerShell** (Windows)

## 🚀 Ejecución Rápida (3 pasos)

### 1️⃣ Configurar Base de Datos
```bash
# Crear y poblar bases de datos (si no usas Docker Compose)
createdb -U postgres users_db || true
createdb -U postgres tasks_db || true
psql -U postgres -d users_db -f backend/setup-users-database.sql
psql -U postgres -d tasks_db -f backend/setup-tasks-database.sql
```

### 2️⃣ Instalar Dependencias
```powershell
# Ejecutar desde la carpeta Smart-Home
.\install-dependencies.ps1
```

### 3️⃣ Ejecutar Todos los Servicios
```powershell
# Ejecutar desde la carpeta Smart-Home
.\start-all-services.ps1
```

## 🚢 Ejecución con Docker (recomendado)

Para un arranque limpio y reproducible usando Docker Compose:

```powershell
docker compose down -v
docker compose up -d --build
```

Usuarios iniciales creados automáticamente en `users_db`:
- `papa/password` (Jefe del hogar)
- `mama/password` (Miembro)
- `hijo1/password` (Miembro)
- `hija1/password` (Miembro)
- `hijo2/password` (Miembro)

Verificación rápida:
```powershell
node backend/users-service/scripts/verify-users.js
  curl http://localhost:3004/health
  curl http://localhost:3004/redis/health
  curl http://localhost:3004/queue/stats
```

## 🌐 URLs de los Servicios

| Servicio | Puerto | URL |
|----------|--------|-----|
| **API Gateway** | 3000 | http://localhost:3000 |
| **Users Service** | 3001 | http://localhost:3001 |
| **Tasks Service** | 3002 | http://localhost:3002 |
| **File Upload Service** | 3005 | http://localhost:3005 |
| **Notifications Service** | 3004 | http://localhost:3004 |

> Consumo recomendado de APIs: usa el **API Gateway** (`http://localhost:3000`) con rutas `/api/users`, `/api/tasks`, `/api/files`, `/api/notifications` y `/api/auth`.

## 🗄️ Configuración de Base de Datos

### Credenciales
- **Bases de datos:** `users_db` y `tasks_db`
- **Usuario:** `postgres`
- **Contraseña:** `linux`
- **Esquema por defecto:** `public`

Los esquemas por microservicio han sido unificados bajo `public`. Los scripts `backend/setup-users-database.sql` y `backend/setup-tasks-database.sql` crean las tablas necesarias.

### Redis
- **Host:** `REDIS_HOST` (por defecto `smart-home-redis` con Docker, `localhost` local)
- **Puerto:** `REDIS_PORT` (por defecto `6379`)
- **Contraseña:** `REDIS_PASSWORD`
- **Base:** `REDIS_DB` (por defecto `0`)

Notas de notificaciones (Redis):
- Cola única: `queue:notifications`
- Registro temporal: `notification:{id}` (TTL 7 días)
- Canal Pub/Sub global: `notification:new`

## 🔧 Comandos Individuales

Si prefieres ejecutar los servicios individualmente:

```powershell
# Users Service
cd users-service
npm run dev

# Tasks Service  
cd tasks-service
npm run dev

# File Upload Service
cd file-upload-service
npm run dev

# Notifications Service
cd notifications-service
npm run dev

# API Gateway (ejecutar al final)
cd api-gateway
npm run dev
```

## 🛑 Detener Servicios

- **Script automático:** Presiona `Ctrl+C` en la ventana del script
- **Manual:** Cierra las ventanas de terminal de cada servicio

## 📁 Estructura de Archivos Creados

```
Smart-Home/
├── 📄 start-all-services.ps1      # Script principal de ejecución
├── 📄 install-dependencies.ps1    # Script de instalación de dependencias
├── 📄 backend/setup-users-database.sql    # Script de BD de usuarios
├── 📄 backend/setup-tasks-database.sql    # Script de BD de tareas
├── 📄 README-EJECUCION.md         # Esta guía
├── api-gateway/.env               # Configuración API Gateway
├── users-service/.env             # Configuración Users Service
├── tasks-service/.env             # Configuración Tasks Service
├── file-upload-service/.env       # Configuración File Upload Service
└── notifications-service/.env     # Configuración Notifications Service
```

## ⚠️ Solución de Problemas

### Puerto en uso
```powershell
# Verificar qué proceso usa un puerto
netstat -ano | findstr :3000

# Terminar proceso por PID
taskkill /PID <PID> /F
```

### PostgreSQL no conecta
1. Verificar que PostgreSQL esté ejecutándose
2. Verificar credenciales en archivos `.env`
3. Verificar que las bases de datos `users_db` y `tasks_db` existan

### Redis no conecta
```powershell
# Verificar Redis local
Test-NetConnection localhost -Port 6379
```
1. Verificar que Redis está ejecutándose
2. Confirmar variables `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB` en `notifications-service/.env`

## ✅ Pruebas de Cola y WebSocket (Notificaciones)

### Encolar una notificación (vía API Gateway)
```bash
curl -X POST http://localhost:3000/api/notifications/notify/queue \
  -H "Content-Type: application/json" \
  -d '{
    "type": "task_completed",
    "channels": ["app"],
    "data": {
      "userId": "1",
      "taskId": "42",
      "taskTitle": "Sacar la basura",
      "message": "Juan ha completado la tarea"
    }
  }'
```

### Escuchar en tiempo real (Socket.IO)
- Conexión: `ws://localhost:3004`
- Unirse a sala: emitir `join_user_room` con `{ userId }`
- Evento de entrega: `new_notification`

Ejemplo cliente (Node):
```js
// Instalar: npm i socket.io-client
import { io } from 'socket.io-client';
const socket = io('http://localhost:3004', { transports: ['websocket'] });
socket.on('connect', () => {
  socket.emit('join_user_room', { userId: '1' });
});
socket.on('new_notification', (n) => console.log('Notificación:', n));
```

### Dependencias faltantes
```powershell
# Reinstalar dependencias en un servicio específico
cd <nombre-servicio>
rm -rf node_modules
npm install
```

## 🎯 Próximos Pasos

1. **Desarrollo Frontend:** El directorio `smart-home-ui` está listo para tu aplicación web
2. **Testing:** Cada servicio tiene endpoints listos para probar
3. **Documentación API:** Considera agregar Swagger/OpenAPI

---

**¡Tu ecosistema Smart Home está listo para funcionar! 🎉**