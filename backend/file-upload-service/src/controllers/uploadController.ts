import { Request, Response } from 'express';
import path from 'path';
import { GoogleDriveService } from '../services/googleDriveService';
import fs from 'fs';

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

      const file = req.file;
      const storageType = process.env.STORAGE_TYPE || 'local';

      if (storageType === 'google_drive') {
        // Subir a Google Drive
        await UploadController.uploadToGoogleDrive(req, res);
      } else {
        // Subir localmente (comportamiento original)
        await UploadController.uploadLocally(req, res);
      }

    } catch (error) {
      console.error('❌ Error en uploadFile:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al procesar el archivo'
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

      // Leer el archivo desde el sistema temporal
      const fileBuffer = fs.readFileSync(file.path);

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

      // Eliminar archivo temporal
      fs.unlinkSync(file.path);

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
      // Limpiar archivo temporal en caso de error
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      
      console.error('❌ Error subiendo a Google Drive:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      res.status(500).json({
        success: false,
        message: `Error subiendo archivo a Google Drive: ${errorMessage}`
      });
    }
  }

  /**
   * Subir archivo localmente (comportamiento original)
   */
  private static async uploadLocally(req: Request, res: Response): Promise<void> {
    const file = req.file!;
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3003}`;
    const fileUrl = `${baseUrl}/files/${file.filename}`;

    // Log de la operación
    console.log(`📁 Archivo subido exitosamente: ${file.originalname} -> ${file.filename}`);
    console.log(`📊 Tamaño: ${(file.size / 1024).toFixed(2)} KB`);
    console.log(`🔗 URL de acceso: ${fileUrl}`);

    // Respuesta exitosa con la URL del archivo
    res.status(200).json({
      success: true,
      message: 'Archivo subido exitosamente',
      fileUrl: fileUrl,
      fileInfo: {
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        uploadDate: new Date().toISOString(),
        storage: 'local'
      }
    });
  }

  /**
   * Endpoint de salud del servicio
   */
  public static async healthCheck(req: Request, res: Response): Promise<void> {
    const storageType = process.env.STORAGE_TYPE || 'local';
    let driveStatus = 'N/A';

    // Si está configurado para Google Drive, verificar conexión
    if (storageType === 'google_drive') {
      try {
        const driveService = UploadController.initializeGoogleDrive();
        const isConnected = await driveService.testConnection();
        driveStatus = isConnected ? 'Conectado ✅' : 'Error de conexión';
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        driveStatus = `Error: ${errorMessage}`;
      }
    }

    res.status(200).json({
      success: true,
      message: 'File Upload Service está funcionando correctamente',
      timestamp: new Date().toISOString(),
      service: 'file-upload-service',
      version: '1.0.0',
      storage: {
        type: storageType,
        googleDriveStatus: driveStatus
      }
    });
  }

  /**
   * Información del servicio
   */
  public static async getServiceInfo(req: Request, res: Response): Promise<void> {
    const storageType = process.env.STORAGE_TYPE || 'local';
    
    res.status(200).json({
      success: true,
      message: 'File Upload Service - Microservicio para carga y gestión de archivos',
      version: '1.0.0',
      storage: {
        type: storageType,
        description: storageType === 'google_drive' 
          ? 'Archivos almacenados en Google Drive' 
          : 'Archivos almacenados localmente'
      },
      endpoints: {
        upload: 'POST /upload',
        files: storageType === 'local' ? 'GET /files/:filename' : 'N/A (Google Drive)',
        health: 'GET /health',
        driveFiles: storageType === 'google_drive' ? 'GET /drive/files' : 'N/A'
      },
      features: [
        'Carga de archivos con multer',
        storageType === 'google_drive' ? 'Integración con Google Drive API' : 'Servicio de archivos estáticos',
        'Validación de tipos de archivo',
        'Límites de tamaño configurables',
        storageType === 'google_drive' ? 'URLs públicas de Google Drive' : 'URLs de acceso público'
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
      const storageType = process.env.STORAGE_TYPE || 'local';
      
      if (storageType !== 'google_drive') {
        res.status(400).json({
          success: false,
          message: 'Este endpoint solo está disponible cuando STORAGE_TYPE=google_drive'
        });
        return;
      }

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
   * Obtener información de un archivo específico de Google Drive
   */
  public static async getDriveFileInfo(req: Request, res: Response): Promise<void> {
    try {
      const storageType = process.env.STORAGE_TYPE || 'local';
      
      if (storageType !== 'google_drive') {
        res.status(400).json({
          success: false,
          message: 'Este endpoint solo está disponible cuando STORAGE_TYPE=google_drive'
        });
        return;
      }

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
   */
  public static async deleteDriveFile(req: Request, res: Response): Promise<void> {
    try {
      const storageType = process.env.STORAGE_TYPE || 'local';
      
      if (storageType !== 'google_drive') {
        res.status(400).json({
          success: false,
          message: 'Este endpoint solo está disponible cuando STORAGE_TYPE=google_drive'
        });
        return;
      }

      const fileId = req.params.fileId;
      if (!fileId) {
        res.status(400).json({
          success: false,
          message: 'ID de archivo requerido'
        });
        return;
      }

      const driveService = UploadController.initializeGoogleDrive();
      const deleted = await driveService.deleteFile(fileId);
      
      if (deleted) {
        res.status(200).json({
          success: true,
          message: 'Archivo eliminado exitosamente',
          fileId: fileId
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
}