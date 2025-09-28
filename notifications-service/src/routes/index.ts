import { Router } from 'express';
import notificationRoutes from './notificationRoutes';
import { NotificationController } from '../controllers/notificationController';

/**
 * Rutas Principales del Microservicio
 * Centraliza todas las rutas y endpoints disponibles
 */
const router = Router();

// Montar las rutas de notificaciones en la raíz
router.use('/', notificationRoutes);

// Endpoint raíz para información del servicio
router.get('/', NotificationController.getServiceInfo);

export default router;