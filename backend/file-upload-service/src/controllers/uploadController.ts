import { Request, Response } from 'express';
import path from 'path';
import { GoogleDriveService } from '../services/googleDriveService';

export class UploadController {
  private static googleDriveService: GoogleDriveService | null = null;

  /**
   * Inicializar Google Drive Service
   */
  private static initializeGoogleDrive(): GoogleDriveService {
    if (!this.googleDriveService) {
      const config = {
        clientId: process.env.GOOGLE_DRIVE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET!,
        redirectUri: process.env.GOOGLE_DRIVE_REDIRECT_URI!,
        refreshToken: process.env.GOOGLE_DRIVE_REFRESH_TOKEN!,
        folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
      };

      this.googleDriveService = new GoogleDriveService(config);
    }
    return this.googleDriveService;
  }

  /**
   * Maneja la carga de un archivo
   */
  public static async uploadFile(req: Request, res: Response): Promise<void> {
    try {
      // Verificar si se subió un archivo
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No se proporcionó ningún archivo'
        });
        return;
      }

      // Forzar siempre Google Drive
      await UploadController.uploadToGoogleDrive(req, res);

    } catch (error) {
      console.error('❌ Error en uploadFile:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al procesar el archivo'
      });
    }
  }

  /**
   * Maneja la carga de múltiples archivos
   */
  public static async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      const files = (req.files as Express.Multer.File[]) || [];

      if (!files.length) {
        res.status(400).json({
          success: false,
          message: 'No se proporcionaron archivos'
        });
        return;
      }

      // Verificar configuración de Google Drive
      if (!process.env.GOOGLE_DRIVE_CLIENT_ID || !process.env.GOOGLE_DRIVE_CLIENT_SECRET || 
          !process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
        throw new Error('Configuración de Google Drive incompleta');
      }

      // Inicializar servicio de Google Drive
      const driveService = UploadController.initializeGoogleDrive();

      // Determinar carpeta destino: si viene folderId, reutilizarla; si no, reutilizar por título o crear
      const providedFolderId = (req.body?.folderId || req.query?.folderId || '').toString().trim();
      let targetFolderId: string;
      let folderName: string;
      if (providedFolderId) {
        targetFolderId = providedFolderId;
        try {
          const info = await driveService.getFileInfo(targetFolderId);
          folderName = info?.name || 'Carpeta existente';
        } catch {
          folderName = 'Carpeta existente';
        }
      } else {
        const rawTitle = (req.body?.taskTitle || req.body?.title || req.query?.taskTitle || '').toString().trim();
        const taskTitle = rawTitle.length > 0 ? rawTitle : 'Sin título';
        const safeTitle = taskTitle.replace(/[\\/:*?"<>|]/g, '-');
        const parentFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;
        // Buscar carpeta existente por nombre estable (sin fecha)
        const exact = await driveService.findFolderByExactName(safeTitle, parentFolderId);
        const byPrefix = exact ? null : await driveService.findFolderByPrefix(`${safeTitle} - `, parentFolderId);
        const found = exact || byPrefix;
        if (found && found.id) {
          targetFolderId = found.id;
          folderName = found.name || safeTitle;
          // Renombrar a nombre estable si difiere
          if (folderName !== safeTitle) {
            await driveService.renameFolder(targetFolderId, safeTitle).catch(() => {});
            folderName = safeTitle;
          }
        } else {
          // Crear nueva carpeta con nombre estable
          try {
            targetFolderId = await driveService.createFolder(safeTitle, parentFolderId);
            folderName = safeTitle;
          } catch (err) {
            console.error('❌ Error creando carpeta destino en Google Drive:', err);
            throw new Error('No se pudo crear la carpeta de destino para la tarea');
          }
        }
      }

      // Soporte de subcarpeta (por ejemplo, "progress") bajo la carpeta de la tarea
      const rawSubfolder = (req.body?.subfolder || req.query?.subfolder || '').toString().trim();
      if (rawSubfolder) {
        const subfolderSafe = rawSubfolder.replace(/[\\/:*?"<>|]/g, '-');
        try {
          // Buscar subcarpeta exacta dentro de la carpeta destino
          const driveService = UploadController.initializeGoogleDrive();
          const existingSub = await driveService.findFolderByExactName(subfolderSafe, targetFolderId);
          if (existingSub?.id) {
            targetFolderId = existingSub.id;
            folderName = `${folderName}/${existingSub.name || subfolderSafe}`;
          } else {
            // Crear subcarpeta si no existe
            const subId = await driveService.createFolder(subfolderSafe, targetFolderId);
            targetFolderId = subId;
            folderName = `${folderName}/${subfolderSafe}`;
          }
        } catch (err) {
          console.warn('⚠️ No se pudo procesar subcarpeta, continuando en carpeta principal:', err);
        }
      }

      const uploaded: any[] = [];
      const failed: any[] = [];

      for (const file of files) {
        try {
          const fileBuffer = file.buffer;

          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const extension = path.extname(file.originalname);
          const baseName = path.basename(file.originalname, extension);
          const uniqueFileName = `${baseName}-${uniqueSuffix}${extension}`;

          const uploadResult = await driveService.uploadFileToFolder(
            fileBuffer,
            uniqueFileName,
            file.mimetype,
            targetFolderId
          );

          console.log(`📁 Archivo subido a Google Drive: ${file.originalname} -> ${uniqueFileName}`);

          uploaded.push({
            originalName: file.originalname,
            filename: uploadResult.fileName,
            fileId: uploadResult.fileId,
            mimetype: file.mimetype,
            size: file.size,
            uploadDate: new Date().toISOString(),
            webViewLink: uploadResult.webViewLink,
            downloadLink: uploadResult.downloadLink,
            fileUrl: uploadResult.fileUrl,
            storage: 'google_drive',
            folderId: targetFolderId,
            folderName: folderName
          });
        } catch (err) {
          console.error(`❌ Error subiendo archivo ${file.originalname}:`, err);
          failed.push({
            originalName: file.originalname,
            error: err instanceof Error ? err.message : 'Error desconocido'
          });
        }
      }

      // Obtener enlace de la carpeta creada para incluirlo en la respuesta
      let folderInfo: any = { id: targetFolderId, name: folderName };
      try {
        const info = await driveService.getFileInfo(targetFolderId);
        folderInfo = {
          id: targetFolderId,
          name: folderName,
          webViewLink: info.webViewLink || undefined
        };
      } catch {}

      const statusCode = uploaded.length > 0 ? 200 : 500;
      res.status(statusCode).json({
        success: uploaded.length > 0,
        message: uploaded.length > 0
          ? `Subida completada a carpeta "${folderName}": ${uploaded.length} archivos OK, ${failed.length} fallidos`
          : 'No se pudo subir ningún archivo',
        folder: folderInfo,
        uploaded,
        failed
      });

    } catch (error) {
      console.error('❌ Error en uploadFiles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al procesar los archivos'
      });
    }
  }

  /**
   * Subir archivo a Google Drive
   */
  private static async uploadToGoogleDrive(req: Request, res: Response): Promise<void> {
    const file = req.file!;
    
    try {
      // Verificar configuración de Google Drive
      if (!process.env.GOOGLE_DRIVE_CLIENT_ID || !process.env.GOOGLE_DRIVE_CLIENT_SECRET || 
          !process.env.GOOGLE_DRIVE_REFRESH_TOKEN) {
        throw new Error('Configuración de Google Drive incompleta');
      }

      // Inicializar servicio de Google Drive
      const driveService = UploadController.initializeGoogleDrive();

      // Leer el archivo desde memoria (Multer memoryStorage)
      const fileBuffer = file.buffer;

      // Generar nombre único para el archivo
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const extension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, extension);
      const uniqueFileName = `${baseName}-${uniqueSuffix}${extension}`;

      // Subir a Google Drive
      const uploadResult = await driveService.uploadFile(
        fileBuffer,
        uniqueFileName,
        file.mimetype
      );

      // Log de la operación
      console.log(`📁 Archivo subido exitosamente a Google Drive: ${file.originalname} -> ${uniqueFileName}`);
      console.log(`📊 Tamaño: ${(file.size / 1024).toFixed(2)} KB`);
      console.log(`🔗 URL de acceso: ${uploadResult.fileUrl}`);

      // Respuesta exitosa con la información de Google Drive
      res.status(200).json({
        success: true,
        message: 'Archivo subido exitosamente a Google Drive',
        fileUrl: uploadResult.fileUrl,
        fileInfo: {
          originalName: file.originalname,
          filename: uploadResult.fileName,
          fileId: uploadResult.fileId,
          mimetype: file.mimetype,
          size: file.size,
          uploadDate: new Date().toISOString(),
          webViewLink: uploadResult.webViewLink,
          downloadLink: uploadResult.downloadLink,
          storage: 'google_drive'
        }
      });

    } catch (error) {
      console.error('❌ Error subiendo a Google Drive:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        message: `Error subiendo archivo a Google Drive: ${errorMessage}`
      });
    }
  }

  // Eliminado soporte de subida local. El servicio funciona exclusivamente con Google Drive.

  /**
   * Endpoint de salud del servicio
   */
  public static async healthCheck(req: Request, res: Response): Promise<void> {
    let driveStatus = 'N/A';
    try {
      const driveService = UploadController.initializeGoogleDrive();
      const isConnected = await driveService.testConnection();
      driveStatus = isConnected ? 'Conectado ✅' : 'Error de conexión';
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      driveStatus = `Error: ${errorMessage}`;
    }

    res.status(200).json({
      success: true,
      message: 'File Upload Service está funcionando correctamente',
      timestamp: new Date().toISOString(),
      service: 'file-upload-service',
      version: '1.0.0',
      storage: {
        type: 'google_drive',
        googleDriveStatus: driveStatus
      }
    });
  }

  /**
   * Información del servicio
   */
  public static async getServiceInfo(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'File Upload Service - Microservicio para carga y gestión de archivos',
      version: '1.0.0',
      storage: {
        type: 'google_drive',
        description: 'Archivos almacenados en Google Drive'
      },
      endpoints: {
        upload: 'POST /upload',
        health: 'GET /health',
        driveFiles: 'GET /drive/files'
      },
      features: [
        'Carga de archivos con multer',
        'Integración con Google Drive API',
        'Validación de tipos de archivo',
        'Límites de tamaño configurables',
        'URLs públicas de Google Drive'
      ],
      limits: {
        maxFileSize: '10MB',
        allowedTypes: [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'text/plain', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
      }
    });
  }

  /**
   * Listar archivos de Google Drive (nuevo endpoint)
   */
  public static async listDriveFiles(req: Request, res: Response): Promise<void> {
    try {
      const driveService = UploadController.initializeGoogleDrive();
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      
      const files = await driveService.listFiles(pageSize);
      
      res.status(200).json({
        success: true,
        message: 'Archivos obtenidos exitosamente',
        files: files,
        count: files.length
      });

    } catch (error) {
      console.error('❌ Error listando archivos de Google Drive:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        message: `Error obteniendo archivos: ${errorMessage}`
      });
    }
  }

  /**
   * Listar archivos de Google Drive en una carpeta específica
   * GET /drive/folders/:folderId/files
   */
  public static async listDriveFilesInFolder(req: Request, res: Response): Promise<void> {
    try {
      const folderId = req.params.folderId;
      if (!folderId) {
        res.status(400).json({ success: false, message: 'folderId requerido' });
        return;
      }
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const driveService = UploadController.initializeGoogleDrive();
      const files = await driveService.listFilesInFolder(folderId, pageSize);
      res.status(200).json({ success: true, message: 'Archivos obtenidos exitosamente', files, count: files.length });
    } catch (error) {
      console.error('❌ Error listando archivos por carpeta:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, message: `Error obteniendo archivos por carpeta: ${errorMessage}` });
    }
  }

  /**
   * Buscar carpeta de Google Drive por nombre exacto
   * GET /drive/folders/by-name?name=...&parentId=...
   */
  public static async getDriveFolderByName(req: Request, res: Response): Promise<void> {
    try {
      const name = (req.query.name as string || '').toString().trim();
      const parentId = (req.query.parentId as string || '').toString().trim() || undefined;
      if (!name) {
        res.status(400).json({ success: false, message: 'Parámetro name requerido' });
        return;
      }
      const driveService = UploadController.initializeGoogleDrive();
      // Normalizar nombre igual que en creación de carpeta
      const safeName = name.replace(/[\\/:*?"<>|]/g, '-');
      const foundExact = await driveService.findFolderByExactName(safeName, parentId);
      const foundByPrefix = foundExact ? null : await driveService.findFolderByPrefix(`${safeName} - `, parentId);
      const found = foundExact || foundByPrefix;
      if (found && found.id) {
        res.status(200).json({ success: true, folder: { id: found.id, name: found.name, parents: found.parents } });
      } else {
        res.status(404).json({ success: false, message: 'Carpeta no encontrada' });
      }
    } catch (error) {
      console.error('❌ Error buscando carpeta por nombre:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, message: `Error buscando carpeta: ${errorMessage}` });
    }
  }

  /**
   * Obtener información de un archivo específico de Google Drive
   */
  public static async getDriveFileInfo(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;
      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'ID de archivo requerido'
        });
        return;
      }

      const driveService = UploadController.initializeGoogleDrive();
      const fileInfo = await driveService.getFileInfo(fileId);
      
      res.status(200).json({
        success: true,
        message: 'Información del archivo obtenida exitosamente',
        fileInfo: fileInfo
      });

    } catch (error) {
      console.error('❌ Error obteniendo información del archivo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        message: `Error obteniendo información del archivo: ${errorMessage}`
      });
    }
  }

  /**
   * Eliminar archivo de Google Drive
   * DELETE /drive/files/:fileId?deleteEmptyFolder=true|false
   */
  public static async deleteDriveFile(req: Request, res: Response): Promise<void> {
    try {
      const fileId = req.params.fileId;
      // Parámetro para controlar si se elimina la carpeta vacía
      const deleteEmptyFolder = req.query.deleteEmptyFolder === 'true';
      
      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'ID de archivo requerido'
        });
        return;
      }

      const driveService = UploadController.initializeGoogleDrive();
      // Obtener carpeta contenedora antes de borrar
      let parentFolderId: string | null = null;
      try {
        const info = await driveService.getFileInfo(fileId);
        const parents: string[] = Array.isArray(info?.parents) ? info.parents : [];
        parentFolderId = parents.length ? parents[0] : null;
      } catch {}

      const deleted = await driveService.deleteFile(fileId);
      
      if (deleted) {
        // Eliminar carpeta vacía solo si se solicita explícitamente
        let folderDeleted = false;
        if (deleteEmptyFolder && parentFolderId) {
          try {
            const remaining = await driveService.listFilesInFolder(parentFolderId, 10);
            if (!remaining || remaining.length === 0) {
              folderDeleted = await driveService.deleteFolder(parentFolderId);
            }
          } catch {}
        }
        res.status(200).json({
          success: true,
          message: 'Archivo eliminado exitosamente',
          fileId: fileId,
          folderDeleted: folderDeleted,
          folderId: parentFolderId || undefined
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'No se pudo eliminar el archivo'
        });
      }

    } catch (error) {
      console.error('❌ Error eliminando archivo de Google Drive:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        message: `Error eliminando archivo: ${errorMessage}`
      });
    }
  }

  /**
   * Eliminar carpeta de Google Drive
   * DELETE /drive/folders/:folderId?recursive=true
   */
  public static async deleteDriveFolder(req: Request, res: Response): Promise<void> {
    try {
      const folderId = req.params.folderId;
      const recursive = (req.query.recursive as string) === 'true';
      if (!folderId) {
        res.status(400).json({ success: false, message: 'ID de carpeta requerido' });
        return;
      }

      const driveService = UploadController.initializeGoogleDrive();
      let ok = false;
      if (recursive) {
        ok = await driveService.deleteFolderRecursive(folderId);
      } else {
        // Si no es recursivo, intentamos borrar sólo si está vacía
        const remaining = await driveService.listFilesInFolder(folderId, 10).catch(() => []);
        if (!remaining || remaining.length === 0) {
          ok = await driveService.deleteFolder(folderId);
        } else {
          // No vacía: devolver información
          res.status(409).json({ success: false, message: 'La carpeta no está vacía', count: remaining.length });
          return;
        }
      }

      if (ok) {
        res.status(200).json({ success: true, message: 'Carpeta eliminada exitosamente', folderId });
      } else {
        res.status(500).json({ success: false, message: 'No se pudo eliminar la carpeta' });
      }
    } catch (error) {
      console.error('❌ Error eliminando carpeta de Google Drive:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({ success: false, message: `Error eliminando carpeta: ${errorMessage}` });
    }
  }
}