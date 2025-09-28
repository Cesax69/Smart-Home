import APIGateway from './app';

/**
 * Servidor principal del API Gateway
 * Punto de entrada para inicializar y ejecutar el gateway
 */

// Crear instancia del API Gateway
const gateway = new APIGateway();

// Iniciar el servidor
gateway.listen();

// Manejo de señales de cierre graceful
process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM. Cerrando API Gateway...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT. Cerrando API Gateway...');
  process.exit(0);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error: Error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

export default gateway;