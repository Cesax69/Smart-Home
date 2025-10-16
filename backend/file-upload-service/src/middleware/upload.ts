import multer from 'multer';
import { Request } from 'express';

// Almacenamiento en memoria: elimina completamente el uso de disco local
const storage = multer.memoryStorage();

// Filtro de archivos (permitidos por tipo MIME)
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`), false);
  }
};

// Configuración de multer (límites tomados desde env si están disponibles)
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB por defecto
    files: 10
  }
});

// Middleware para manejar errores de multer
export const handleMulterError = (error: any, req: Request, res: any, next: Function) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Tamaño máximo permitido'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Demasiados archivos. Límite máximo por request excedido'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Campo de archivo inesperado'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Error de carga: ${error.message}`
        });
    }
  }

  if (error?.message?.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};