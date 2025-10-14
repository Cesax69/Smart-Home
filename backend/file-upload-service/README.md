# File Upload Service

Microservicio especializado para la carga y gestión de archivos en el ecosistema Smart Home.

## 🚀 Características

- **Carga de archivos** con validación de tipos y tamaños
- **Servicio de archivos estáticos** para acceso público
- **API REST simple** con un único endpoint especializado
- **Validación robusta** de archivos y manejo de errores
- **URLs públicas** para acceso directo a archivos

## 📁 Estructura del Proyecto

```
file-upload-service/
├── src/
│   ├── controllers/
│   │   └── uploadController.ts    # Controlador de carga
│   ├── middleware/
│   │   └── upload.ts              # Configuración de multer
│   ├── routes/
│   │   ├── uploadRoutes.ts        # Rutas de upload
│   │   └── index.ts               # Rutas principales
│   └── app.ts                     # Servidor principal
├── uploads/                       # Carpeta de archivos subidos
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Ejecutar en desarrollo
npm run dev

# Ejecutar en producción
npm start
```

## 🚀 Ejecución

El servicio se ejecuta en el puerto **3005** por defecto.

```bash
# Desarrollo con recarga automática
npm run dev

# Producción
npm start
```

## 📊 Modelo de Datos

### Respuesta de Carga Exitosa
```json
{
  "success": true,
  "message": "Archivo subido exitosamente",
  "fileUrl": "https://drive.google.com/uc?id=ARCHIVO_ID",
  "fileInfo": {
    "originalName": "imagen.jpg",
    "filename": "imagen-1234567890.jpg",
    "mimetype": "image/jpeg",
    "size": 245760,
    "uploadDate": "2024-01-15T10:30:00.000Z"
  }
}
```

## 🌐 API Endpoints

### 📤 Subir Archivo
```http
POST /upload
Content-Type: multipart/form-data

Campo: file (archivo)
```

**Ejemplo con curl:**
```bash
curl -X POST -F "file=@imagen.jpg" http://localhost:3005/upload
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Archivo subido exitosamente",
  "fileUrl": "https://drive.google.com/uc?id=ARCHIVO_ID",
  "fileInfo": {
    "originalName": "imagen.jpg",
    "filename": "imagen-1234567890.jpg",
    "mimetype": "image/jpeg",
    "size": 245760,
    "uploadDate": "2024-01-15T10:30:00.000Z"
  }
}
```

### 📁 Acceder a Archivos
```http
GET /drive/files
```

**Ejemplo:**
```
http://localhost:3005/drive/files
```

### ❤️ Health Check
```http
GET /health
```

**Respuesta:**
```json
{
  "success": true,
  "message": "File Upload Service está funcionando correctamente",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "file-upload-service",
  "version": "1.0.0"
}
```

### ℹ️ Información del Servicio
```http
GET /
```

## 📋 Scripts Disponibles

- `npm start` - Ejecutar en producción
- `npm run dev` - Ejecutar en desarrollo con recarga automática
- `npm run build` - Compilar TypeScript
- `npm run build:watch` - Compilar con observación de cambios

## 🔧 Configuración

### Variables de Entorno (.env)

```env
# Configuración del Servidor
PORT=3005
NODE_ENV=development

# Configuración de Archivos
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain

# Configuración de URLs
BASE_URL=http://localhost:3005

# Configuración de Logs
LOG_LEVEL=info
```

### Límites y Restricciones

- **Tamaño máximo de archivo:** 10MB
- **Tipos permitidos:**
  - Imágenes: JPEG, PNG, GIF, WebP
  - Documentos: PDF, TXT, DOC, DOCX
- **Archivos por request:** 1
- **Campo de formulario:** `file`

## 🛡️ Validación y Seguridad

- Validación de tipos MIME
- Límites de tamaño de archivo
- Nombres de archivo únicos con timestamp
- Headers de seguridad configurados
- Manejo robusto de errores

## 🔄 Flujo de Funcionamiento

1. **Cliente envía archivo** via POST /upload
2. **Multer procesa** el archivo y lo valida
3. **Archivo se guarda** en /uploads con nombre único
4. **Servicio retorna** URL pública del archivo
5. **Archivo es accesible** via GET /files/:filename

## 🚨 Manejo de Errores

### Errores Comunes

- **400 Bad Request:** Archivo no válido o demasiado grande
- **404 Not Found:** Archivo no encontrado
- **500 Internal Server Error:** Error del servidor

### Ejemplos de Respuestas de Error

```json
{
  "success": false,
  "message": "El archivo es demasiado grande. Tamaño máximo: 10MB"
}
```

```json
{
  "success": false,
  "message": "Tipo de archivo no permitido: application/exe"
}
```

## 🏗️ Arquitectura

- **Patrón MVC** con controladores y rutas separadas
- **Middleware especializado** para manejo de archivos
- **Configuración modular** y extensible
- **Logging estructurado** para monitoreo

## 🔮 Desarrollo Futuro

- [ ] Integración con servicios de almacenamiento en la nube (AWS S3, Google Cloud)
- [ ] Redimensionamiento automático de imágenes
- [ ] Compresión de archivos
- [ ] Autenticación y autorización
- [ ] Límites por usuario
- [ ] Análisis de virus/malware
- [ ] Metadatos extendidos de archivos

---

**File Upload Service** - Microservicio especializado para carga de archivos  
Versión: 1.0.0  
Puerto: 3005

## 🚢 Ejecución con Docker (recomendado)

Para arrancar en estado limpio (sin archivos previos en volúmenes):

```powershell
docker compose down -v
docker compose up -d --build
```

Volúmenes gestionados por Docker Compose:
- `file_uploads` → almacenamiento persistente de archivos subidos
- `file_temp` → archivos temporales
- `file_quarantine` → cuarentena de archivos

Al ejecutar `down -v`, se eliminan estos volúmenes y el servicio comienza sin archivos residuales.