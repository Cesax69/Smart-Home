import { Request, Response } from 'express';
import path from 'path';

export class UploadController {
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
          uploadDate: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error en uploadFile:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al procesar el archivo'
      });
    }
  }

  /**
   * Endpoint de salud del servicio
   */
  public static async healthCheck(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      message: 'File Upload Service está funcionando correctamente',
      timestamp: new Date().toISOString(),
      service: 'file-upload-service',
      version: '1.0.0'
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
      endpoints: {
        upload: 'POST /upload',
        files: 'GET /files/:filename',
        health: 'GET /health'
      },
      features: [
        'Carga de archivos con multer',
        'Servicio de archivos estáticos',
        'Validación de tipos de archivo',
        'Límites de tamaño configurables',
        'URLs de acceso público'
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
}