import { Request, Response, NextFunction } from 'express';
import proxy from 'express-http-proxy';
import { SERVICES, PROXY_CONFIG, getServiceByPath } from '../config/services';

/**
 * Middleware de Proxy para API Gateway
 * Maneja el enrutamiento de peticiones a los microservicios correspondientes
 */

/**
 * Crear proxy para un servicio específico
 */
const createServiceProxy = (serviceUrl: string) => {
  return proxy(serviceUrl, {
    timeout: PROXY_CONFIG.timeout,
    limit: PROXY_CONFIG.limit,
    preserveHostHdr: PROXY_CONFIG.preserveHostHdr,
    parseReqBody: PROXY_CONFIG.parseReqBody,
    memoizeHost: PROXY_CONFIG.memoizeHost,
    
    // Modificar la URL de la petición para mantener el prefijo /api
    proxyReqPathResolver: (req: Request) => {
      const originalUrl = req.originalUrl;
      const service = getServiceByPath(originalUrl);
      
      if (service) {
        // Mantener el path completo incluyendo /api
        const newPath = originalUrl.replace('/api', '/api');
        console.log(`🔄 [PROXY] ${req.method} ${originalUrl} -> ${service.url}${newPath}`);
        return newPath;
      }
      
      return req.originalUrl;
    },

    // Manejar respuestas del proxy
    userResDecorator: (proxyRes: any, proxyResData: any, userReq: Request, userRes: Response) => {
      const service = getServiceByPath(userReq.originalUrl);
      
      if (service) {
        console.log(`✅ [PROXY] ${userReq.method} ${userReq.originalUrl} -> ${service.name} (${proxyRes.statusCode})`);
      }
      
      return proxyResData;
    },

    // Manejar errores del proxy
    proxyErrorHandler: (err: any, res: Response, next: NextFunction) => {
      console.error('❌ [PROXY ERROR]:', err.message);
      
      res.status(503).json({
        success: false,
        message: 'Servicio no disponible temporalmente',
        error: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString()
      });
    }
  });
};

/**
 * Middleware principal de enrutamiento
 */
export const routingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const service = getServiceByPath(req.originalUrl);
  
  if (!service) {
    return res.status(404).json({
      success: false,
      message: `Ruta no encontrada: ${req.originalUrl}`,
      availableRoutes: Object.values(SERVICES).map(s => s.path),
      timestamp: new Date().toISOString()
    });
  }

  // Crear y ejecutar el proxy para el servicio correspondiente
  const serviceProxy = createServiceProxy(service.url);
  return serviceProxy(req, res, next);
};

/**
 * Proxies específicos para cada servicio
 */
export const usersProxy = createServiceProxy(SERVICES.USERS.url);
export const tasksProxy = createServiceProxy(SERVICES.TASKS.url);
export const filesProxy = createServiceProxy(SERVICES.FILES.url);
export const notificationsProxy = createServiceProxy(SERVICES.NOTIFICATIONS.url);