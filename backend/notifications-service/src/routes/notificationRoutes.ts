import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';

/**
 * Rutas de Notificaciones
 * Endpoints para gestión y consulta de notificaciones
 */
const router = Router();

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
 * GET /health - Health check del servicio
 * Responde: Estado del servicio de notificaciones familiares
 */
router.get('/health', NotificationController.healthCheck);

export default router;