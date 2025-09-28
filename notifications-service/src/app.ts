import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

// Cargar variables de entorno
dotenv.config();

/**
 * Aplicación Express para Notifications Service
 * Microservicio para simulación de notificaciones por WhatsApp
 */
class App {
  public app: express.Application;
  public port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3004');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Configurar middlewares de la aplicación
   */
  private initializeMiddlewares(): void {
    // CORS para permitir peticiones desde otros servicios
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
      credentials: true
    }));

    // Parser de JSON
    this.app.use(express.json({ limit: '10mb' }));
    
    // Parser de URL encoded
    this.app.use(express.urlencoded({ extended: true }));

    // Middleware de logging para desarrollo
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`📨 [${timestamp}] ${req.method} ${req.path} - Body:`, req.body);
      next();
    });

    // Headers de seguridad básicos
    this.app.use((req, res, next) => {
      res.header('X-Content-Type-Options', 'nosniff');
      res.header('X-Frame-Options', 'DENY');
      res.header('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  /**
   * Configurar rutas de la aplicación
   */
  private initializeRoutes(): void {
    this.app.use('/', routes);
  }

  /**
   * Configurar manejo de errores
   */
  private initializeErrorHandling(): void {
    // Manejo de rutas no encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Endpoint no encontrado: ${req.method} ${req.originalUrl}`,
        availableEndpoints: {
          info: "GET /",
          webhook: "POST /notify",
          health: "GET /health"
        },
        timestamp: new Date().toISOString()
      });
    });

    // Manejo global de errores
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Error no manejado:', error);
      
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? error.message : 'INTERNAL_SERVER_ERROR'
      });
    });
  }

  /**
   * Iniciar el servidor
   */
  public listen(): void {
    this.app.listen(this.port, () => {
      console.log('\n🚀 ================================');
      console.log('👨‍👩‍👧‍👦 FAMILY NOTIFICATIONS SERVICE');
      console.log('🚀 ================================');
      console.log(`✅ Servidor iniciado en puerto ${this.port}`);
      console.log(`🌐 URL: http://localhost:${this.port}`);
      console.log(`📋 Endpoints disponibles:`);
      console.log(`   📄 GET  / - Información del servicio`);
      console.log(`   👨‍👩‍👧‍👦 POST /notify/family - Notificaciones familiares`);
      console.log(`   📨 POST /notify - Webhook legacy`);
      console.log(`   📊 GET  /stats - Estadísticas familiares`);
      console.log(`   👥 GET  /family - Miembros de la familia`);
      console.log(`   ❤️  GET  /health - Health check`);
      console.log(`🎯 Listo para enviar notificaciones familiares personalizadas`);
      console.log('🚀 ================================\n');
    });
  }
}

export default App;