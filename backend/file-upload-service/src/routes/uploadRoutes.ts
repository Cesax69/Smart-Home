import { Router } from 'express';
import { UploadController } from '../controllers/uploadController';
import { upload, handleMulterError } from '../middleware/upload';

const router = Router();

/**
 * POST /upload
 * Endpoint principal para subir archivos
 */
router.post('/upload', 
  // Soporta múltiples archivos enviando varios campos 'file'
  upload.array('file', 20),
  handleMulterError,
  UploadController.uploadFiles
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
 * GET /drive/folders/:folderId/files
 * Listar archivos de una carpeta específica de Google Drive
 */
router.get('/drive/folders/:folderId/files', UploadController.listDriveFilesInFolder);

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

/**
 * DELETE /drive/folders/:folderId
 * Eliminar carpeta de Google Drive (opcionalmente recursivo)
 */
router.delete('/drive/folders/:folderId', UploadController.deleteDriveFolder);

export { router as uploadRoutes };