import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';

/**
 * Rutas de Notificaciones Familiares
 * Define los endpoints para webhooks familiares y servicios auxiliares
 */
const router = Router();

/**
 * POST /notify/family - Webhook principal para notificaciones familiares
 * Espera: { userId: number, type: NotificationType, priority: NotificationPriority, taskData?: TaskNotificationData, message?: string }
 * Responde: Confirmación de procesamiento y envío simulado con plantillas personalizadas
 */
router.post('/notify/family', NotificationController.handleFamilyNotifyWebhook);

/**
 * POST /notify - Webhook legacy para compatibilidad con versiones anteriores
 * Espera: { userId: number, message: string }
 * Responde: Confirmación de procesamiento y envío simulado
 */
router.post('/notify', NotificationController.handleNotifyWebhook);

/**
 * GET /stats - Obtiene estadísticas de notificaciones familiares
 * Responde: Estadísticas detalladas por tipo y prioridad
 */
router.get('/stats', NotificationController.getNotificationStats);

/**
 * GET /family - Obtiene información de miembros de la familia
 * Responde: Lista de miembros de la familia con sus roles
 */
router.get('/family', NotificationController.getFamilyMembers);

/**
 * GET /health - Health check del servicio
 * Responde: Estado del servicio de notificaciones familiares
 */
router.get('/health', NotificationController.healthCheck);

export default router;