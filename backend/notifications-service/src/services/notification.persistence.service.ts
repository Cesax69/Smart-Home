import { databaseService } from '../config/database';
import { NotificationJob } from './notification.queue.service';

export interface NotificationRecord {
  id?: number;
  notification_id: string;
  user_id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  metadata: any;
  created_at?: Date;
  updated_at?: Date;
  expires_at?: Date;
}

export interface NotificationHistoryRecord {
  id?: number;
  notification_id: string;
  user_id: number;
  action: 'created' | 'read' | 'deleted' | 'sent';
  performed_at?: Date;
  metadata: any;
}

export class NotificationPersistenceService {
  
  /**
   * Guarda una notificación en la base de datos
   */
  async saveNotification(notification: NotificationJob): Promise<NotificationRecord | null> {
    try {
      const query = `
        INSERT INTO notifications (
          notification_id, user_id, type, title, message, 
          is_read, metadata, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        notification.id,
        parseInt(notification.data.userId),
        notification.type,
        notification.data.taskTitle || 'Notificación',
        notification.data.message,
        false, // is_read
        JSON.stringify(notification.data.metadata || {}),
        notification.createdAt,
        notification.scheduledFor || null // expires_at
      ];

      const result = await databaseService.query(query, values);
      
      if (result.rows.length > 0) {
        console.log(`✅ Notificación guardada en BD: ${notification.id}`);
        return result.rows[0];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error guardando notificación en BD:', error);
      return null;
    }
  }

  /**
   * Obtiene notificaciones de un usuario con paginación
   */
  async getUserNotifications(
    userId: number, 
    limit: number = 20, 
    offset: number = 0, 
    unreadOnly: boolean = false
  ): Promise<NotificationRecord[]> {
    try {
      const query = `
        SELECT * FROM get_user_notifications($1, $2, $3, $4)
      `;

      const values = [userId, limit, offset, unreadOnly];
      const result = await databaseService.query(query, values);
      
      console.log(`📋 Obtenidas ${result.rows.length} notificaciones para usuario ${userId}`);
      return result.rows;
    } catch (error) {
      console.error('❌ Error obteniendo notificaciones del usuario:', error);
      return [];
    }
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId: string, userId: number): Promise<boolean> {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE notification_id = $1 AND user_id = $2
        RETURNING *
      `;

      const values = [notificationId, userId];
      const result = await databaseService.query(query, values);
      
      if (result.rows.length > 0) {
        console.log(`✅ Notificación marcada como leída: ${notificationId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error marcando notificación como leída:', error);
      return false;
    }
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   */
  async markAllAsRead(userId: number): Promise<number> {
    try {
      const query = `
        UPDATE notifications 
        SET is_read = true, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1 AND is_read = false
        RETURNING *
      `;

      const values = [userId];
      const result = await databaseService.query(query, values);
      
      console.log(`✅ ${result.rows.length} notificaciones marcadas como leídas para usuario ${userId}`);
      return result.rows.length;
    } catch (error) {
      console.error('❌ Error marcando todas las notificaciones como leídas:', error);
      return 0;
    }
  }

  /**
   * Elimina una notificación
   */
  async deleteNotification(notificationId: string, userId: number): Promise<boolean> {
    try {
      const query = `
        DELETE FROM notifications 
        WHERE notification_id = $1 AND user_id = $2
        RETURNING *
      `;

      const values = [notificationId, userId];
      const result = await databaseService.query(query, values);
      
      if (result.rows.length > 0) {
        console.log(`✅ Notificación eliminada: ${notificationId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error eliminando notificación:', error);
      return false;
    }
  }

  /**
   * Obtiene el conteo de notificaciones no leídas de un usuario
   */
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM notifications 
        WHERE user_id = $1 AND is_read = false
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
      `;

      const values = [userId];
      const result = await databaseService.query(query, values);
      
      const count = parseInt(result.rows[0]?.count || '0');
      console.log(`📊 Usuario ${userId} tiene ${count} notificaciones no leídas`);
      return count;
    } catch (error) {
      console.error('❌ Error obteniendo conteo de notificaciones no leídas:', error);
      return 0;
    }
  }

  /**
   * Guarda un registro en el historial de notificaciones
   */
  async saveNotificationHistory(
    notificationId: string, 
    userId: number, 
    action: 'created' | 'read' | 'deleted' | 'sent',
    metadata: any = {}
  ): Promise<boolean> {
    try {
      const query = `
        INSERT INTO notification_history (
          notification_id, user_id, action, metadata, performed_at
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const values = [
        notificationId,
        userId,
        action,
        JSON.stringify(metadata)
      ];

      const result = await databaseService.query(query, values);
      
      if (result.rows.length > 0) {
        console.log(`📝 Historial guardado: ${notificationId} - ${action}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error guardando historial de notificación:', error);
      return false;
    }
  }

  /**
   * Limpia notificaciones expiradas
   */
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const result = await databaseService.query('SELECT cleanup_expired_notifications()');
      const deletedCount = result.rows[0]?.cleanup_expired_notifications || 0;
      
      console.log(`🧹 Limpiadas ${deletedCount} notificaciones expiradas`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Error limpiando notificaciones expiradas:', error);
      return 0;
    }
  }

  /**
   * Obtiene configuraciones de notificación de un usuario
   */
  async getUserNotificationSettings(userId: number): Promise<any> {
    try {
      const query = `
        SELECT * FROM user_notification_settings 
        WHERE user_id = $1
      `;

      const values = [userId];
      const result = await databaseService.query(query, values);
      
      if (result.rows.length > 0) {
        console.log(`⚙️ Configuraciones obtenidas para usuario ${userId}`);
        return result.rows[0];
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo configuraciones de usuario:', error);
      return null;
    }
  }

  /**
   * Actualiza configuraciones de notificación de un usuario
   */
  async updateUserNotificationSettings(userId: number, settings: any): Promise<boolean> {
    try {
      const query = `
        UPDATE user_notification_settings 
        SET 
          email_notifications = $2,
          push_notifications = $3,
          whatsapp_notifications = $4,
          notification_frequency = $5,
          quiet_hours_start = $6,
          quiet_hours_end = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING *
      `;

      const values = [
        userId,
        settings.email_notifications,
        settings.push_notifications,
        settings.whatsapp_notifications,
        settings.notification_frequency,
        settings.quiet_hours_start,
        settings.quiet_hours_end
      ];

      const result = await databaseService.query(query, values);
      
      if (result.rows.length > 0) {
        console.log(`⚙️ Configuraciones actualizadas para usuario ${userId}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error actualizando configuraciones de usuario:', error);
      return false;
    }
  }
}

// Exportar una instancia singleton
export const notificationPersistenceService = new NotificationPersistenceService();
export default notificationPersistenceService;