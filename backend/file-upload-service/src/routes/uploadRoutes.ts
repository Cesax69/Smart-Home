import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { upload, handleMulterError } from '../middleware/upload';

const router = Router();

/**
 * POST /upload
 * Endpoint principal para subir archivos
 */
router.post('/upload', 
  upload.single('file'), // 'file' es el nombre del campo en el form-data
  handleMulterError,
  UploadController.uploadFile
);

/**
 * GET /health
 * Endpoint de salud del servicio
 */
router.get('/health', UploadController.healthCheck);

export { router as uploadRoutes };