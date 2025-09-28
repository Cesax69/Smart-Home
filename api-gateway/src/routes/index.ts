import { Router, Request, Response } from 'express';
import { SERVICES, getAllServices } from '../config/services';

const router = Router();

/**
 * Ruta principal del API Gateway
 * Proporciona información sobre el gateway y servicios disponibles
 */
router.get('/', (req: Request, res: Response) => {
  const services = getAllServices();
  
  res.json({
    success: true,
    message: '🏠 Smart Home API Gateway',
    version: '1.0.0',
    description: 'Punto de entrada único para todos los microservicios del ecosistema Smart Home',
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    services: services.map(service => ({
      name: service.name,
      path: service.path,
      description: service.description,
      url: service.url
    })),
    endpoints: {
      gateway_info: 'GET /',
      health_check: 'GET /health',
      services_status: 'GET /status'
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Health check del API Gateway
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'API Gateway funcionando correctamente',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: Object.values(SERVICES).map(service => ({
      name: service.name,
      path: service.path,
      url: service.url
    }))
  });
});

/**
 * Estado de todos los servicios
 */
router.get('/status', async (req: Request, res: Response) => {
  const services = getAllServices();
  
  // En una implementación real, aquí harías health checks a cada servicio
  const servicesStatus = services.map(service => ({
    name: service.name,
    path: service.path,
    url: service.url,
    status: 'unknown', // Aquí se haría un health check real
    description: service.description
  }));

  res.json({
    success: true,
    message: 'Estado de los microservicios',
    gateway: {
      status: 'healthy',
      uptime: process.uptime(),
      version: '1.0.0'
    },
    services: servicesStatus,
    timestamp: new Date().toISOString()
  });
});

export default router;