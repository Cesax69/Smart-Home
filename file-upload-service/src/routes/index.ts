import { Router } from 'express';
import { uploadRoutes } from './uploadRoutes';
import { UploadController } from '../controllers/uploadController';

const router = Router();

// Montar las rutas de upload
router.use('/', uploadRoutes);

// Ruta raíz con información del servicio
router.get('/', UploadController.getServiceInfo);

export { router as routes };