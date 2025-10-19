import { RedisService, QueueJob } from './redis.service';
import { notificationPersistenceService } from './notification.persistence.redis.service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationJob {
  id: string;
  type: 'task_completed' | 'task_assigned' | 'task_reminder' | 'system_alert';
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

  constructor() {
    this.redisService = new RedisService();
  }

  // Add notification to queue
  async addNotification(notification: Omit<NotificationJob, 'id' | 'createdAt'>): Promise<string> {
    try {
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

      await this.redisService.addToQueue('notifications', queueJob);
      
      // Also publish to real-time channel for immediate processing
      await this.redisService.publish('notification:new', notificationJob);
      
      console.log(`✅ Notification queued: ${notificationJob.id} - ${notificationJob.type}`);
      return notificationJob.id;
    } catch (error) {
      console.error('❌ Error adding notification to queue:', error);
      throw error;
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

    // Process notifications every 1 second (cola única)
    this.processingInterval = setInterval(async () => {
      try {
        await this.processNextNotification();
      } catch (error) {
        console.error('❌ Error in notification processing cycle:', error);
      }
    }, 1000);

    // Subscribe to real-time notifications (global channel)
    await this.redisService.subscribe('notification:new', async (notification: NotificationJob) => {
      console.log(`📨 Real-time notification received: ${notification.id}`);
      await this.executeNotification(notification);
    });
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
      const job = await this.redisService.processQueue('notifications');
      
      if (job && job.data) {
        const notification: NotificationJob = job.data;
        
        // Check if notification is scheduled for future
        if (notification.scheduledFor && new Date(notification.scheduledFor) > new Date()) {
          // Re-queue for later processing
          await this.redisService.addToQueue('notifications', job);
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

      // En estructura simplificada no usamos canales por usuario/familia;
      // La entrega se hará desde app.ts suscrito a 'notification:new'.
      // Aquí no publicamos nada adicional.
      
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

  // Save notification history
  // Historial omitido en estructura simplificada

  // Helper methods
  private getNotificationTitle(notification: NotificationJob): string {
    switch (notification.type) {
      case 'task_completed':
        return '✅ Tarea Completada';
      case 'task_assigned':
        return '📋 Nueva Tarea Asignada';
      case 'task_reminder':
        return '⏰ Recordatorio de Tarea';
      case 'system_alert':
        return '🚨 Alerta del Sistema';
      default:
        return '📢 Notificación';
    }
  }

  // Email notification placeholder (not implemented yet)

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    try {
      const totalCount = await this.redisService.getQueueLength('notifications');
      
      return {
        isProcessing: this.isProcessing,
        queues: {
          notifications: totalCount,
          total: totalCount
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      return {
        isProcessing: this.isProcessing,
        queues: { notifications: 0, total: 0 },
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
}