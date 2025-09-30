export const environment = {
  production: true,
  apiUrl: 'https://api.smarthome.com/api',
  useMockData: false,
  services: {
    auth: 'https://api.smarthome.com/users/api',
    tasks: 'https://api.smarthome.com/tasks/api',
    notifications: 'https://api.smarthome.com/notifications/api',
    fileUpload: 'https://api.smarthome.com/files/api'
  }
};