# 🏠 Smart Home - Sistema de Gestión Familiar con PWA

## 🚀 Configuración Ultra-Rápida (3 pasos)

### 1️⃣ Configurar Infraestructura
```powershell
.\setup-simple.ps1
```
Este script:
- ✅ Configura PostgreSQL para usuarios y tareas
- ✅ Crea toda la estructura de directorios para archivos
- ✅ Verifica que todo esté funcionando correctamente

### 2️⃣ Instalar Dependencias
```powershell
.\install-simple.ps1
```

### 3️⃣ Iniciar Sistema Completo
```powershell
.\start-simple.ps1
```

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
│   └── file-storage/       # Almacenamiento local organizado
└── frontend/               # Aplicación PWA Angular
    └── smart-home-pwa/     # Interfaz web progresiva
```

### 🔄 Arquitectura Simplificada
- **PostgreSQL**: Almacena usuarios, roles y tareas familiares
- **Almacenamiento Local**: Archivos organizados automáticamente por tipo
- **PWA Angular**: Interfaz moderna con funcionalidad offline
- **Roles Familiares**: Jefe de hogar y miembros de familia con permisos diferenciados

### 📁 Organización Automática de Archivos
```
file-storage/
├── uploads/
│   ├── images/          # jpg, png, gif, etc.
│   ├── documents/       # pdf, doc, txt, etc.
│   ├── videos/          # mp4, avi, mov, etc.
│   ├── others/          # otros tipos
│   └── user_X/          # carpetas por usuario (opcional)
├── temp/                # archivos temporales
└── quarantine/          # archivos sospechosos
```

### ⚡ Scripts Simplificados
- **setup-simple.ps1**: Configuración automática de PostgreSQL
- **install-simple.ps1**: Instalación de dependencias para todos los servicios
- **start-simple.ps1**: Inicio coordinado de backend y frontend

## 🛠️ Configuración Manual (Opcional)

### Configurar PostgreSQL
```powershell
# Configurar base de datos
psql -U postgres -h localhost -d smart_home_db -f backend/setup-database.sql
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
| **File Upload** | http://localhost:3003 | Subida y organización de archivos |
| **Notifications** | http://localhost:3004 | Sistema de notificaciones |

## 🗄️ Configuración de Base de Datos

### PostgreSQL
- **Host**: localhost:5432
- **Database**: smart_home_db
- **Usuario**: postgres
- **Contraseña**: linux
- **Esquemas**: `users_schema`, `tasks_schema`

## 📋 Características Mejoradas

### 🔧 Gestión de Archivos
- ✅ Organización automática por tipo
- ✅ Nombres únicos con timestamp
- ✅ Carpetas por usuario (opcional)
- ✅ Limpieza automática de temporales
- ✅ Estadísticas de almacenamiento

### 🚀 Notificaciones con Redis
- ✅ Colas de notificaciones
- ✅ TTL automático
- ✅ Pub/Sub para tiempo real
- ✅ Reintentos automáticos

### 🛡️ Seguridad
- ✅ Validación de tipos de archivo
- ✅ Límites de tamaño
- ✅ Cuarentena para archivos sospechosos
- ✅ Tokens de sesión en Redis

## 🔍 Verificación del Sistema

### Verificar Servicios
```powershell
# Verificar PostgreSQL
Test-NetConnection localhost -Port 5432

# Verificar Redis
Test-NetConnection localhost -Port 6379

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
```powershell
# Recrear esquemas
psql -U postgres -d smart_home_db -f setup-database.sql
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