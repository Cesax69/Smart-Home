# Users Service - Microservicio de Usuarios

Microservicio para la gestión de usuarios en el sistema Smart Home, desarrollado con Node.js, Express y TypeScript.

## 🚀 Características

- **API RESTful** con endpoints para gestión de usuarios
- **TypeScript** para tipado estático y mejor desarrollo
- **Express.js** como framework web
- **Arquitectura escalable** con separación de responsabilidades
- **Datos mockeados** para desarrollo y pruebas

## 📁 Estructura del Proyecto

```
users-service/
├── src/
│   ├── controllers/     # Controladores de las rutas
│   ├── routes/         # Definición de rutas
│   ├── services/       # Lógica de negocio
│   ├── types/          # Definiciones de tipos TypeScript
│   └── app.ts          # Servidor principal
├── dist/               # Código compilado (generado)
├── package.json        # Dependencias y scripts
├── tsconfig.json       # Configuración de TypeScript
└── README.md          # Documentación
```

## 🛠️ Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Compilar el proyecto:
```bash
npm run build
```

3. Ejecutar en modo desarrollo:
```bash
npm run dev
```

4. Ejecutar en producción:
```bash
npm start
```

## 📡 API Endpoints

### Base URL
```
http://localhost:3001
```

### Endpoints Disponibles

#### 1. Health Check
- **GET** `/api/health`
- **Descripción**: Verifica el estado del servicio
- **Respuesta**:
```json
{
  "success": true,
  "message": "Users Service está funcionando correctamente",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "users-service",
  "version": "1.0.0"
}
```

#### 2. Obtener todos los usuarios
- **GET** `/api/users`
- **Descripción**: Retorna la lista completa de usuarios
- **Respuesta**:
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Jefe de Hogar", "role": "admin" },
    { "id": 2, "name": "Miembro 1", "role": "user" }
  ],
  "message": "Usuarios obtenidos exitosamente"
}
```

#### 3. Obtener usuario por ID
- **GET** `/api/users/:id`
- **Descripción**: Retorna un usuario específico por su ID
- **Parámetros**: 
  - `id` (number): ID del usuario
- **Respuesta exitosa**:
```json
{
  "success": true,
  "data": { "id": 1, "name": "Jefe de Hogar", "role": "admin" },
  "message": "Usuario obtenido exitosamente"
}
```
- **Respuesta error (404)**:
```json
{
  "success": false,
  "message": "Usuario no encontrado"
}
```

## 🧪 Pruebas

Puedes probar los endpoints usando curl, Postman o cualquier cliente HTTP:

```bash
# Health check
curl http://localhost:3001/api/health

# Obtener todos los usuarios
curl http://localhost:3001/api/users

# Obtener usuario por ID
curl http://localhost:3001/api/users/1
```

## 🔧 Scripts Disponibles

- `npm run dev`: Ejecuta el servidor en modo desarrollo con recarga automática
- `npm run build`: Compila el código TypeScript a JavaScript
- `npm run build:watch`: Compila en modo watch (recarga automática)
- `npm start`: Ejecuta el servidor compilado en modo producción

## 🏗️ Arquitectura

El microservicio sigue una arquitectura en capas:

1. **Rutas** (`routes/`): Definen los endpoints y delegan a los controladores
2. **Controladores** (`controllers/`): Manejan las peticiones HTTP y respuestas
3. **Servicios** (`services/`): Contienen la lógica de negocio
4. **Tipos** (`types/`): Definiciones de TypeScript para tipado estático

## 🚀 Próximos Pasos

- Integración con base de datos
- Autenticación y autorización
- Validación de datos de entrada
- Tests unitarios y de integración
- Logging estructurado
- Métricas y monitoreo