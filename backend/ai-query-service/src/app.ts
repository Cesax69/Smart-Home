import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';

dotenv.config();

class App {
  public app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3006');
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    this.app.use(cors({ origin: '*', credentials: true }));
    this.app.use(express.json({ limit: '2mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  private initializeRoutes(): void {
    this.app.use('/', routes);
  }

  private initializeErrorHandling(): void {
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
        endpoints: {
          chat: 'POST /api/ai-query/chat',
          health: 'GET /api/health'
        }
      });
    });

    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ Error en ai-query-service:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servicio de IA',
        ...(process.env.NODE_ENV === 'development' && { detail: error?.message })
      });
    });
  }

  public listen(): void {
    this.app.listen(this.port, () => {
      console.log(`🚀 AI Query Service listening at http://localhost:${this.port}`);
    });
  }
}

const server = new App();
server.listen();
export default server;