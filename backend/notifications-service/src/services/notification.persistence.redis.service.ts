import { RedisService } from './redis.service';
import { NotificationJob } from './notification.queue.service';

export interface NotificationRecord {
  id?: number | undefined;
  notification_id: string;
  user_id: number;
  type: string;
  title: string;
  message: string;
  metadata: any;
  created_at?: Date | string | undefined;
  updated_at?: Date | string | undefined;
  expires_at?: Date | string | undefined;
  // nuevos campos para esquema de una sola colección
  recipients?: number[] | undefined;
  readBy?: number[] | undefined;
  timestamp?: Date | string | undefined;
  deletedBy?: number[] | undefined;
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

      // construir recipients SOLO desde data.recipients y bossUserId (no incluir al autor por defecto)
      const recipients: number[] = [];
      if (Array.isArray(notification.data.recipients)) {
        for (const r of notification.data.recipients) {
          const rid = parseInt(r as any);
          if (!isNaN(rid) && !recipients.includes(rid)) recipients.push(rid);
        }
      }
      if (notification.data.bossUserId) {
        const bid = parseInt(notification.data.bossUserId as any);
        if (!isNaN(bid) && !recipients.includes(bid)) recipients.push(bid);
      }

      const record: NotificationRecord = {
        notification_id: notification.id,
        user_id: userId,
        type: notification.type,
        title: notification.data.taskTitle || 'Notificación',
        message: notification.data.message,
        metadata: notification.data.metadata || {},
        created_at: notification.createdAt,
        timestamp: notification.createdAt,
        // Importante: si no hay recipients explícitos, dejar undefined para que el filtro use user_id
        recipients: recipients.length ? recipients : undefined,
        readBy: [],
        deletedBy: []
      };
      if (notification.scheduledFor) {
        record.expires_at = notification.scheduledFor;
      } else {
        // 7 días desde ahora como expiración lógica
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        record.expires_at = expires.toISOString() as any;
      }

      // Guardar en Hash único 'notification'
      await this.redisService.hashSet('notification', notification.id, record);

      console.log(`✅ Notificación guardada en Redis Hash: ${notification.id}`);
      return record;
    } catch (error) {
      console.error('❌ Error guardando notificación en Redis Hash:', error);
      return null;
    }
  }

  async getUserNotifications(userId: number, limit: number = 20, offset: number = 0, unreadOnly: boolean = false): Promise<NotificationRecord[]> {
    try {
      const all = await this.redisService.hashGetAll<NotificationRecord>('notification');
      const now = Date.now();
      let list = Object.values(all).filter(rec => {
        const exp = rec.expires_at ? new Date(rec.expires_at as any).getTime() : Number.MAX_SAFE_INTEGER;
        const isRecipient = Array.isArray(rec.recipients) ? rec.recipients.includes(userId) : rec.user_id === userId;
        const isUnread = unreadOnly ? !(rec.readBy || []).includes(userId) : true;
        const isDeletedForUser = (rec.deletedBy || []).includes(userId);
        return isRecipient && exp > now && isUnread && !isDeletedForUser;
      });
      // Ordenar por fecha de creación descendente
      list.sort((a, b) => new Date(b.created_at as any).getTime() - new Date(a.created_at as any).getTime());
      // Paginación
      const paginated = list.slice(offset, offset + limit);
      return paginated;
    } catch (error) {
      console.error('❌ Error obteniendo notificaciones de usuario (Redis Hash):', error);
      return [];
    }
  }

  async markAsRead(notificationId: string, userId: number): Promise<boolean> {
    try {
      const rec = await this.redisService.hashGet<NotificationRecord>('notification', notificationId);
      if (!rec) return false;
      const isRecipient = Array.isArray(rec.recipients) ? rec.recipients.includes(userId) : rec.user_id === userId;
      if (!isRecipient) return false;
      const readBy = new Set(rec.readBy || []);
      readBy.add(userId);
      rec.readBy = Array.from(readBy);
      rec.updated_at = new Date().toISOString();
      await this.redisService.hashSet('notification', notificationId, rec);
      return true;
    } catch (error) {
      console.error('❌ Error marcando notificación como leída (Redis Hash):', error);
      return false;
    }
  }

  async markAllAsRead(userId: number): Promise<number> {
    try {
      const all = await this.redisService.hashGetAll<NotificationRecord>('notification');
      let updated = 0;
      for (const [id, rec] of Object.entries(all)) {
        const now = Date.now();
        const exp = rec.expires_at ? new Date(rec.expires_at as any).getTime() : Number.MAX_SAFE_INTEGER;
        const isRecipient = Array.isArray(rec.recipients) ? rec.recipients.includes(userId) : rec.user_id === userId;
        const alreadyRead = (rec.readBy || []).includes(userId);
        if (isRecipient && exp > now && !alreadyRead) {
          const readBy = new Set(rec.readBy || []);
          readBy.add(userId);
          rec.readBy = Array.from(readBy);
          rec.updated_at = new Date().toISOString();
          await this.redisService.hashSet('notification', id, rec);
          updated++;
        }
      }
      return updated;
    } catch (error) {
      console.error('❌ Error marcando todas como leídas (Redis Hash):', error);
      return 0;
    }
  }

  async deleteNotification(notificationId: string, userId: number): Promise<boolean> {
    try {
      const rec = await this.redisService.hashGet<NotificationRecord>('notification', notificationId);
      if (!rec) return false;
      const recipients = Array.isArray(rec.recipients) && rec.recipients.length > 0 ? rec.recipients : [rec.user_id];
      const canDelete = recipients.includes(userId);
      if (!canDelete) return false;

      const deletedBy = new Set(rec.deletedBy || []);
      deletedBy.add(userId);
      rec.deletedBy = Array.from(deletedBy);
      rec.updated_at = new Date().toISOString();

      const allRecipientsDeleted = recipients.every(rid => (rec.deletedBy || []).includes(rid));
      if (allRecipientsDeleted) {
        await this.redisService.hashDelete('notification', notificationId);
        console.log(`✅ Notificación eliminada globalmente (Redis Hash): ${notificationId}`);
      } else {
        await this.redisService.hashSet('notification', notificationId, rec);
        console.log(`✅ Notificación ocultada para usuario ${userId} (Redis Hash): ${notificationId}`);
      }
      return true;
    } catch (error) {
      console.error('❌ Error eliminando notificación (Redis Hash):', error);
      return false;
    }
  }

  async deleteAllForUser(userId: number): Promise<number> {
    try {
      const all = await this.redisService.hashGetAll<NotificationRecord>('notification');
      let affected = 0;
      for (const [id, rec] of Object.entries(all)) {
        const recipients = Array.isArray(rec.recipients) && rec.recipients.length > 0 ? rec.recipients : [rec.user_id];
        if (!recipients.includes(userId)) continue;
        const deletedBy = new Set(rec.deletedBy || []);
        const beforeSize = deletedBy.size;
        deletedBy.add(userId);
        rec.deletedBy = Array.from(deletedBy);
        rec.updated_at = new Date().toISOString();
        const allRecipientsDeleted = recipients.every(rid => (rec.deletedBy || []).includes(rid));
        if (allRecipientsDeleted) {
          await this.redisService.hashDelete('notification', id);
        } else {
          await this.redisService.hashSet('notification', id, rec);
        }
        if (deletedBy.size !== beforeSize) affected++;
      }
      console.log(`🗑️ Borrado masivo: ${affected} notificaciones afectadas para usuario ${userId}`);
      return affected;
    } catch (error) {
      console.error('❌ Error en borrado masivo por usuario (Redis Hash):', error);
      return 0;
    }
  }
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const all = await this.redisService.hashGetAll<NotificationRecord>('notification');
      const now = Date.now();
      const count = Object.values(all).filter(rec => {
        const exp = rec.expires_at ? new Date(rec.expires_at as any).getTime() : Number.MAX_SAFE_INTEGER;
        const isRecipient = Array.isArray(rec.recipients) ? rec.recipients.includes(userId) : rec.user_id === userId;
        const isUnread = !(rec.readBy || []).includes(userId);
        return isRecipient && exp > now && isUnread;
      }).length;
      return count;
    } catch (error) {
      console.error('❌ Error obteniendo conteo no leídas (Redis Hash):', error);
      return 0;
    }
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