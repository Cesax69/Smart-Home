import { RedisService } from './redis.service';
import { NotificationJob } from './notification.queue.service';

export interface NotificationRecord {
  id?: number;
  notification_id: string;
  user_id: number;
  type: string;
  title: string;
  message: string;
  metadata: any;
  created_at?: Date | string;
  updated_at?: Date | string;
  expires_at?: Date | string;
}

export interface NotificationHistoryRecord {
  id?: number;
  notification_id: string;
  user_id: number;
  action: 'created' | 'read' | 'deleted' | 'sent';
  performed_at?: Date | string;
  metadata: any;
}

export class NotificationPersistenceService {
  private redisService: RedisService;

  constructor() {
    this.redisService = new RedisService();
  }

  async saveNotification(notification: NotificationJob): Promise<NotificationRecord | null> {
    try {
      const userId = parseInt(notification.data.userId);
      const record: NotificationRecord = {
        notification_id: notification.id,
        user_id: userId,
        type: notification.type,
        title: notification.data.taskTitle || 'Notificación',
        message: notification.data.message,
        metadata: notification.data.metadata || {},
        created_at: notification.createdAt
      };
      if (notification.scheduledFor) {
        record.expires_at = notification.scheduledFor;
      }

      const key = `notification:${notification.id}`;
      // TTL: usar expires_at si existe, sino 7 días por defecto
      let ttlSeconds: number | undefined = undefined;
      if (record.expires_at) {
        const ttlMs = new Date(record.expires_at as any).getTime() - Date.now();
        if (ttlMs > 0) ttlSeconds = Math.floor(ttlMs / 1000);
      } else {
        ttlSeconds = 7 * 24 * 60 * 60;
      }

      await this.redisService.setCache(key, record, ttlSeconds);

      console.log(`✅ Notificación guardada en Redis: ${notification.id}`);
      return record;
    } catch (error) {
      console.error('❌ Error guardando notificación en Redis:', error);
      return null;
    }
  }

  // En estructura simplificada no hay índice por usuario; devolvemos vacío
  async getUserNotifications(userId: number, limit: number = 20, offset: number = 0, unreadOnly: boolean = false): Promise<NotificationRecord[]> {
    console.warn('⚠️ getUserNotifications no soportado en estructura simplificada');
    return [];
  }

  async markAsRead(notificationId: string, userId: number): Promise<boolean> {
    console.warn('⚠️ markAsRead no soportado en estructura simplificada');
    return false;
  }

  async markAllAsRead(userId: number): Promise<number> {
    console.warn('⚠️ markAllAsRead no soportado en estructura simplificada');
    return 0;
  }

  async deleteNotification(notificationId: string, userId: number): Promise<boolean> {
    try {
      const key = `notification:${notificationId}`;
      const record = await this.redisService.getCache(key);
      if (!record || record.user_id !== userId) {
        return false;
      }
      await this.redisService.deleteCache(key);
      console.log(`✅ Notificación eliminada (Redis): ${notificationId}`);
      return true;
    } catch (error) {
      console.error('❌ Error eliminando notificación (Redis):', error);
      return false;
    }
  }

  async getUnreadCount(userId: number): Promise<number> {
    console.warn('⚠️ getUnreadCount no soportado en estructura simplificada');
    return 0;
  }

  // Historial omitido en estructura simplificada

  async cleanupExpiredNotifications(): Promise<number> {
    console.log('🧹 Limpieza de expirados en Redis no implementada (usar TTL en registros).');
    return 0;
  }

  async getUserNotificationSettings(userId: number): Promise<any> {
    try {
      const settingsKey = `user:${userId}:notification_settings`;
      const settings = await this.redisService.getCache(settingsKey);
      if (settings) {
        console.log(`⚙️ Configuraciones obtenidas para usuario ${userId} (Redis)`);
        return settings;
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones de usuario (Redis):', error);
      return null;
    }
  }

  async updateUserNotificationSettings(userId: number, settings: any): Promise<boolean> {
    try {
      const settingsKey = `user:${userId}:notification_settings`;
      const payload = { ...settings, updated_at: new Date().toISOString() };
      await this.redisService.setCache(settingsKey, payload);
      console.log(`⚙️ Configuraciones actualizadas para usuario ${userId} (Redis)`);
      return true;
    } catch (error) {
      console.error('❌ Error actualizando configuraciones de usuario (Redis):', error);
      return false;
    }
  }
}

export const notificationPersistenceService = new NotificationPersistenceService();
export default notificationPersistenceService;