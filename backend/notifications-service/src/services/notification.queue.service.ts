import { RedisService, QueueJob } from './redis.service';
import { WhatsAppService } from './whatsappService';
import { notificationPersistenceService } from './notification.persistence.service';
import { v4 as uuidv4 } from 'uuid';

export interface NotificationJob {
  id: string;
  type: 'task_completed' | 'task_assigned' | 'task_reminder' | 'system_alert';
  channels: ('app' | 'whatsapp' | 'email')[];
  data: {
    userId: string;
    familyId?: string;
    taskId?: string;
    taskTitle?: string;
    message: string;
    metadata?: any;
  };
  priority: 'high' | 'low';
  createdAt: Date;
  scheduledFor?: Date;
}

export class NotificationQueueService {
  private redisService: RedisService;
  private whatsappService: WhatsAppService;
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.redisService = new RedisService();
    this.whatsappService = new WhatsAppService();
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
        priority: notificationJob.priority,
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

    // Process high priority notifications every 1 second
    this.processingInterval = setInterval(async () => {
      try {
        // Process high priority first
        await this.processNextNotification('high');
        
        // Then process low priority
        await this.processNextNotification('low');
      } catch (error) {
        console.error('❌ Error in notification processing cycle:', error);
      }
    }, 1000);

    // Subscribe to real-time notifications
    await this.redisService.subscribe('notification:new', async (notification: NotificationJob) => {
      console.log(`📨 Real-time notification received: ${notification.id}`);
      // For high priority notifications, process immediately
      if (notification.priority === 'high') {
        await this.executeNotification(notification);
      }
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
  private async processNextNotification(priority: 'high' | 'low'): Promise<void> {
    try {
      const job = await this.redisService.processQueue('notifications', priority);
      
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
      console.error(`❌ Error processing ${priority} priority notification:`, error);
    }
  }

  // Execute notification across all specified channels
  private async executeNotification(notification: NotificationJob): Promise<void> {
    try {
      console.log(`🔄 Executing notification: ${notification.id} - ${notification.type}`);
      
      // Guardar notificación en base de datos PRIMERO
      await notificationPersistenceService.saveNotification(notification);
      
      const results: { channel: string; success: boolean; error?: string }[] = [];

      // Process each channel
      for (const channel of notification.channels) {
        try {
          switch (channel) {
            case 'app':
              await this.sendAppNotification(notification);
              results.push({ channel, success: true });
              break;
              
            case 'whatsapp':
              await this.sendWhatsAppNotification(notification);
              results.push({ channel, success: true });
              break;
              
            case 'email':
              await this.sendEmailNotification(notification);
              results.push({ channel, success: true });
              break;
              
            default:
              console.warn(`⚠️ Unknown notification channel: ${channel}`);
              results.push({ channel, success: false, error: 'Unknown channel' });
          }
        } catch (error) {
          console.error(`❌ Error sending ${channel} notification:`, error);
          results.push({ channel, success: false, error: (error as Error).message });
        }
      }

      // Save notification history in Redis AND database
      await this.saveNotificationHistory(notification, results);
      await notificationPersistenceService.saveNotificationHistory(
        notification.id,
        parseInt(notification.data.userId),
        'sent',
        { channels: notification.channels, results }
      );
      
      console.log(`✅ Notification executed: ${notification.id}`, results);
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
        read: false
      };

      // Publish to WebSocket channel for real-time delivery
      await this.redisService.publish(`user:${notification.data.userId}:notifications`, appNotification);
      
      // Also publish to family channel if applicable
      if (notification.data.familyId) {
        await this.redisService.publish(`family:${notification.data.familyId}:notifications`, appNotification);
      }
      
      console.log(`📱 App notification sent to user ${notification.data.userId}`);
    } catch (error) {
      console.error('❌ Error sending app notification:', error);
      throw error;
    }
  }

  // Send WhatsApp notification
  private async sendWhatsAppNotification(notification: NotificationJob): Promise<void> {
    try {
      const message = this.formatWhatsAppMessage(notification);
      
      if (notification.data.familyId) {
        // Send to family group
        const notificationRequest: any = {
          userId: parseInt(notification.data.userId),
          type: notification.type,
          priority: (notification.priority === 'high' ? 'alta' : 'media'),
          message: message
        };
        
        if (notification.data.taskTitle) {
          notificationRequest.taskData = {
            taskId: notification.data.taskId,
            taskTitle: notification.data.taskTitle,
            category: notification.data.metadata?.category,
            priority: notification.data.metadata?.priority,
            dueDate: notification.data.metadata?.dueDate
          };
        }
        
        await WhatsAppService.sendFamilyNotification(notificationRequest);
      } else {
        // Send to individual user (simulate)
        console.log(`📞 WhatsApp notification sent to user ${notification.data.userId}: ${message}`);
      }
    } catch (error) {
      console.error('❌ Error sending WhatsApp notification:', error);
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
  private async saveNotificationHistory(
    notification: NotificationJob, 
    results: { channel: string; success: boolean; error?: string }[]
  ): Promise<void> {
    try {
      const historyKey = `notification:history:${notification.id}`;
      const historyData = {
        notification,
        results,
        processedAt: new Date().toISOString()
      };
      
      // Save for 30 days
      await this.redisService.setCache(historyKey, historyData, 30 * 24 * 60 * 60);
      
      // Also add to user's notification history
      const userHistoryKey = `user:${notification.data.userId}:notification_history`;
      await this.redisService.addToQueue(userHistoryKey, {
        id: notification.id,
        type: 'history',
        data: historyData,
        priority: 'low',
        createdAt: new Date()
      });
    } catch (error) {
      console.error('❌ Error saving notification history:', error);
    }
  }

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

  private formatWhatsAppMessage(notification: NotificationJob): string {
    const title = this.getNotificationTitle(notification);
    let message = `${title}\n\n${notification.data.message}`;
    
    if (notification.data.taskTitle) {
      message += `\n\n📋 Tarea: ${notification.data.taskTitle}`;
    }
    
    message += `\n\n🏠 Smart Home - ${new Date().toLocaleString('es-ES')}`;
    
    return message;
  }

  // Get queue statistics
  async getQueueStats(): Promise<any> {
    try {
      const highPriorityCount = await this.redisService.getQueueLength('notifications', 'high');
      const lowPriorityCount = await this.redisService.getQueueLength('notifications', 'low');
      
      return {
        isProcessing: this.isProcessing,
        queues: {
          high: highPriorityCount,
          low: lowPriorityCount,
          total: highPriorityCount + lowPriorityCount
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Error getting queue stats:', error);
      return {
        isProcessing: this.isProcessing,
        queues: { high: 0, low: 0, total: 0 },
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      };
    }
  }
}