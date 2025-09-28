import { Router } from 'express';
import userRoutes from './userRoutes';

const router = Router();

// Rutas de usuarios
router.use('/users', userRoutes);

// Ruta de health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Users Service está funcionando correctamente',
    timestamp: new Date().toISOString(),
    service: 'users-service',
    version: '1.0.0'
  });
});

export default router;