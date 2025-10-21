# Notifications Service — Notificaciones en Tiempo Real

Microservicio para gestionar y entregar notificaciones en tiempo real dentro del ecosistema Smart Home.

## 🚀 Características

- API REST mínima centrada en `POST /notify/queue` y diagnósticos
- Entrega en tiempo real vía WebSockets (Socket.IO) suscrito a Redis
- Cola única `queue:notification` para desacoplar producción y entrega
- Persistencia única en Redis: Hash `notification` (cada campo = notificación) con expiración lógica `expires_at` (por defecto 7 días) y limpieza periódica
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
  - `queue:notification` — Lista FIFO de trabajos de notificación
  - `notification` — Hash único de notificaciones (campo = `notification_id`) con metadatos, `recipients`, `readBy`, `expires_at`
  - `pubsubChannel` — `notification:new` (canal global único)
- Limpieza: se realiza por lógica interna leyendo `expires_at` y eliminando del Hash cuando expira

## 🧩 Consumo básico desde frontend

```ts
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