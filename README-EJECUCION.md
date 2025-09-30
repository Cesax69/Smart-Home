# 🏠 Smart Home - Guía de Ejecución Rápida

## 📋 Requisitos Previos

- **Node.js** 18+ instalado
- **PostgreSQL** instalado y ejecutándose
- **PowerShell** (Windows)

## 🚀 Ejecución Rápida (3 pasos)

### 1️⃣ Configurar Base de Datos
```bash
# Conectarse a PostgreSQL como superusuario
psql -U postgres

# Crear la base de datos
CREATE DATABASE smart_home_db;

# Salir de psql
\q

# Ejecutar el script de configuración
psql -U postgres -d smart_home_db -f setup-database.sql
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

## 🌐 URLs de los Servicios

| Servicio | Puerto | URL |
|----------|--------|-----|
| **API Gateway** | 3000 | http://localhost:3000 |
| **Users Service** | 3001 | http://localhost:3001 |
| **Tasks Service** | 3002 | http://localhost:3002 |
| **File Upload Service** | 3003 | http://localhost:3003 |
| **Notifications Service** | 3004 | http://localhost:3004 |

## 🗄️ Configuración de Base de Datos

### Credenciales
- **Host:** localhost
- **Puerto:** 5432
- **Base de datos:** smart_home_db
- **Usuario:** postgres
- **Contraseña:** linux

### Esquemas por Microservicio
- **users_schema** - Gestión de usuarios
- **tasks_schema** - Gestión de tareas
- **files_schema** - Gestión de archivos
- **notifications_schema** - Gestión de notificaciones

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
├── 📄 setup-database.sql          # Script de configuración de BD
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
3. Verificar que la base de datos `smart_home_db` exista

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