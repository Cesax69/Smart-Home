# Smart Home PWA - Frontend Simplificado

## 🎯 Cambios Realizados

### 1. Simplificación del Login
- **Antes**: Formulario tradicional con usuario/contraseña
- **Ahora**: Dos botones simples:
  - "Jefe del Hogar" → Dashboard Admin
  - "Miembro" → Dashboard Member

### 2. Eliminación del Registro
- Se removió completamente la funcionalidad de registro
- Se eliminaron componentes, servicios y modelos relacionados
- Simplificación del flujo de usuario

### 3. Dashboards Específicos por Rol

#### Dashboard Admin (Jefe del Hogar)
- Gestión de usuarios
- Administración de tareas
- Control del hogar
- Reportes y estadísticas
- Configuración del sistema
- Seguridad

#### Dashboard Member (Miembro)
- Vista de tareas asignadas
- Control básico de dispositivos
- Perfil personal
- Notificaciones
- Actividad personal
- Ayuda

### 4. Preparación para Backend

#### Configuración de Entornos
- `environment.ts` - Desarrollo con datos mock
- `environment.prod.ts` - Producción con APIs reales

#### Servicios Preparados
- **AuthService**: Listo para transición mock → backend real
- **TaskService**: Configurado con URLs de microservicios
- Flag `useMockData` para alternar entre mock y backend

#### URLs de Microservicios
```typescript
services: {
  auth: 'http://localhost:3001/api',      // Users Service
  tasks: 'http://localhost:3002/api',     // Tasks Service  
  notifications: 'http://localhost:3003/api', // Notifications Service
  fileUpload: 'http://localhost:3005/api'     // File Upload Service
}
```

## 🚀 Cómo Usar

### Desarrollo Actual (Mock)
1. `npm start` - Inicia el servidor de desarrollo
2. Navegar a `http://localhost:4200`
3. Hacer clic en "Jefe del Hogar" o "Miembro"
4. Acceder al dashboard correspondiente

### Transición a Backend Real
1. Cambiar `useMockData: false` en `environment.ts`
2. Asegurar que los microservicios estén ejecutándose
3. La aplicación automáticamente usará las APIs reales

## 🏗️ Arquitectura

### Componentes Principales
- `LoginComponent` - Login simplificado por roles
- `DashboardAdminComponent` - Dashboard para jefe del hogar
- `DashboardMemberComponent` - Dashboard para miembros
- `TaskCreateComponent` - Creación de tareas
- `TaskListComponent` - Lista de tareas
- `MyTasksComponent` - Tareas del usuario actual

### Servicios
- `AuthService` - Autenticación y gestión de usuarios
- `TaskService` - Gestión de tareas
- Guards de autenticación y autorización

### Modelos
- `User` - Modelo de usuario con roles
- `Task` - Modelo de tareas
- `LoginRequest/Response` - Interfaces de autenticación

## 🔧 Configuración

### Variables de Entorno
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMockData: true, // Cambiar a false para backend real
  services: {
    auth: 'http://localhost:3001/api',
    tasks: 'http://localhost:3002/api',
    notifications: 'http://localhost:3003/api',
    fileUpload: 'http://localhost:3005/api'
  }
};
```

## 📋 Estado del Proyecto

### ✅ Completado
- [x] Login simplificado con botones por rol
- [x] Dashboards específicos para cada rol
- [x] Eliminación completa del registro
- [x] Limpieza de código no utilizado
- [x] Preparación para comunicación con backend
- [x] Configuración de entornos
- [x] Servicios preparados para transición

### 🔄 Próximos Pasos
- [ ] Conectar con microservicios del backend
- [ ] Implementar autenticación real
- [ ] Agregar funcionalidades específicas de cada dashboard
- [ ] Implementar notificaciones en tiempo real
- [ ] Agregar control de dispositivos IoT

## 🎨 UI/UX

### Características
- Interfaz moderna con Angular Material
- Responsive design
- Iconos intuitivos
- Colores diferenciados por rol
- Navegación simplificada

### Paleta de Colores
- **Admin**: Azul (primary) - Autoridad y confianza
- **Member**: Verde (accent) - Armonía y colaboración
- **Warnings**: Naranja - Atención
- **Errors**: Rojo - Alertas

## 🔒 Seguridad

### Implementado
- Guards de autenticación
- Protección de rutas por rol
- Gestión segura de tokens
- Validación de permisos

### Por Implementar
- Autenticación JWT real
- Refresh tokens
- Encriptación de datos sensibles
- Auditoría de acciones

---

**Versión**: 2.0.0 - Simplificado  
**Fecha**: Enero 2025  
**Estado**: Listo para integración con backend