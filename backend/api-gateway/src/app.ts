import express, { Application, Request, Response, NextFunction } from 'express';
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

    // Enrutamiento a microservicios
    // Todas las rutas que empiecen con /api/* serán manejadas por el middleware de proxy
    this.app.use('/api/*', routingMiddleware);

    // Ruta catch-all para rutas no encontradas
    this.app.use('*', (req: Request, res: Response) => {
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