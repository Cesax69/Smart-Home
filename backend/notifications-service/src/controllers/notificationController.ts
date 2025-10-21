import { Request, Response } from 'express';
import { notificationPersistenceService } from '../services/notification.persistence.redis.service';

// Variable global para almacenar la instancia de la aplicación
let appInstance: any = null;

/**
 * Función para establecer la instancia de la aplicación
 */
export function setAppInstance(app: any): void {
  appInstance = app;
}

/**
 * Controlador de Notificaciones Familiares
 * Maneja las peticiones HTTP para notificaciones familiares personalizadas
 */
export class NotificationController {



  /**
   * Health check del servicio de notificaciones
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: "Notifications Service está funcionando correctamente",
      timestamp: new Date().toISOString(),
      service: "notifications-service",
      version: "1.0.0",
      status: "healthy"
    });
  }

  /**
   * Información del servicio de notificaciones
   */
  static async getServiceInfo(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: "Notifications Service - Notificaciones en tiempo real (estructura Redis simplificada)",
      version: "2.2.0",
      port: (appInstance?.port ?? parseInt(process.env.PORT || '3004')),
      endpoints: {
        queueWebhook: "POST /notify/queue",
        notificationsByUser: "GET /notifications/:userId",
        markRead: "PUT /notifications/:notificationId/read",
        markAllRead: "PUT /notifications/user/:userId/read-all",
        unreadCount: "GET /notifications/:userId/unread-count",
        deleteNotification: "DELETE /notifications/:notificationId",
        health: "GET /health",
        info: "GET /"
      },
      redisStructure: {
        queue: "queue:notification",
        tempRecord: "notification (Redis Hash)",
        pubsubChannel: "notification:new",
        metrics: ["PING", "INFO"]
      },
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Obtiene notificaciones de un usuario con paginación
   * GET /notifications/:userId
   */
  static async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId || '0');
      const limit = parseInt((req.query.limit as string) || '20') || 20;
      const offset = parseInt((req.query.offset as string) || '0') || 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "ID de usuario inválido",
          timestamp: new Date().toISOString()
        });
        return;
      }

      const notifications = await notificationPersistenceService.getUserNotifications(
        userId, limit, offset, unreadOnly
      );

      res.status(200).json({
        success: true,
        data: notifications,
        pagination: {
          limit,
          offset,
          count: notifications.length
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo notificaciones del usuario:', error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Marca una notificación como leída
   * PUT /notifications/:notificationId/read
   */
  static async markNotificationAsRead(req: Request, res: Response): Promise<void> {
    try {
      const notificationId = req.params.notificationId;
      const userId = parseInt(req.body.userId);

      if (!notificationId || isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "ID de notificación o usuario inválido",
          timestamp: new Date().toISOString()
        });
        return;
      }

      const success = await notificationPersistenceService.markAsRead(notificationId, userId);

      if (success) {
        res.status(200).json({
          success: true,
          message: "Notificación marcada como leída",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Notificación no encontrada",
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error marcando notificación como leída:', error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Marca todas las notificaciones de un usuario como leídas
   * PUT /notifications/user/:userId/read-all
   */
  static async markAllNotificationsAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId || '0');

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "ID de usuario inválido",
          timestamp: new Date().toISOString()
        });
        return;
      }

      const count = await notificationPersistenceService.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: `${count} notificaciones marcadas como leídas`,
        data: { updatedCount: count },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error marcando todas las notificaciones como leídas:', error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Obtiene el conteo de notificaciones no leídas de un usuario
   * GET /notifications/:userId/unread-count
   */
  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = parseInt(req.params.userId || '0');

      if (isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "ID de usuario inválido",
          timestamp: new Date().toISOString()
        });
        return;
      }

      const count = await notificationPersistenceService.getUnreadCount(userId);

      res.status(200).json({
        success: true,
        data: { unreadCount: count },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error obteniendo conteo de notificaciones no leídas:', error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Elimina una notificación
   * DELETE /notifications/:notificationId
   */
  static async deleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const notificationId = req.params.notificationId;
      const userId = parseInt(req.body.userId);

      if (!notificationId || isNaN(userId)) {
        res.status(400).json({
          success: false,
          message: "ID de notificación o usuario inválido",
          timestamp: new Date().toISOString()
        });
        return;
      }

      const success = await notificationPersistenceService.deleteNotification(notificationId, userId);

      if (success) {
        res.status(200).json({
          success: true,
          message: "Notificación eliminada",
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Notificación no encontrada",
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      console.error('❌ Error eliminando notificación:', error);
      res.status(500).json({
        success: false,
        message: "Error interno del servidor",
        timestamp: new Date().toISOString()
      });
    }
  }
}