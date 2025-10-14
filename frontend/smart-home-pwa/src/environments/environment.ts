export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMockData: false, // Cambiado a false para usar backend real
  services: {
    auth: 'http://localhost:3000/api/auth',
    users: 'http://localhost:3000/api/users',
    tasks: 'http://localhost:3000/api',
    notifications: 'http://localhost:3000/api/notifications',
    // Socket directo (gateway puede no soportar WebSocket proxy)
    notificationsSocket: 'http://localhost:3004',
    fileUpload: 'http://localhost:3000/api/files'
  }
};