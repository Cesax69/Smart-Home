export const environment = {
  production: false,
  useMockData: false,
  apiUrl: 'http://localhost:3000/api',
  services: {
    auth: 'http://localhost:3000/api',
    tasks: 'http://localhost:3000/api',
    notifications: 'http://localhost:3000/api',
    fileUpload: 'http://localhost:3000/api/files',
    aiQuery: 'http://localhost:3006/api/ai-query'
  },
  // Conectar Socket.IO a través del API Gateway (usa polling si WebSocket no está proxyado)
  notificationsSocketUrl: 'http://localhost:3000'
};