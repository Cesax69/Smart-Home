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
 * Microservicio para notificaciones en tiempo real
 */
class App {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;
  public port: number;
  private redisService: RedisService;
  private notificationQueueService: NotificationQueueService;
  // Añadido: flags y temporizador para reintentos de inicialización
  private subscriptionsInitialized: boolean = false;
  private redisRetryInterval: NodeJS.Timeout | null = null;

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

    // Start queue processing endpoint
    this.app.post('/queue/start', async (req, res) => {
      try {
        await this.notificationQueueService.startProcessing();
        const stats = await this.notificationQueueService.getQueueStats();
        res.json({
          success: true,
          started: true,
          queue: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to start queue processing',
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Stop queue processing endpoint
    this.app.post('/queue/stop', async (req, res) => {
      try {
        await this.notificationQueueService.stopProcessing();
        const stats = await this.notificationQueueService.getQueueStats();
        res.json({
          success: true,
          started: false,
          queue: stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: 'Failed to stop queue processing',
          error: (error as Error).message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Notification queue endpoint
    this.app.post('/notify/queue', (req, res) => {
      try {
        const notificationData = req.body;
        
        if (!notificationData.type || !notificationData.channels || !notificationData.data) {
          return res.status(400).json({
            success: false,
            message: 'Missing required fields: type, channels, data'
          });
        }

        // Add notification to queue asynchronously for fast response
        this.notificationQueueService.addNotification(notificationData)
          .then((id) => {
            console.log(`✅ Notification queued async: ${id}`);
          })
          .catch((error) => {
            console.error('❌ Error adding notification to queue (async):', error);
          });
        
        return res.status(202).json({
          success: true,
          message: 'Notification accepted for processing',
          queued: true,
          delivered: false
        });
      } catch (error) {
        console.error('Error adding notification to queue:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to add notification to queue'
        });
      }
    });

    // Test notification endpoint (for end-to-end validation via API Gateway)
    this.app.post('/test', async (req, res) => {
      try {
        const { userId, recipients, bossUserId, type, message, taskId, taskTitle, metadata } = req.body || {};
        const uid = (userId ?? '1').toString();
        const recips: string[] = Array.isArray(recipients) && recipients.length
          ? recipients.map((r: any) => r.toString())
          : [uid];
        const boss = bossUserId ? bossUserId.toString() : undefined;
        const tId = taskId ? taskId.toString() : undefined;
        const tTitle = taskTitle || 'Demo';
        const msg = message || '🔔 Notificación de prueba desde /test';
        const payload = {
          type: (type || 'system_alert') as any,
          channels: ['app'],
          data: {
            userId: uid,
            recipients: recips,
            bossUserId: boss,
            taskId: tId,
            taskTitle: tTitle,
            message: msg,
            metadata: metadata || { source: 'test-endpoint' }
          }
        };

        const id = await this.notificationQueueService.addNotification(payload as any);
        console.log(`🧪 Test notification queued: ${id}`);
        return res.status(202).json({ success: true, id, payload });
      } catch (error) {
        console.error('❌ Error in /test endpoint:', error);
        return res.status(500).json({ success: false, message: 'Failed to queue test notification', error: (error as Error).message });
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
      this.subscriptionsInitialized = true;
      console.log('✅ Real-time notification subscriptions completed');
      
    } catch (error: any) {
      console.error('❌ Error initializing Redis services:', error.message);
      console.error('Stack trace:', error.stack);
      console.warn('⚠️ Service will continue without Redis functionality');

      // Añadido: reintento automático para iniciar cola y suscripciones cuando Redis esté listo
      if (!this.redisRetryInterval) {
        console.log('🔁 Scheduling Redis initialization retry...');
        this.redisRetryInterval = setInterval(async () => {
          try {
            const healthy = await this.redisService.ping();
            if (healthy) {
              console.log('✅ Redis became healthy, initializing real-time pipeline...');
              await this.notificationQueueService.startProcessing();
              if (!this.subscriptionsInitialized) {
                await this.setupRealtimeNotificationSubscriptions();
                this.subscriptionsInitialized = true;
              }
              if (this.redisRetryInterval) {
                clearInterval(this.redisRetryInterval);
                this.redisRetryInterval = null;
              }
            }
          } catch (err) {
            // keep retrying silently
          }
        }, 2500);
      }
    }
  }

  /**
   * Setup Redis subscriptions for real-time WebSocket notifications
   */
  private async setupRealtimeNotificationSubscriptions(): Promise<void> {
    try {
      console.log('🔄 Setting up real-time notification subscriptions...');
      console.log('🔍 Redis service available:', !!this.redisService);
      // Suscripción simplificada: canal global 'notification:new'
      await this.redisService.subscribe('notification:new', (notification: any) => {
        try {
          console.log(`📨 Received notification from channel notification:new:`, notification);

          // Destinatarios: usar lista recipients. Si no existe, usar userId.
          let recipients: string[] = Array.isArray(notification?.data?.recipients)
            ? notification.data.recipients
            : (notification?.data?.userId ? [notification.data.userId] : []);
          recipients = Array.from(new Set(recipients.filter(Boolean)));

          // Incluir jefe del hogar si está presente y no duplicado
          if (notification?.data?.bossUserId) {
            const bossId = notification.data.bossUserId;
            if (!recipients.includes(bossId)) {
              recipients.push(bossId);
            }
          }

          // Preparar payload amigable para frontend
          const title = this.getNotificationTitle(notification?.type);
          const payload = {
            id: notification?.id,
            type: notification?.type,
            title,
            message: notification?.message || notification?.data?.message,
            data: notification?.data,
            timestamp: new Date().toISOString(),
            read: false
          };

          // Emitir a cada sala de usuario
          for (const recipientId of recipients) {
            const roomName = `user_${recipientId}`;
            this.io.to(roomName).emit('new_notification', payload);
            console.log(`✅ Notification sent to room ${roomName}`);
          }
        } catch (error) {
          console.error('❌ Error delivering real-time notification:', error);
        }
      });

      console.log('✅ Real-time notification subscriptions setup complete (notification:new)');
    } catch (error: any) {
      console.error('❌ Error setting up real-time notification subscriptions:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
    }
  }

  private getNotificationTitle(type: string): string {
    switch (type) {
      case 'task_completed':
        return '✅ Tarea Completada';
      case 'task_assigned':
        return '📋 Nueva Tarea Asignada';
      case 'task_updated':
        return '📝 Tarea Actualizada';
      case 'task_reminder':
        return '⏰ Recordatorio de Tarea';
      case 'system_alert':
        return '🚨 Alerta del Sistema';
      default:
        return '📢 Notificación';
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
          queue: "POST /notify/queue",
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
      console.log('🔔 NOTIFICATIONS SERVICE');
      console.log('🚀 ================================');
      console.log(`✅ Servidor iniciado en puerto ${this.port}`);
      console.log(`🌐 URL: http://localhost:${this.port}`);
      console.log(`🔌 Socket.IO habilitado para notificaciones en tiempo real`);
      console.log(`📋 Endpoints disponibles:`);
      console.log(`   📄 GET  / - Información del servicio`);
      console.log(`   📨 POST /notify/queue - Añadir notificación a la cola`);
      console.log(`   ❤️  GET  /health - Health check`);
      console.log(`   🔴 GET  /redis/health - Redis health check`);
      console.log(`   📊 GET  /queue/stats - Queue statistics`);
      console.log(`🎯 Listo para enviar notificaciones`);
      console.log(`🔄 Sistema de colas Redis activado`);
      console.log('🚀 ================================\n');
    });
  }
}

export default App;