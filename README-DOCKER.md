# 🐳 Smart Home - Guía Docker

## 🚀 Build y Arranque Limpio

Para construir todas las imágenes y arrancar desde cero (sin datos previos):

```powershell
# Desde la carpeta raíz del proyecto Smart-Home
docker compose down -v
docker compose up -d --build
```

Esto elimina contenedores y volúmenes previos y reconstruye el stack con los scripts SQL actualizados.

## 🧱 Servicios y Puertos

- `api-gateway` → `http://localhost:3000`
- `users-service` → `http://localhost:3001`
- `tasks-service` → `http://localhost:3002`
- `notifications-service` → `http://localhost:3004`
- `file-upload-service` → `http://localhost:3005`
- `postgres-users` → `localhost:5432`
- `postgres-tasks` → `localhost:5433`

## 👤 Usuarios Iniciales

Se crean automáticamente en `users_db`:

- `papa/password` – Jefe del hogar
- `mama/password` – Miembro
- `hijo1/password` – Miembro (Hijo)
- `hija1/password` – Miembro (Hija)
- `hijo2/password` – Miembro (Hijo)

## 🗄️ Datos Iniciales por Servicio

- `users_db`: 5 usuarios precargados desde `backend/setup-users-database.sql`.
- `tasks_db`: solo esquema, sin tareas de ejemplo (limpio).
- `notifications_schema`: tablas y funciones; configuraciones por usuario dinámicas.

## 🔎 Verificar Usuarios

```powershell
node backend/users-service/scripts/verify-users.js
```

Muestra `username`, `family_role` y `sub_role` para confirmar los usuarios iniciales.

## 🧰 Helpers

- `build-docker-images.ps1`: compila todas las imágenes.
- `docker-compose.yml`: define servicios, redes y volúmenes.

## 🛑 Apagar y Limpiar

```powershell
docker compose down -v
```

Elimina contenedores y volúmenes para volver a un estado limpio.