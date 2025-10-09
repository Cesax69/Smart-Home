# 🏠 Smart Home - Sistema de Gestión Familiar con PWA

## 🚀 Configuración Ultra-Rápida (Docker Compose)

```powershell
docker-compose up -d --build
```
Esto inicia PostgreSQL (users_db y tasks_db) y todos los microservicios listos para usar.

## 🎯 Arquitectura del Sistema

### 🏗️ Estructura del Proyecto
```
Smart-Home/
├── backend/                 # Microservicios Node.js
│   ├── api-gateway/        # Punto de entrada principal
│   ├── users-service/      # Gestión de usuarios y roles
│   ├── tasks-service/      # Gestión de tareas familiares
│   ├── file-upload-service/# Subida y organización de archivos
│   ├── notifications-service/# Sistema de notificaciones
└── frontend/               # Aplicación PWA Angular
    └── smart-home-pwa/     # Interfaz web progresiva
```

### 🔄 Arquitectura Simplificada
- **PostgreSQL**: Almacena usuarios, roles y tareas familiares
- **Almacenamiento de Archivos**: Integración con Google Drive vía file-upload-service
- **PWA Angular**: Interfaz moderna con funcionalidad offline
- **Roles Familiares**: Jefe de hogar y miembros de familia con permisos diferenciados

El almacenamiento local directo fue deprecado. Los contenedores montan volúmenes para `uploads`, `temp` y `quarantine` para manejo temporal; los archivos finales se almacenan en Google Drive.

### ⚡ Arranque rápido
Usa Docker Compose para levantar todo el sistema con un solo comando.

## 🛠️ Configuración Manual (Opcional)

### Configurar PostgreSQL (manual)
```powershell
# Crear y poblar bases de datos (usuarios y tareas)
psql -U postgres -h localhost -d users_db -f backend/setup-users-database.sql
psql -U postgres -h localhost -d tasks_db -f backend/setup-tasks-database.sql
```

### Iniciar Servicios Individualmente
```powershell
# Backend (en ventanas separadas)
cd backend/api-gateway && npm start
cd backend/users-service && npm start
cd backend/tasks-service && npm start
cd backend/file-upload-service && npm start
cd backend/notifications-service && npm start

# Frontend PWA
cd frontend/smart-home-pwa && npm start
```

## 🌐 URLs de Servicios

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **PWA Angular** | http://localhost:4200 | Interfaz principal de la aplicación |
| **API Gateway** | http://localhost:3000 | Punto de entrada de APIs |
| **Users Service** | http://localhost:3001 | Gestión de usuarios y roles |
| **Tasks Service** | http://localhost:3002 | Gestión de tareas familiares |
| **File Upload** | http://localhost:3004 | Subida y organización de archivos |
| **Notifications** | http://localhost:3003 | Sistema de notificaciones |

## 🗄️ Configuración de Base de Datos

### PostgreSQL
- **Bases de datos**: `users_db` y `tasks_db`
- **Usuario**: `postgres`
- **Contraseña**: `linux`
- **Esquema**: `public`

## 📋 Características Mejoradas

### 🔧 Gestión de Archivos
- ✅ Organización automática por tipo
- ✅ Nombres únicos con timestamp
- ✅ Carpetas por usuario (opcional)
- ✅ Limpieza automática de temporales
- ✅ Estadísticas de almacenamiento

### 🚀 Notificaciones
- Implementación actual basada en endpoints del `notifications-service` (sin Redis).

### 🛡️ Seguridad
- ✅ Validación de tipos de archivo
- ✅ Límites de tamaño
- ✅ Cuarentena para archivos sospechosos

## 🔍 Verificación del Sistema

### Verificar Servicios
```powershell
# Verificar PostgreSQL
Test-NetConnection localhost -Port 5432

# Verificar servicios web
curl http://localhost:3000/health
```

### Logs y Monitoreo
- Cada servicio tiene su propia ventana de PowerShell
- Logs en tiempo real visibles
- Fácil reinicio individual de servicios

## 🚨 Solución de Problemas

### Puerto Ocupado
```powershell
# Ver qué proceso usa el puerto
netstat -ano | findstr :3000
```

### Dependencias
```powershell
# Reinstalar dependencias específicas
cd users-service
npm install
```

### Base de Datos
Para recrear los esquemas manualmente, utiliza los scripts por servicio:
```powershell
psql -U postgres -d users_db -f backend/setup-users-database.sql
psql -U postgres -d tasks_db -f backend/setup-tasks-database.sql
```

## 🎉 Ventajas de esta Configuración

1. **🚀 Más Rápido**: Setup en 3 comandos
2. **🧠 Más Inteligente**: Detección automática de problemas
3. **📁 Más Organizado**: Archivos categorizados automáticamente
4. **⚡ Más Eficiente**: Redis para datos temporales
5. **🔧 Más Fácil**: Scripts que se encargan de todo
6. **🐳 Más Flexible**: Docker opcional pero recomendado

## 📞 Próximos Pasos

1. **Ejecutar**: `.\setup-infrastructure.ps1`
2. **Probar**: Acceder a http://localhost:3000
3. **Desarrollar**: Cada servicio es independiente
4. **Escalar**: Fácil migración a producción

---

**¿Necesitas ayuda?** Todos los scripts incluyen verificaciones y mensajes de ayuda detallados.