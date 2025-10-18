import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsappService';
import { NotificationRequest, NotificationResponse } from '../types/Notification';
import { notificationPersistenceService } from '../services/notification.persistence.service';

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
   * Maneja el webhook POST /notify/family
   * Recibe notificaciones familiares y las procesa con plantillas personalizadas
   */
  static async handleFamilyNotifyWebhook(req: Request, res: Response): Promise<void> {
    try {
      const requestData: NotificationRequest = req.body;

      // Validar que los datos sean correctos para notificaciones familiares
      if (!WhatsAppService.validateNotificationData(requestData)) {
        res.status(400).json({
          success: false,
          message: "Datos inválidos. Se requiere: { userId: number, type: NotificationType, priority: NotificationPriority, taskData?: TaskNotificationData, message?: string }",
          timestamp: new Date().toISOString(),
          error: "INVALID_FAMILY_NOTIFICATION_DATA",
          supportedTypes: ["tarea_asignada", "tarea_completada", "tarea_actualizada", "recordatorio_tarea", "tarea_vencida", "felicitacion", "reunion_familiar", "emergencia_hogar", "recordatorio_general"],
          supportedPriorities: ["baja", "media", "alta", "urgente"]
        });
        return;
      }

      // Procesar la notificación familiar
      const result = await WhatsAppService.sendFamilyNotification(requestData);

      // Enviar notificación en tiempo real si hay una instancia de Socket.IO disponible
      if (appInstance && appInstance.getSocketIO) {
        const io = appInstance.getSocketIO();
        
        // Crear notificación para el frontend
        const realtimeNotification = {
          id: `notif_${Date.now()}`,
          type: requestData.type === 'tarea_completada' ? 'task_completed' : 'system_alert',
          title: requestData.type === 'tarea_completada' ? 'Tarea Completada' : 'Nueva Notificación',
          message: result.message || `Notificación de tipo ${requestData.type}`,
          timestamp: new Date().toISOString(),
          read: false,
          userId: requestData.userId.toString(),
          metadata: {
            taskData: {
              ...requestData.taskData,
              completedByUserName: requestData.taskData?.completedByUserName || requestData.taskData?.completedByName
            },
            notificationType: requestData.type,
            priority: requestData.priority
          }
        };
        // Emitir directamente a la sala del usuario indicado en la solicitud
        const roomName = `user_${requestData.userId}`;
        io.to(roomName).emit('new_notification', realtimeNotification);
        console.log(`📱 Notificación en tiempo real enviada al usuario ${requestData.userId} (room ${roomName})`);
      }

      // Responder con éxito
      res.status(200).json({
        success: true,
        message: "Notificación familiar procesada exitosamente",
        data: result,
        webhook: "POST /notify/family",
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error en webhook de notificaciones familiares:', error);
      
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al procesar la notificación familiar",
        timestamp: new Date().toISOString(),
        error: "INTERNAL_SERVER_ERROR"
      });
    }
  }
  /**
   * Maneja el webhook POST /notify (legacy)
   * Recibe notificaciones y las procesa para envío por WhatsApp (compatibilidad con versiones anteriores)
   */
  static async handleNotifyWebhook(req: Request, res: Response): Promise<void> {
    try {
      const requestData = req.body;

      // Validar que los datos sean correctos (formato legacy)
      if (!WhatsAppService.validateLegacyNotificationData(requestData)) {
        res.status(400).json({
          success: false,
          message: "Datos inválidos. Se requiere: { userId: number, message: string }",
          timestamp: new Date().toISOString(),
          error: "INVALID_REQUEST_DATA"
        });
        return;
      }

      const { userId, message } = requestData;

      // Validar longitud del mensaje
      if (message.length > 1000) {
        res.status(400).json({
          success: false,
          message: "El mensaje es demasiado largo. Máximo 1000 caracteres.",
          timestamp: new Date().toISOString(),
          error: "MESSAGE_TOO_LONG"
        });
        return;
      }

      // Procesar la notificación usando el método legacy
      const result = await WhatsAppService.sendMessage(userId, message);

      // Responder con éxito
      res.status(200).json({
        success: true,
        message: "Notificación procesada exitosamente",
        data: result,
        webhook: "POST /notify",
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error en webhook de notificaciones:', error);
      
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al procesar la notificación",
        timestamp: new Date().toISOString(),
        error: "INTERNAL_SERVER_ERROR"
      });
    }
  }

  /**
   * Obtiene estadísticas de notificaciones familiares
   */
  static async getNotificationStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = WhatsAppService.getNotificationStats();

      res.status(200).json({
        success: true,
        message: "Estadísticas de notificaciones obtenidas exitosamente",
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error al obtener estadísticas:', error);
      
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al obtener estadísticas",
        timestamp: new Date().toISOString(),
        error: "INTERNAL_SERVER_ERROR"
      });
    }
  }

  /**
   * Obtiene información de miembros de la familia
   */
  static async getFamilyMembers(req: Request, res: Response): Promise<void> {
    try {
      const members = WhatsAppService.getAllFamilyMembers();

      res.status(200).json({
        success: true,
        message: "Miembros de la familia obtenidos exitosamente",
        data: members,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Error al obtener miembros de la familia:', error);
      
      res.status(500).json({
        success: false,
        message: "Error interno del servidor al obtener miembros de la familia",
        timestamp: new Date().toISOString(),
        error: "INTERNAL_SERVER_ERROR"
      });
    }
  }

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
   * Información del servicio de notificaciones familiares
   */
  static async getServiceInfo(req: Request, res: Response): Promise<void> {
    const whatsappInfo = WhatsAppService.getServiceInfo();
    
    res.status(200).json({
      success: true,
      message: "Family Notifications Service - Microservicio para notificaciones familiares personalizadas por WhatsApp",
      version: "2.0.0",
      port: process.env.PORT || 3004,
      endpoints: {
        familyWebhook: "POST /notify/family",
        legacyWebhook: "POST /notify",
        stats: "GET /stats",
        familyMembers: "GET /family",
        health: "GET /health",
        info: "GET /"
      },
      whatsappService: whatsappInfo,
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