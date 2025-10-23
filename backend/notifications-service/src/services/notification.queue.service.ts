import { RedisService, QueueJob } from './redis.service';
import { notificationPersistenceService } from './notification.persistence.redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationJob {
  id: string;
  type: 'task_completed' | 'task_assigned' | 'task_reminder' | 'system_alert' | 'task_updated';
  channels: ('app' | 'email')[];
  data: {
    userId: string;
    recipients?: string[];
    bossUserId?: string;
    familyId?: string;
    taskId?: string;
    taskTitle?: string;
    message: string;
    metadata?: any;
  };
  createdAt: Date;
  scheduledFor?: Date;
}

export class NotificationQueueService {
  private redisService: RedisService;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private memoryQueue: QueueJob[] = [];

  constructor() {
    this.redisService = new RedisService();
  }

  // Add notification to queue
  async addNotification(notification: Omit<NotificationJob, 'id' | 'createdAt'>): Promise<string> {
    const notificationJob: NotificationJob = {
      ...notification,
      id: uuidv4(),
      createdAt: new Date()
    };

    const queueJob: QueueJob = {
      id: notificationJob.id,
      type: 'notification',
      data: notificationJob,
      createdAt: notificationJob.createdAt,
      attempts: 0,
      maxAttempts: 3
    };

    try {
      await this.redisService.addToQueue('notification', queueJob);
      console.log(`✅ Notification queued: ${notificationJob.id} - ${notificationJob.type}`);
      return notificationJob.id;
    } catch (error) {
      console.error('❌ Error adding notification to queue:', error);
      // Fallback a cola en memoria para no perder notificaciones
      this.memoryQueue.push(queueJob);
      console.warn(`⚠️ Using memory queue for notification: ${notificationJob.id}`);
      return notificationJob.id;
    }
  }

  // Start processing notifications
  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      console.log('⚠️ Notification processing already started');
      return;
    }

    this.isProcessing = true;
    console.log('🚀 Starting notification queue processing...');

    // Ciclo más rápido y no bloqueante
    this.processingInterval = setInterval(async () => {
      try {
        await this.processNextNotification();
      } catch (error) {
        console.error('❌ Error in notification processing cycle:', error);
      }
    }, 100);
  }

  // Stop processing notifications
  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      return;
    }

    this.isProcessing = false;
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
    
    console.log('⏹️ Notification queue processing stopped');
  }

  // Process next notification from queue
  private async processNextNotification(): Promise<void> {
    try {
      let job: QueueJob | null = await this.redisService.popQueue('notification');
      
      if (!job && this.memoryQueue.length > 0) {
        job = this.memoryQueue.shift() || null;
        if (job) {
          console.log(`🔄 Processing job from memory queue: ${job.id}`);
        }
      }
      
      if (job && job.data) {
        const notification: NotificationJob = job.data;
        
        // Check if notification is scheduled for future
        if (notification.scheduledFor && new Date(notification.scheduledFor) > new Date()) {
          // Re-queue for later processing
          await this.redisService.addToQueue('notification', job);
          return;
        }
        
        await this.executeNotification(notification);
      }
    } catch (error) {
      console.error('❌ Error processing notification:', error);
    }
  }

  // Execute notification across all specified channels
  private async executeNotification(notification: NotificationJob): Promise<void> {
    try {
      console.log(`🔄 Executing notification: ${notification.id} - ${notification.type}`);
      
      // Guardar notificación en registro temporal (TTL)
      await notificationPersistenceService.saveNotification(notification);
      // Entrega a canales (simplificado: app y email opcional)
      for (const channel of notification.channels) {
        if (channel === 'app') {
          await this.sendAppNotification(notification);
        } else if (channel === 'email') {
          await this.sendEmailNotification(notification);
        }
      }
      
      // Emitir a canal realtime después de procesar (evita doble ejecución)
      await this.redisService.publish('notification:new', notification);
      
      console.log(`✅ Notification executed: ${notification.id}`);
    } catch (error) {
      console.error(`❌ Error executing notification ${notification.id}:`, error);
    }
  }

  // Send app notification (real-time via WebSocket)
  private async sendAppNotification(notification: NotificationJob): Promise<void> {
    try {
      const appNotification = {
        id: notification.id,
        type: notification.type,
        title: this.getNotificationTitle(notification),
        message: notification.data.message,
        userId: notification.data.userId,
        taskId: notification.data.taskId,
        timestamp: new Date().toISOString(),
        read: false,
        metadata: notification.data.metadata
      };

      // En estructura simplificada: la entrega se hará desde app.ts suscrito a 'notification:new'.
      console.log(`📱 App notification prepared for delivery to recipients`);
    } catch (error) {
      console.error('❌ Error sending app notification:', error);
      throw error;
    }
  }

  // Send email notification (placeholder)
  private async sendEmailNotification(notification: NotificationJob): Promise<void> {
    try {
      // Placeholder for email service integration
      console.log(`📧 Email notification sent to user ${notification.data.userId}: ${notification.data.message}`);
    } catch (error) {
      console.error('❌ Error sending email notification:', error);
      throw error;
    }
  }

  // Helper methods
  private getNotificationTitle(notification: NotificationJob): string {
    switch (notification.type) {
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

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    try {
      const totalCount = await this.redisService.getQueueLength('notification');
      
      return {
        isProcessing: this.isProcessing,
        queues: {
          notifications: totalCount,
          memoryFallback: this.memoryQueue.length,
          total: totalCount + this.memoryQueue.length
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      return {
        isProcessing: this.isProcessing,
        queues: { notifications: 0, memoryFallback: this.memoryQueue.length, total: this.memoryQueue.length },
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
}