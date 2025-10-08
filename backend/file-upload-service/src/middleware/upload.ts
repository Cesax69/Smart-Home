import multer from 'multer';
import path from 'path';
import { Request } from 'express';

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Usar siempre directorio temporal. El servicio sube a Google Drive.
    const uploadDir = 'temp/';
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: Function) => {
    // Generar nombre único con timestamp y extensión original
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, extension);
    cb(null, `${baseName}-${uniqueSuffix}${extension}`);
  }
});

// Filtro de archivos (opcional - permite todos los tipos por defecto)
const fileFilter = (req: Request, file: Express.Multer.File, cb: Function) => {
  // Tipos de archivo permitidos (puedes personalizar según necesidades)
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

// Configuración de multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
    files: 10 // Permitir hasta 10 archivos por request
  }
});

// Middleware para manejar errores de multer
export const handleMulterError = (error: any, req: Request, res: any, next: Function) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'El archivo es demasiado grande. Tamaño máximo: 10MB'
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
  
  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};