import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsappService';
import { NotificationRequest, NotificationResponse } from '../types/Notification';

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
          supportedTypes: ["tarea_asignada", "tarea_completada", "recordatorio_tarea", "tarea_vencida", "felicitacion", "reunion_familiar", "emergencia_hogar", "recordatorio_general"],
          supportedPriorities: ["baja", "media", "alta", "urgente"]
        });
        return;
      }

      // Procesar la notificación familiar
      const result = await WhatsAppService.sendFamilyNotification(requestData);

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
      const members = await WhatsAppService.getAllFamilyMembers();

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
}