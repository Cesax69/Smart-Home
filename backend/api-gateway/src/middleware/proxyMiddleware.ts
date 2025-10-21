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
    // Para servicios con cuerpo multipart (File Upload), NO parsear el body en el proxy
    parseReqBody: service.name === 'File Upload Service' ? false : true,
    memoizeHost: PROXY_CONFIG.memoizeHost,
    // Asegurar que los encabezados y el cuerpo JSON se envíen correctamente, y reenviar x-confirm-code
    proxyReqOptDecorator: (proxyReqOpts: any, srcReq: Request) => {
      const contentType = srcReq.headers['content-type'] || 'application/json';
      proxyReqOpts.headers = proxyReqOpts.headers || {};
      proxyReqOpts.headers['Content-Type'] = contentType as string;
      proxyReqOpts.headers['Accept'] = 'application/json';
      // Dejar que el proxy calcule Content-Length correctamente
      if ((proxyReqOpts.headers as any)['Content-Length']) {
        delete (proxyReqOpts.headers as any)['Content-Length'];
      }
      // Reenviar código de confirmación si está presente
      const confirmCode =
        srcReq.headers['x-confirm-code'] ||
        (srcReq.headers as any)['X-Confirm-Code'];
      if (confirmCode) {
        proxyReqOpts.headers['x-confirm-code'] = confirmCode as string;
      }
      return proxyReqOpts;
    },

    proxyReqBodyDecorator: (bodyContent: any, srcReq: Request) => {
      const ct = (srcReq.headers['content-type'] || '').toString().toLowerCase();
      // No tocar multipart/form-data ni cuerpos binarios/Buffer
      if (ct.includes('multipart/form-data') || Buffer.isBuffer(bodyContent)) {
        return bodyContent;
      }
      // Si el body es un objeto y es JSON, serializar
      if (bodyContent && typeof bodyContent === 'object' && ct.includes('application/json')) {
        try {
          return JSON.stringify(bodyContent);
        } catch {
          return bodyContent;
        }
      }
      return bodyContent;
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
      return originalUrl;
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