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

/**
 * Rutas específicas para Google Drive (solo disponibles cuando STORAGE_TYPE=google_drive)
 */

/**
 * GET /drive/files
 * Listar archivos de Google Drive
 */
router.get('/drive/files', UploadController.listDriveFiles);

/**
 * GET /drive/files/:fileId
 * Obtener información de un archivo específico de Google Drive
 */
router.get('/drive/files/:fileId', UploadController.getDriveFileInfo);

/**
 * DELETE /drive/files/:fileId
 * Eliminar archivo de Google Drive
 */
router.delete('/drive/files/:fileId', UploadController.deleteDriveFile);

export { router as uploadRoutes };