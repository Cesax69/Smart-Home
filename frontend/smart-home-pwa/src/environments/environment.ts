export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMockData: false, // Cambiado a false para usar microservicios reales
  services: {
    auth: 'http://localhost:3001/api',      // Users Service
    tasks: 'http://localhost:3002/api',     // Tasks Service  
    notifications: 'http://localhost:3003/api', // Notifications Service
    fileUpload: 'http://localhost:3004/api'     // File Upload Service
  }
};