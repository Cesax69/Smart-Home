import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import routes from './routes';
import { databaseService } from './config/database';

// Cargar variables de entorno
dotenv.config();

class App {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3003');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeDatabase();
  }

  /**
   * Configurar middlewares
   */
  private initializeMiddlewares(): void {
    // CORS - Permitir solicitudes desde cualquier origen
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }));

    // Parsear JSON
    this.app.use(express.json({ limit: '10mb' }));
    
    // Parsear URL encoded
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Middleware de logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
      next();
    });

    // Headers de seguridad básicos
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });
  }

  /**
   * Configurar rutas
   */
  private initializeRoutes(): void {
    // Usar las rutas definidas
    this.app.use('/', routes);

    // Ruta para manejar 404
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
        availableEndpoints: {
          root: 'GET /',
          health: 'GET /api/health',
          tasks: {
            create: 'POST /api/tasks',
            getAll: 'GET /api/tasks',
            getById: 'GET /api/tasks/:id',
            update: 'PUT /api/tasks/:id',
            delete: 'DELETE /api/tasks/:id'
          }
        }
      });
    });
  }

  /**
   * Configurar manejo de errores
   */
  private initializeErrorHandling(): void {
    // Middleware global de manejo de errores
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error no manejado:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });

    // Manejar promesas rechazadas no capturadas
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      console.error('Promesa rechazada no manejada:', reason);
    });

    // Manejar excepciones no capturadas
    process.on('uncaughtException', (error: Error) => {
      console.error('Excepción no capturada:', error);
      process.exit(1);
    });
  }

  /**
   * Inicializar conexión a la base de datos
   */
  private async initializeDatabase(): Promise<void> {
    // Verificar si se debe usar datos mockeados
    if (process.env.USE_MOCK_DATA === 'true') {
      console.log('🎭 Modo de desarrollo: Usando datos mockeados (sin base de datos)');
      return;
    }

    try {
      console.log('Inicializando conexión a la base de datos...');
      
      // Probar conexión
      const isConnected = await databaseService.testConnection();
      if (!isConnected) {
        throw new Error('No se pudo establecer conexión con PostgreSQL');
      }

      // Inicializar esquema y tablas
      await databaseService.initializeDatabase();
      
      console.log('Base de datos inicializada correctamente');
    } catch (error) {
      console.error('Error inicializando la base de datos:', error);
      console.error('El servicio continuará ejecutándose usando datos mockeados');
    }
  }

  /**
   * Iniciar el servidor
   */
  public listen(): void {
    this.app.listen(this.port, () => {
      console.log('='.repeat(50));
      console.log('🚀 TASKS SERVICE INICIADO EXITOSAMENTE');
      console.log('='.repeat(50));
      console.log(`📍 Puerto: ${this.port}`);
      console.log(`🌐 URL: http://localhost:${this.port}`);
      console.log(`🏥 Health Check: http://localhost:${this.port}/api/health`);
      console.log(`📋 Documentación: http://localhost:${this.port}/`);
      console.log('='.repeat(50));
      console.log('📋 Endpoints disponibles:');
      console.log('   GET    /                     - Información del servicio');
      console.log('   GET    /api/health           - Health check');
      console.log('   POST   /api/tasks            - Crear tarea');
      console.log('   GET    /api/tasks            - Obtener todas las tareas');
      console.log('   GET    /api/tasks/:id        - Obtener tarea por ID');
      console.log('   PUT    /api/tasks/:id        - Actualizar tarea');
      console.log('   DELETE /api/tasks/:id        - Eliminar tarea');
      console.log('='.repeat(50));
      console.log('🔍 Query Parameters:');
      console.log('   GET /api/tasks?userId=:id    - Filtrar por usuario');
      console.log('   GET /api/tasks?status=:status - Filtrar por estado');
      console.log('='.repeat(50));
      console.log('💾 Base de datos: PostgreSQL');
      console.log(`📊 Esquema: ${process.env.DB_SCHEMA || 'tasks_schema'}`);
      console.log('='.repeat(50));
    });
  }

  /**
   * Cerrar conexiones gracefully
   */
  public async close(): Promise<void> {
    try {
      await databaseService.closePool();
      console.log('Servidor cerrado correctamente');
    } catch (error) {
      console.error('Error cerrando el servidor:', error);
    }
  }
}

// Crear y iniciar la aplicación
const app = new App();
app.listen();

// Manejar señales de terminación
process.on('SIGTERM', async () => {
  console.log('Recibida señal SIGTERM, cerrando servidor...');
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Recibida señal SIGINT, cerrando servidor...');
  await app.close();
  process.exit(0);
});

export default app;

