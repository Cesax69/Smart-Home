export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMockData: false, // Desactivado para usar backend real y base de datos
  services: {
    auth: 'http://localhost:3001/api',      // Apuntar directo al users-service para login real
    tasks: 'http://localhost:3000/api',     // A través del API Gateway
    notifications: 'http://localhost:3000/api', // A través del API Gateway
    fileUpload: 'http://localhost:3000/api',     // A través del API Gateway
    aiQuery: 'http://localhost:3006/api/ai-query' // Unificado al puerto por defecto del backend
  },
  // Conectar Socket.IO directamente al microservicio de notificaciones (el gateway actual no proxy WebSocket)
  notificationsSocketUrl: 'http://localhost:3004'
};