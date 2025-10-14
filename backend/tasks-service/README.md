# Tasks Service - Microservicio de Gestión de Tareas

Microservicio completo para la gestión de tareas del hogar desarrollado con Node.js, Express, TypeScript y PostgreSQL.

## 🚀 Características

- **API RESTful completa** con operaciones CRUD
- **Base de datos PostgreSQL** con esquema dedicado
- **TypeScript** para tipado estático y mejor desarrollo
- **Validación de datos** robusta en todos los endpoints
- **Eventos** para integración con servicio de notificaciones
- **Health check** para monitoreo del servicio
- **Filtros avanzados** por usuario y estado
- **Manejo de errores** comprehensivo
- **Logging** detallado de operaciones

## 📁 Estructura del Proyecto

```
tasks-service/
├── src/
│   ├── config/
│   │   └── database.ts          # Configuración y conexión PostgreSQL
│   ├── controllers/
│   │   └── taskController.ts    # Controladores de endpoints
│   ├── routes/
│   │   ├── taskRoutes.ts        # Rutas de tareas
│   │   └── index.ts             # Rutas principales
│   ├── services/
│   │   └── taskService.ts       # Lógica de negocio
│   ├── types/
│   │   └── Task.ts              # Interfaces TypeScript
│   └── app.ts                   # Servidor principal
├── dist/                        # Archivos compilados
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
└── README.md
```

## 🛠️ Instalación

1. **Clonar e instalar dependencias:**
```bash
cd tasks-service
npm install
```

2. **Configurar variables de entorno:**
```bash
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL
```

3. **Configurar PostgreSQL:**
   - Crear base de datos `tasks_db` (o usa Docker Compose que la crea por ti)
   - El esquema es `public` y las tablas se crean mediante `backend/setup-tasks-database.sql`

4. **Compilar TypeScript:**
```bash
npm run build
```

## 🚀 Ejecución

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm start
```

El servicio estará disponible en: `http://localhost:3002`

## 🚢 Ejecución con Docker (recomendado)

Para un arranque limpio y reproducible del ecosistema completo:

```powershell
docker compose down -v
docker compose up -d --build
```

Estado de datos iniciales:
- `tasks_db`: solo esquema de tablas, sin datos de ejemplo.
- `users_db`: 5 usuarios iniciales precargados (papa, mama, hijo1, hija1, hijo2).

Nota: para asignar tareas a usuarios reales, obtén los `userId` consultando el Users Service o ejecuta `node backend/users-service/scripts/verify-users.js` desde la raíz del proyecto.

## 📊 Modelo de Datos

El esquema completo de tablas (tareas, asignaciones, archivos, subtareas) está definido en `backend/setup-tasks-database.sql` y se aplica automáticamente al iniciar con Docker Compose.

## 🌐 API Endpoints

### Health Check
- **GET** `/api/health` - Verificar estado del servicio

### Gestión de Tareas

#### Crear Tarea
- **POST** `/api/tasks`
- **Body:**
```json
{
  "description": "Limpiar la cocina",
  "status": "pendiente",
  "assignedUserId": 1,
  "fileUrl": "https://example.com/image.jpg"
}
```

#### Obtener Todas las Tareas
- **GET** `/api/tasks`
- **Query Parameters:**
  - `userId`: Filtrar por usuario asignado
  - `status`: Filtrar por estado

#### Obtener Tarea por ID
- **GET** `/api/tasks/:id`

#### Actualizar Tarea
- **PUT** `/api/tasks/:id`
- **Body:** (campos opcionales)
```json
{
  "description": "Nueva descripción",
  "status": "en_proceso",
  "assignedUserId": 2,
  "fileUrl": "nueva-url"
}
```

#### Eliminar Tarea
- **DELETE** `/api/tasks/:id`

## 📝 Ejemplos de Uso

### Crear una nueva tarea
```bash
curl -X POST http://localhost:3002/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Aspirar la sala",
    "assignedUserId": 1,
    "status": "pendiente"
  }'
```

### Obtener todas las tareas
```bash
curl http://localhost:3002/api/tasks
```

### Filtrar tareas por usuario
```bash
curl http://localhost:3002/api/tasks?userId=1
```

### Filtrar tareas por estado
```bash
curl http://localhost:3002/api/tasks?status=pendiente
```

### Actualizar una tarea
```bash
curl -X PUT http://localhost:3002/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completada"
  }'
```

### Eliminar una tarea
```bash
curl -X DELETE http://localhost:3002/api/tasks/1
```

## 🔧 Scripts Disponibles

- `npm start` - Ejecutar en producción
- `npm run dev` - Ejecutar en desarrollo con nodemon
- `npm run build` - Compilar TypeScript
- `npm run build:watch` - Compilar en modo watch

## 🎯 Eventos de Notificación

El servicio simula la publicación de eventos para integración con un servicio de notificaciones:

- **TareaCreada**: Al crear una nueva tarea
- **TareaActualizada**: Al actualizar una tarea existente
- **TareaEliminada**: Al eliminar una tarea

Ejemplo de log:
```
EVENTO PUBLICADO: TareaCreada, UsuarioID: 1, TareaID: 5, Descripción: Limpiar la cocina
```

## 🏗️ Arquitectura

- **Controladores**: Manejan las peticiones HTTP y validaciones
- **Servicios**: Contienen la lógica de negocio
- **Configuración**: Gestión de base de datos y variables de entorno
- **Tipos**: Interfaces TypeScript para tipado estático
- **Rutas**: Definición de endpoints y middlewares

## 🔒 Variables de Entorno

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tasks_db
DB_USER=postgres
DB_PASSWORD=tu_password
DB_SCHEMA=public

# Servidor
PORT=3002
NODE_ENV=development
LOG_LEVEL=info
```

## 🚨 Manejo de Errores

El servicio incluye manejo comprehensivo de errores:
- Validación de datos de entrada
- Errores de base de datos
- Recursos no encontrados (404)
- Errores internos del servidor (500)

## 🔄 Próximos Pasos

1. Implementar autenticación y autorización
2. Agregar paginación para listado de tareas
3. Implementar búsqueda por texto
4. Agregar métricas y monitoreo
5. Agregar tests unitarios e integración
6. Configurar CI/CD pipeline

## 📞 Soporte

Para reportar problemas o solicitar nuevas características, crear un issue en el repositorio del proyecto.