import express from 'express';
import cors from 'cors';
import path from 'path';
import { routes } from './routes';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

class App {
  public app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3003');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeStaticFiles();
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

  /**
   * Configurar servicio de archivos estáticos
   * Los archivos en /uploads serán accesibles en /files
   */
  private initializeStaticFiles(): void {
    const uploadsPath = path.join(process.cwd(), 'uploads');
    
    // Servir archivos estáticos desde /uploads en la ruta /files
    this.app.use('/files', express.static(uploadsPath, {
      // Configuraciones adicionales para servir archivos
      maxAge: '1d', // Cache por 1 día
      etag: true,
      lastModified: true,
      setHeaders: (res, filePath) => {
        // Headers adicionales para archivos
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        // Determinar Content-Type basado en la extensión
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
          case '.jpg':
          case '.jpeg':
            res.setHeader('Content-Type', 'image/jpeg');
            break;
          case '.png':
            res.setHeader('Content-Type', 'image/png');
            break;
          case '.gif':
            res.setHeader('Content-Type', 'image/gif');
            break;
          case '.webp':
            res.setHeader('Content-Type', 'image/webp');
            break;
          case '.pdf':
            res.setHeader('Content-Type', 'application/pdf');
            break;
          case '.txt':
            res.setHeader('Content-Type', 'text/plain');
            break;
        }
      }
    }));

    console.log(`📁 Archivos estáticos configurados: /files -> ${uploadsPath}`);
  }

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
          files: 'GET /files/:filename',
          health: 'GET /health',
          info: 'GET /'
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
      console.log(`   📁 GET    http://localhost:${this.port}/files/:filename`);
      console.log(`   ❤️  GET    http://localhost:${this.port}/health`);
      console.log(`   ℹ️  GET    http://localhost:${this.port}/`);
      console.log('');
      console.log('📁 CONFIGURACIÓN DE ARCHIVOS:');
      console.log(`   📂 Carpeta de uploads: ${path.join(process.cwd(), 'uploads')}`);
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