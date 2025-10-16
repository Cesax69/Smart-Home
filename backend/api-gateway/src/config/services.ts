/**
 * Configuración de Microservicios
 * Define las URLs y configuraciones de todos los servicios del ecosistema Smart Home
 */

export interface ServiceConfig {
  name: string;
  url: string;
  path: string;
  description: string;
  healthEndpoint?: string;
  // Algunos servicios montan rutas en la raíz y requieren quitar el prefijo /api
  stripApiPrefix?: boolean;
}

/**
 * Configuración de todos los microservicios
 */
export const SERVICES: Record<string, ServiceConfig> = {
  USERS: {
    name: 'Users Service',
    url: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
    path: '/api/users',
    description: 'Servicio de gestión de usuarios',
    healthEndpoint: '/health'
  },
  AUTH: {
    name: 'Authentication Service',
    url: process.env.USERS_SERVICE_URL || 'http://localhost:3001',
    path: '/api/auth',
    description: 'Servicio de autenticación de usuarios',
    healthEndpoint: '/health'
  },
  TASKS: {
    name: 'Tasks Service', 
    url: process.env.TASKS_SERVICE_URL || 'http://localhost:3002',
    path: '/api/tasks',
    description: 'Servicio de gestión de tareas',
    healthEndpoint: '/health'
  },
  FILES: {
    name: 'File Upload Service',
    // En Docker se usa FILE_UPLOAD_SERVICE_URL; mantenemos compatibilidad con ambos nombres
    url: process.env.FILE_UPLOAD_SERVICE_URL || process.env.FILES_SERVICE_URL || 'http://localhost:3005',
    path: '/api/files',
    description: 'Servicio de subida y gestión de archivos',
    healthEndpoint: '/health',
    stripApiPrefix: true
  },
  NOTIFICATIONS: {
    name: 'Notifications Service',
    url: process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3004',
    path: '/api/notifications',
    description: 'Servicio de notificaciones en tiempo real',
    healthEndpoint: '/health',
    stripApiPrefix: true
  }
};

/**
 * Configuración del proxy
 */
export const PROXY_CONFIG = {
  timeout: parseInt(process.env.PROXY_TIMEOUT || '30000'),
  limit: process.env.PROXY_LIMIT || '10mb',
  preserveHostHdr: true,
  parseReqBody: true,
  memoizeHost: false
};

/**
 * Obtener la configuración de un servicio por su path
 */
export const getServiceByPath = (path: string): ServiceConfig | undefined => {
  // Ordenar servicios por longitud de path descendente para evaluar rutas más específicas primero
  const sortedServices = Object.values(SERVICES).sort((a, b) => b.path.length - a.path.length);
  return sortedServices.find(service => path.startsWith(service.path));
};

/**
 * Obtener todas las configuraciones de servicios
 */
export const getAllServices = (): ServiceConfig[] => {
  return Object.values(SERVICES);
};
