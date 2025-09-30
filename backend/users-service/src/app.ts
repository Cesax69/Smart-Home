import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routes from './routes';

class App {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = 3001;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Inicializa los middlewares de la aplicación
   */
  private initializeMiddlewares(): void {
    // CORS
    this.app.use(cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Parser de JSON
    this.app.use(express.json({ limit: '10mb' }));
    
    // Parser de URL encoded
    this.app.use(express.urlencoded({ extended: true }));

    // Middleware de logging
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  /**
   * Inicializa las rutas de la aplicación
   */
  private initializeRoutes(): void {
    // Ruta raíz
    this.app.get('/', (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        message: 'Bienvenido al Users Service',
        service: 'users-service',
        version: '1.0.0',
        endpoints: {
          health: '/api/health',
          users: '/api/users',
          userById: '/api/users/:id'
        }
      });
    });

    // API routes
    this.app.use('/api', routes);
  }

  /**
   * Inicializa el manejo de errores
   */
  private initializeErrorHandling(): void {
    // Middleware para rutas no encontradas
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado',
        path: req.originalUrl
      });
    });

    // Middleware de manejo de errores
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    });
  }

  /**
   * Inicia el servidor
   */
  public listen(): void {
    this.app.listen(this.port, () => {
      console.log('=================================');
      console.log(`🚀 Users Service iniciado`);
      console.log(`🌐 Puerto: ${this.port}`);
      console.log(`📍 URL: http://localhost:${this.port}`);
      console.log(`🏥 Health Check: http://localhost:${this.port}/api/health`);
      console.log(`👥 Usuarios: http://localhost:${this.port}/api/users`);
      console.log('=================================');
    });
  }
}

// Crear e iniciar la aplicación
const app = new App();
app.listen();

export default app;