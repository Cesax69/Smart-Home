import { Request, Response, NextFunction } from 'express';
import proxy from 'express-http-proxy';
import { SERVICES, PROXY_CONFIG, getServiceByPath, ServiceConfig } from '../config/services';

/**
 * Middleware de Proxy para API Gateway
 * Maneja el enrutamiento de peticiones a los microservicios correspondientes
 */

/**
 * Crear proxy para un servicio específico
 */
const createServiceProxy = (service: ServiceConfig) => {
  return proxy(service.url, {
    timeout: PROXY_CONFIG.timeout,
    limit: PROXY_CONFIG.limit,
    preserveHostHdr: PROXY_CONFIG.preserveHostHdr,
    // Para uploads multipart, evitamos parseo del body
    parseReqBody: service.stripApiPrefix ? false : PROXY_CONFIG.parseReqBody,
    memoizeHost: PROXY_CONFIG.memoizeHost,
    // Asegurar reenvío de headers personalizados
    proxyReqOptDecorator: (proxyReqOpts: any, srcReq: Request) => {
      const confirmCode = srcReq.headers['x-confirm-code'] || srcReq.headers['X-Confirm-Code' as any];
      if (confirmCode) {
        proxyReqOpts.headers = proxyReqOpts.headers || {};
        proxyReqOpts.headers['x-confirm-code'] = confirmCode as string;
      }
      return proxyReqOpts;
    },
    
    // Modificar la URL de la petición para mantener el prefijo /api
    proxyReqPathResolver: (req: Request) => {
      const originalUrl = req.originalUrl;
      const svc = getServiceByPath(originalUrl);
      
      if (svc) {
        // Si el servicio monta rutas en raíz, quitamos su prefijo /api/<service>
        if (svc.stripApiPrefix && originalUrl.startsWith(svc.path)) {
          const strippedPath = originalUrl.substring(svc.path.length) || '/';
          console.log(`🔄 [PROXY] ${req.method} ${originalUrl} -> ${svc.url}${strippedPath}`);
          return strippedPath;
        }
        // En caso contrario, forward tal cual
        console.log(`🔄 [PROXY] ${req.method} ${originalUrl} -> ${svc.url}${originalUrl}`);
        return originalUrl;
      }
      
      return req.originalUrl;
    },

    // Manejar respuestas del proxy
    userResDecorator: (proxyRes: any, proxyResData: any, userReq: Request, userRes: Response) => {
      const svc = getServiceByPath(userReq.originalUrl);
      
      if (svc) {
        console.log(`✅ [PROXY] ${userReq.method} ${userReq.originalUrl} -> ${svc.name} (${proxyRes.statusCode})`);
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
  const serviceProxy = createServiceProxy(service);
  return serviceProxy(req, res, next);
};

/**
 * Proxies específicos para cada servicio
 */
export const usersProxy = createServiceProxy(SERVICES.USERS);
export const tasksProxy = createServiceProxy(SERVICES.TASKS);
export const filesProxy = createServiceProxy(SERVICES.FILES);
export const notificationsProxy = createServiceProxy(SERVICES.NOTIFICATIONS);