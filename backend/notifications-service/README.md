# Notifications Service - Microservicio de Notificaciones

Servicio para gestionar notificaciones del ecosistema Smart Home.

## 🚀 Características

- API REST para gestión y consulta de notificaciones
- Esquema `notifications_schema` con tablas y funciones auxiliares
- Paginación de notificaciones por usuario
- Limpieza automática de notificaciones expiradas
- Health check para monitoreo

## 🔌 Puertos y URLs

- Servicio: `http://localhost:3004`

## 🚢 Ejecución con Docker (recomendado)

Arranque limpio y reproducible del stack completo:

```powershell
docker compose down -v
docker compose up -d --build
```

Estado de datos iniciales:
- `notifications_schema`: tablas, índices y funciones creadas; sin configuraciones de ejemplo por usuario.
- Las configuraciones de `user_notification_settings` se crean dinámicamente por el servicio.

## 🧱 Esquema y Scripts

- Script de inicialización: `backend/setup-notifications-database.sql`
- Incluye: tablas `notifications`, `notification_history`, `user_notification_settings`, índices y funciones (`updated_at`, `cleanup_expired_notifications`, `get_user_notifications_paginated`).

## ❤️ Health Check

```http
GET /api/health
```

Respuesta:
```json
{
  "success": true,
  "message": "Notifications Service está funcionando correctamente",
  "service": "notifications-service",
  "version": "1.0.0"
}
```

## 🔄 Próximos Pasos

- Integrar con preferencias reales del usuario
- Enviar notificaciones push/websocket
- Añadir métricas y monitoreo

---

Notifications Service — Puerto 3004