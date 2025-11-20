export const environment = {
  production: false,
  useMockData: false,
  apiUrl: 'http://localhost:3000/api',
  services: {
    auth: 'http://localhost:3000/api',
    tasks: 'http://localhost:3000/api',
    notifications: 'http://localhost:3004',
    fileUpload: 'http://localhost:3000/api/files',
    aiQuery: 'http://localhost:3006/api/ai-query',
    
  },
  // Conectar Socket.IO directamente al microservicio de notificaciones en desarrollo
  notificationsSocketUrl: 'http://localhost:3004'
};