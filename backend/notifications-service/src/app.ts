import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import routes from './routes';
import { RedisService } from './services/redis.service';
import { NotificationQueueService } from './services/notification.queue.service';
import { setAppInstance } from './controllers/notificationController';

// Cargar variables de entorno
dotenv.config();

/**
 * Aplicación Express para Notifications Service
 * Microservicio para notificaciones por WhatsApp
 */
class App {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;
  public port: number;
  private redisService: RedisService;
  private notificationQueueService: NotificationQueueService;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = parseInt(process.env.PORT || '3004');
    
    // Initialize Socket.IO
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: ['http://localhost:4200', 'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:4301', 'http://localhost:4302'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });
    
    // Initialize Redis services
    this.redisService = new RedisService();
    this.notificationQueueService = new NotificationQueueService();
    
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();

    // Configurar la instancia de la aplicación en el controlador
    setAppInstance(this);
  }

  /**
   * Initialize all async services
   */
  public async initialize(): Promise<void> {
    await this.initializeRedisServices();
  }

  /**
   * Configurar middlewares de la aplicación
   */
  private initializeMiddlewares(): void {
    // CORS para permitir peticiones desde otros servicios
    this.app.use(cors({
      origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:4200', 'http://localhost:4301', 'http://localhost:4302'],
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
    
    // Add Redis and queue management endpoints
    this.app.get('/redis/health', async (req, res) => {
      try {
        const isHealthy = await this.redisService.ping();
        const stats = await this.redisService.getStats();
        
        res.json({
          success: true,
          redis: {
            healthy: isHealthy,
            stats: stats
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Redis health check failed',
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    this.app.get('/queue/stats', async (req, res) => {
      try {
        const stats = await this.notificationQueueService.getQueueStats();
        res.json({
          success: true,
          queue: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Queue stats failed',
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Notification queue endpoint
    this.app.post('/notify/queue', async (req, res) => {
      try {
        const notificationData = req.body;
        
        if (!notificationData.type || !notificationData.channels || !notificationData.data) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields: type, channels, data'
          });
        }

        // Add notification to queue
        await this.notificationQueueService.addNotification(notificationData);
        
        return res.status(200).json({
          success: true,
          message: 'Notification added to queue successfully'
        });
      } catch (error) {
        console.error('Error adding notification to queue:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to add notification to queue'
        });
      }
    });
  }

  /**
   * Initialize Redis services
   */
  private async initializeRedisServices(): Promise<void> {
    try {
      console.log('🔄 Initializing Redis services...');
      
      // Test Redis connection
      const isRedisHealthy = await this.redisService.ping();
      if (!isRedisHealthy) {
        throw new Error('Redis connection failed');
      }
      
      console.log('✅ Redis connection established');
      
      // Start notification queue processing
      await this.notificationQueueService.startProcessing();
      console.log('✅ Notification queue processing started');
      
      // Subscribe to user notification channels for real-time WebSocket delivery
      console.log('🔄 About to setup real-time notification subscriptions...');
      await this.setupRealtimeNotificationSubscriptions();
      console.log('✅ Real-time notification subscriptions completed');
      
    } catch (error: any) {
      console.error('❌ Error initializing Redis services:', error.message);
      console.error('Stack trace:', error.stack);
      console.warn('⚠️ Service will continue without Redis functionality');
    }
  }

  /**
   * Setup Redis subscriptions for real-time WebSocket notifications
   */
  private async setupRealtimeNotificationSubscriptions(): Promise<void> {
    try {
      console.log('🔄 Setting up real-time notification subscriptions...');
      console.log('🔍 Redis service available:', !!this.redisService);
      console.log('🔍 subscribePattern method available:', typeof this.redisService.subscribePattern);
      
      // Subscribe to user-specific notifications using pattern matching
      await this.redisService.subscribePattern('user:*:notifications', (channel: string, notification: any) => {
        console.log(`📨 Received user notification from channel ${channel}:`, notification);
        
        // Extract userId from channel name (user:123:notifications -> 123)
        const userId = channel.split(':')[1];
        const roomName = `user_${userId}`;
        
        // Send notification to specific user room
        this.io.to(roomName).emit('new_notification', notification);
        console.log(`✅ Notification sent to room ${roomName}`);
      });
      
      // Subscribe to family-wide notifications
      await this.redisService.subscribePattern('family:*:notifications', (channel: string, notification: any) => {
        console.log(`📨 Received family notification from channel ${channel}:`, notification);
        
        // Send notification to all connected clients
        this.io.emit('family_notification', notification);
        console.log('✅ Family notification sent to all clients');
      });
      
      console.log('✅ Real-time notification subscriptions setup complete');
    } catch (error: any) {
      console.error('❌ Error setting up real-time notification subscriptions:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  }

  /**
   * Get Redis service instance
   */
  public getRedisService(): RedisService {
    return this.redisService;
  }

  /**
   * Inicializar Socket.IO para notificaciones en tiempo real
   */
  private initializeSocketIO(): void {
    this.io.on('connection', (socket) => {
      console.log(`🔌 Cliente conectado: ${socket.id}`);

      // Unirse a sala específica del usuario
      socket.on('join_user_room', (data) => {
        const { userId } = data;
        const roomName = `user_${userId}`;
        socket.join(roomName);
        console.log(`👤 Usuario ${userId} se unió a la sala ${roomName}`);
        
        // Confirmar conexión
        socket.emit('connection_confirmed', {
          message: 'Conectado al servicio de notificaciones',
          userId: userId,
          timestamp: new Date().toISOString()
        });
      });

      // Manejar desconexión
      socket.on('disconnect', () => {
        console.log(`🔌 Cliente desconectado: ${socket.id}`);
      });
    });

    console.log('🔌 Socket.IO inicializado correctamente');
  }

  /**
   * Get notification queue service instance
   */
  public getNotificationQueueService(): NotificationQueueService {
    return this.notificationQueueService;
  }

  /**
   * Get Socket.IO instance
   */
  public getSocketIO(): SocketIOServer {
    return this.io;
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
    this.server.listen(this.port, () => {
      console.log('\n🚀 ================================');
      console.log('👨‍👩‍👧‍👦 FAMILY NOTIFICATIONS SERVICE');
      console.log('🚀 ================================');
      console.log(`✅ Servidor iniciado en puerto ${this.port}`);
      console.log(`🌐 URL: http://localhost:${this.port}`);
      console.log(`🔌 Socket.IO habilitado para notificaciones en tiempo real`);
      console.log(`📋 Endpoints disponibles:`);
      console.log(`   📄 GET  / - Información del servicio`);
      console.log(`   👨‍👩‍👧‍👦 POST /notify/family - Notificaciones familiares`);
      console.log(`   📨 POST /notify - Webhook legacy`);
      console.log(`   📊 GET  /stats - Estadísticas familiares`);
      console.log(`   👥 GET  /family - Miembros de la familia`);
      console.log(`   ❤️  GET  /health - Health check`);
      console.log(`   🔴 GET  /redis/health - Redis health check`);
      console.log(`   📊 GET  /queue/stats - Queue statistics`);
      console.log(`🎯 Listo para enviar notificaciones familiares personalizadas`);
      console.log(`🔄 Sistema de colas Redis activado`);
      console.log('🚀 ================================\n');
    });
  }
}

export default App;