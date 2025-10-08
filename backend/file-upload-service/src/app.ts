import express from 'express';
import cors from 'cors';
import { routes } from './routes';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

class App {
  public app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3004');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Configurar middlewares
   */
  private initializeMiddlewares(): void {
    // CORS
    this.app.use(cors({
      origin: '*',
      credentials: true
    }));

    // Parsing de JSON
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Headers de seguridad
    this.app.use((req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    });

    // Logging de requests
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`📥 ${timestamp} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Configurar rutas
   */
  private initializeRoutes(): void {
    this.app.use('/', routes);
  }

  // Eliminado servicio de archivos estáticos local (/files) para usar exclusivamente Google Drive

  /**
   * Manejo de errores 404 y errores globales
   */
  private initializeErrorHandling(): void {
    // Manejo de rutas no encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
        availableEndpoints: {
          upload: 'POST /upload',
          health: 'GET /health',
          info: 'GET /',
          driveFiles: 'GET /drive/files'
        }
      });
    });

    // Manejo global de errores
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Error no manejado:', error);
      
      res.status(error.status || 500).json({
        success: false,
        message: error.message || 'Error interno del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    });
  }

  /**
   * Iniciar el servidor
   */
  public listen(): void {
    this.app.listen(this.port, () => {
      console.log('🚀 ================================');
      console.log('📁 FILE UPLOAD SERVICE INICIADO');
      console.log('🚀 ================================');
      console.log(`🌐 Servidor ejecutándose en: http://localhost:${this.port}`);
      console.log(`📊 Entorno: ${process.env.NODE_ENV || 'development'}`);
      console.log('');
      console.log('📋 ENDPOINTS DISPONIBLES:');
      console.log(`   📤 POST   http://localhost:${this.port}/upload`);
      console.log(`   ❤️  GET    http://localhost:${this.port}/health`);
      console.log(`   ℹ️  GET    http://localhost:${this.port}/`);
      console.log('');
      console.log('📁 CONFIGURACIÓN DE ARCHIVOS (Google Drive):');
      console.log(`   ☁️  Almacenamiento: Google Drive`);
      console.log(`   📏 Tamaño máximo: 10MB`);
      console.log(`   🎯 Campo de archivo: 'file'`);
      console.log('');
      console.log('🔗 EJEMPLO DE USO:');
      console.log(`   curl -X POST -F "file=@imagen.jpg" http://localhost:${this.port}/upload`);
      console.log('🚀 ================================');
    });
  }

  /**
   * Cerrar el servidor graciosamente
   */
  public close(): void {
    console.log('🛑 Cerrando File Upload Service...');
    process.exit(0);
  }
}

// Crear e iniciar la aplicación
const app = new App();

// Manejo de señales para cierre gracioso
process.on('SIGTERM', () => app.close());
process.on('SIGINT', () => app.close());

// Iniciar servidor
app.listen();

export default app;