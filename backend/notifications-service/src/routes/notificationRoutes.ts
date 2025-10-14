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
 * Responde: Confirmación de procesamiento y envío con plantillas personalizadas
 */
router.post('/notify/family', NotificationController.handleFamilyNotifyWebhook);

/**
 * POST /notify - Webhook legacy para compatibilidad con versiones anteriores
 * Espera: { userId: number, message: string }
 * Responde: Confirmación de procesamiento y envío
 */
router.post('/notify', NotificationController.handleNotifyWebhook);

/**
 * GET /notifications/:userId - Obtiene notificaciones de un usuario con paginación
 * Query params: limit, offset, unreadOnly
 * Responde: Lista de notificaciones del usuario
 */
router.get('/notifications/:userId', NotificationController.getUserNotifications);

/**
 * PUT /notifications/:notificationId/read - Marca una notificación como leída
 * Body: { userId: number }
 * Responde: Confirmación de actualización
 */
router.put('/notifications/:notificationId/read', NotificationController.markNotificationAsRead);

/**
 * PUT /notifications/user/:userId/read-all - Marca todas las notificaciones como leídas
 * Responde: Número de notificaciones actualizadas
 */
router.put('/notifications/user/:userId/read-all', NotificationController.markAllNotificationsAsRead);

/**
 * GET /notifications/:userId/unread-count - Obtiene el conteo de notificaciones no leídas
 * Responde: Número de notificaciones no leídas
 */
router.get('/notifications/:userId/unread-count', NotificationController.getUnreadCount);

/**
 * DELETE /notifications/:notificationId - Elimina una notificación
 * Body: { userId: number }
 * Responde: Confirmación de eliminación
 */
router.delete('/notifications/:notificationId', NotificationController.deleteNotification);

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