export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMockData: false, // Cambiado a false para usar microservicios reales
  services: {
    auth: 'http://localhost:3000/api',      // API Gateway -> Users Service
    tasks: 'http://localhost:3000/api',     // API Gateway -> Tasks Service  
    notifications: 'http://localhost:3000/api', // API Gateway -> Notifications Service
    fileUpload: 'http://localhost:3000/api'     // API Gateway -> File Upload Service
  }
};