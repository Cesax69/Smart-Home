export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMockData: false, // Cambiado a false para usar backend real
  services: {
    auth: 'http://localhost:3001/api',      // Users Service directo
    tasks: 'http://localhost:3002/api',     // Tasks Service directo
    notifications: 'http://localhost:3003/api', // Notifications Service directo
    fileUpload: 'http://localhost:3005/api'     // File Upload Service directo (port 3005)
  }
};