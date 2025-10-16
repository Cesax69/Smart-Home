# Notifications Service — Notificaciones en Tiempo Real

Microservicio para gestionar y entregar notificaciones en tiempo real dentro del ecosistema Smart Home.

## 🚀 Características

- API REST mínima centrada en `POST /notify/queue` y diagnósticos
- Entrega en tiempo real vía WebSockets (Socket.IO) suscrito a Redis
- Cola única `queue:notifications` para desacoplar producción y entrega
- Persistencia ligera en Redis: `notification:{id}` con TTL (7 días)
- Pub/Sub simplificado: canal global `notification:new`
- Health y diagnóstico: `GET /health`, `GET /redis/health`, `GET /queue/stats`

## 🔌 Puertos y URLs

- Servicio (interno): `http://localhost:3004`
- Acceso recomendado vía API Gateway: `http://localhost:3000/api/notifications`

## 🚢 Ejecución con Docker (recomendado)

Arranque limpio y reproducible del stack completo:

```powershell
docker compose down -v
docker compose up -d --build
```

Estado de datos iniciales:
- Redis como único backend: sin tablas SQL.
- Las configuraciones de usuario pueden almacenarse en `user:{userId}:notification_settings` (opcional).

## 🧱 Backend de Datos (Redis)

- Sin scripts SQL.
- Claves y canales usados:
  - `queue:notifications` — Lista FIFO de trabajos de notificación
  - `notification:{id}` — Registro de notificación temporal (TTL 7 días)
  - `pubsubChannel` — `notification:new` (canal global único)
- Claves eliminadas/no usadas en esta versión:
  - `user:{userId}:notifications:index`, `user:{userId}:notifications:unread`
  - `notification:history:{id}`, `user:{userId}:notification_history`

## 📡 Endpoints Principales

- `POST /notify/queue` — Agrega una notificación a la cola
- `GET /queue/stats` — Estadísticas de la cola
- `GET /redis/health` — Estado de Redis
- `GET /health` — Health del servicio

Endpoints no soportados (manejados en frontend/cliente):
- `GET /notifications/:userId` — No soportado
- `PUT /notifications/:notificationId/read` — No soportado
- `PUT /notifications/user/:userId/read-all` — No soportado
- `GET /notifications/:userId/unread-count` — No soportado
- `DELETE /notifications/:notificationId` — No soportado

### Ejemplo: agregar a la cola

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

## 🔌 Tiempo real (Socket.IO)

- Conexión: `ws://localhost:3004` (mismo puerto del servicio)
- Unirse a sala del usuario: emitir `join_user_room` con `{ userId }`
- Evento de notificación: `new_notification` con payload amigable para UI

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

## ❤️ Health Check

```http
GET /health
```

Respuesta:
```json
{
  "success": true,
  "message": "Notifications Service funcionando",
  "service": "notifications-service",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

---

Notifications Service — Puerto 3004 (interno). Consumir vía `http://localhost:3000/api/notifications`.