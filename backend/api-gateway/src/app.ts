import express, { Application, Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Importar configuraciones y middlewares
import { routingMiddleware } from './middleware';
import routes from './routes';
import { SERVICES } from './config/services';

// Cargar variables de entorno
dotenv.config();

/**
 * Clase principal del API Gateway
 */
class APIGateway {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3000');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Configurar middlewares globales
   */
  private initializeMiddlewares(): void {
    // Seguridad
    this.app.use(helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    }));

    // CORS
    const corsOptions = {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:4200'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    };
    this.app.use(cors(corsOptions));
    // Manejo explícito de preflight para evitar problemas con el proxy
    this.app.options('*', cors(corsOptions));

    // Logging
    const logFormat = process.env.LOG_FORMAT || 'combined';
    this.app.use(morgan(logFormat));

    // Parseo de JSON y URL encoded
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Headers personalizados
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Powered-By', 'Smart-Home-API-Gateway');
      res.setHeader('X-Gateway-Version', '1.0.0');
      next();
    });
  }

  /**
   * Configurar rutas
   */
  private initializeRoutes(): void {
    // Rutas del gateway (información, health, status)
    this.app.use('/', routes);

    // Handler específico para evitar problemas de proxy en POST JSON de auth
    this.app.post('/api/auth/login-by-role', async (req: Request, res: Response) => {
      const targetUrl = `${SERVICES.AUTH.url}/api/auth/login-by-role`;
      try {
        const url = new URL(targetUrl);
        const payload = JSON.stringify(req.body || {});
        const options: http.RequestOptions = {
          hostname: url.hostname,
          port: url.port ? parseInt(url.port) : 80,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(payload).toString(),
            'Authorization': (req.headers['authorization'] as string) || ''
          }
        };

        const result = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
          const proxyReq = http.request(options, (proxyRes) => {
            const chunks: Buffer[] = [];
            proxyRes.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            proxyRes.on('end', () => {
              const bodyStr = Buffer.concat(chunks).toString('utf-8');
              resolve({ status: proxyRes.statusCode || 502, headers: proxyRes.headers, body: bodyStr });
            });
          });
          proxyReq.on('error', reject);
          proxyReq.setTimeout(30000, () => {
            proxyReq.destroy(new Error('Upstream timeout'));
          });
          proxyReq.write(payload);
          proxyReq.end();
        });

        // Propagar respuesta del servicio de autenticación
        res.status(result.status);
        const contentType = (result.headers['content-type'] as string) || 'application/json';
        res.type(contentType).send(result.body);
      } catch (err) {
        console.error('❌ [AUTH FORWARD ERROR]:', (err as Error).message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'Servicio no disponible temporalmente',
            error: 'SERVICE_UNAVAILABLE',
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Handler específico para login con credenciales
    this.app.post('/api/auth/login', async (req: Request, res: Response) => {
      const targetUrl = `${SERVICES.AUTH.url}/api/auth/login`;
      try {
        const url = new URL(targetUrl);
        const payload = JSON.stringify(req.body || {});
        const options: http.RequestOptions = {
          hostname: url.hostname,
          port: url.port ? parseInt(url.port) : 80,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Content-Length': Buffer.byteLength(payload).toString(),
            'Authorization': (req.headers['authorization'] as string) || ''
          }
        };

        const result = await new Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }>((resolve, reject) => {
          const proxyReq = http.request(options, (proxyRes) => {
            const chunks: Buffer[] = [];
            proxyRes.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
            proxyRes.on('end', () => {
              const bodyStr = Buffer.concat(chunks).toString('utf-8');
              resolve({ status: proxyRes.statusCode || 502, headers: proxyRes.headers, body: bodyStr });
            });
          });
          proxyReq.on('error', reject);
          proxyReq.setTimeout(30000, () => {
            proxyReq.destroy(new Error('Upstream timeout'));
          });
          proxyReq.write(payload);
          proxyReq.end();
        });

        res.status(result.status);
        const contentType = (result.headers['content-type'] as string) || 'application/json';
        res.type(contentType).send(result.body);
      } catch (err) {
        console.error('❌ [AUTH LOGIN FORWARD ERROR]:', (err as Error).message);
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: 'Servicio no disponible temporalmente',
            error: 'SERVICE_UNAVAILABLE',
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    // Enrutamiento a microservicios
    // Todas las rutas que empiecen con /api/* serán manejadas por el middleware de proxy
    this.app.use('/api/*', routingMiddleware);

    // Ruta catch-all para rutas no encontradas
    this.app.use('*', (req: Request, res: Response, next: NextFunction) => {
      // Evitar enviar encabezados múltiples si ya se envió respuesta
      if (res.headersSent) return next();
      res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.originalUrl}`,
        availableRoutes: [
          '/',
          '/health',
          '/status',
          ...Object.values(SERVICES).map(service => service.path)
        ],
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Manejo de errores globales
   */
  private initializeErrorHandling(): void {
    // Manejo de errores 404
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      // Evitar enviar encabezados múltiples si ya se envió respuesta
      if (res.headersSent) return next();
      const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
      res.status(404).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });

    // Manejo de errores globales
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('❌ [API GATEWAY ERROR]:', error);
      // Si los encabezados ya fueron enviados por otro middleware, delegar a Express
      if (res.headersSent) {
        return next(error);
      }
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_SERVER_ERROR',
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Iniciar el servidor
   */
  public listen(): void {
    this.app.listen(this.port, () => {
      console.log('\n🚀 ===== SMART HOME API GATEWAY =====');
      console.log(`🌐 Servidor corriendo en: http://localhost:${this.port}`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log(`⏰ Iniciado: ${new Date().toLocaleString()}`);
      console.log('\n📋 Servicios disponibles:');
      
      Object.values(SERVICES).forEach(service => {
        console.log(`   ${service.path} -> ${service.name} (${service.url})`);
      });
      
      console.log('\n🔗 Endpoints del Gateway:');
      console.log(`   GET  / -> Información del gateway`);
      console.log(`   GET  /health -> Health check`);
      console.log(`   GET  /status -> Estado de servicios`);
      console.log('\n=======================================\n');
    });
  }
}

export default APIGateway;