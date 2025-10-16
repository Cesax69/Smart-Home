# API Gateway

Puerta de entrada única para todos los microservicios del ecosistema Smart Home.

## 🚀 Características

- Proxy reverso con enrutamiento basado en prefijos (`/api/*`)
- Seguridad: CORS configurable, headers, Helmet
- Logging de peticiones y respuestas proxied
- Reescritura de rutas para servicios que montan en raíz
- Endpoints propios: información, health y estado

## 🌐 Base URL

```
http://localhost:3000
```

## 🔗 Endpoints del Gateway

- `GET /` — Información del gateway y servicios disponibles
- `GET /health` — Health del API Gateway
- `GET /status` — Estado general de microservicios (usa `healthEndpoint` de cada servicio)

## 🧭 Mapeo de Rutas a Servicios

- `GET/POST/PUT/DELETE /api/users/*` → Users Service (`http://localhost:3001`)
- `GET/POST/PUT/DELETE /api/auth/*` → Users Service (módulo de autenticación)
- `GET/POST/PUT/DELETE /api/tasks/*` → Tasks Service (`http://localhost:3002`)
- `GET/POST/PUT/DELETE /api/files/*` → File Upload Service (`http://localhost:3005`)
  - Reescritura: se elimina el prefijo `/api/files` al forward (monta en raíz)
- `GET/POST/PUT/DELETE /api/notifications/*` → Notifications Service (`http://localhost:3004`)
  - Reescritura: se elimina el prefijo `/api/notifications` al forward (monta en raíz)

Notas de salud:
- `FILES` y `NOTIFICATIONS` exponen `GET /health` en raíz; vía Gateway se consulta con `GET /api/files/health` y `GET /api/notifications/health`.
- `USERS` y `TASKS` exponen `GET /api/health` de forma interna; para estado general usa `GET /status` del Gateway o consulta directo `http://localhost:<puerto>/api/health`.

## 📑 Ejemplos

- Usuarios
```bash
# Listado
curl http://localhost:3000/api/users
# Detalle
curl http://localhost:3000/api/users/1
```

- Tareas
```bash
# Listado
curl http://localhost:3000/api/tasks
# Crear
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"description":"Aspirar","assignedUserId":1,"status":"pendiente"}'
```

- Archivos (Google Drive)
```bash
# Subir múltiples
curl -X POST \
  -F "file=@imagen.jpg" \
  -F "file=@otra.png" \
  http://localhost:3000/api/files/upload
# Health del servicio de archivos
curl http://localhost:3000/api/files/health
```

- Notificaciones
```bash
curl -X POST http://localhost:3000/api/notifications/notify/queue \
  -H "Content-Type: application/json" \
  -d '{"type":"task_completed","channels":["app"],"data":{"userId":"1"}}'
```

## ⚙️ Configuración

Variables comunes en `.env` del Gateway:

```env
PORT=3000
# URLs internas (pueden venir del Compose)
USERS_SERVICE_URL=http://localhost:3001
TASKS_SERVICE_URL=http://localhost:3002
NOTIFICATIONS_SERVICE_URL=http://localhost:3004
FILES_SERVICE_URL=http://localhost:3005
# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:4200
```

## 🛡️ Errores y Manejo

- 404: devuelve rutas disponibles del Gateway y servicios configurados
- 503: servicio destino no disponible (errores de proxy)
- 500: errores internos del Gateway

## 🧰 Desarrollo

- Ejecutar en desarrollo: `npm run dev`
- Producción: `npm start`
- Logs: se muestran resoluciones de proxy y estado de respuesta

---

Accede siempre a los microservicios vía el API Gateway (`http://localhost:3000`).