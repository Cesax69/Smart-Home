import 'dotenv/config';
import App from './app';

/**
 * Servidor Principal - Notifications Service
 * Punto de entrada del microservicio de notificaciones
 */

// Crear y iniciar la aplicación
async function startServer() {
  const app = new App();
  await app.initialize();
  app.listen();
}

startServer().catch(error => {
  console.error('❌ Error starting server:', error);
  process.exit(1);
});

// Manejo de señales del sistema para cierre graceful
process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM. Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT. Cerrando servidor...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});