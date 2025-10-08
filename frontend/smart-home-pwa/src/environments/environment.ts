export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMockData: true, // Cambiado a true para usar datos mock mientras no hay backend
  services: {
    auth: 'http://localhost:3000/api',      // API Gateway -> Users Service
    tasks: 'http://localhost:3000/api',     // API Gateway -> Tasks Service  
    notifications: 'http://localhost:3000/api', // API Gateway -> Notifications Service
    fileUpload: 'http://localhost:3000/api'     // API Gateway -> File Upload Service
  }
};