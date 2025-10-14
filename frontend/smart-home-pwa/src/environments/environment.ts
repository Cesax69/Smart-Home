export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  useMockData: false, // Cambiado a false para usar backend real
  services: {
    auth: 'http://localhost:3000/api',      // A través del API Gateway
    tasks: 'http://localhost:3000/api',     // A través del API Gateway
    notifications: 'http://localhost:3000/api', // A través del API Gateway
    fileUpload: 'http://localhost:3000/api'     // A través del API Gateway
  }
};