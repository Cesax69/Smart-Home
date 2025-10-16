# File Upload Service

Microservicio especializado para la carga y gestión de archivos en el ecosistema Smart Home.

## 🚀 Características

- **Carga de archivos** con validación de tipos y tamaños
- **API REST** orientada a subida y consulta
- **Almacenamiento en Google Drive** (sin uso de disco local)
- **Validación robusta** de archivos y manejo de errores
- **Enlaces públicos** de Google Drive (`fileUrl`, `webViewLink`, `downloadLink`)

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
├── (sin carpeta uploads)          # Todo se sube directamente a Google Drive
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

El servicio se ejecuta en el puerto **3005** por defecto (interno). Para clientes y otros microservicios, consume siempre vía **API Gateway** en `http://localhost:3000/api/files`.

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

**Ejemplo con curl (API Gateway recomendado):**
```bash
curl -X POST \
  -F "file=@imagen.jpg" \
  -F "file=@otra-imagen.png" \
  http://localhost:3000/api/files/upload
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

### 📁 Explorar Archivos en Drive
```http
GET /drive/files
```

**Ejemplo (Gateway):**
```
http://localhost:3000/api/files/drive/files
```

### ❤️ Health Check
```http
GET /health
```

**Ejemplo (Gateway):**
```
curl http://localhost:3000/api/files/health
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

# Configuración de archivos (Memoria + Google Drive)
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain

# Configuración de Logs
LOG_LEVEL=info

# Configuración de Google Drive
GOOGLE_DRIVE_CLIENT_ID=your_google_client_id_here
GOOGLE_DRIVE_CLIENT_SECRET=your_google_client_secret_here
# Puedes usar callback vía API Gateway o directo:
# GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3000/api/files/auth/google/callback
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3005/auth/google/callback
GOOGLE_DRIVE_REFRESH_TOKEN=your_refresh_token_here
GOOGLE_DRIVE_FOLDER_ID=your_folder_id_here

# Configuración de almacenamiento
STORAGE_TYPE=google_drive
```

### Límites y Restricciones

- **Tamaño máximo de archivo:** 10MB
- **Tipos permitidos:**
  - Imágenes: JPEG, PNG, GIF, WebP
  - Documentos: PDF, TXT, DOC, DOCX
- **Archivos por request:** hasta 20
- **Campo de formulario:** `file`

## 🛡️ Validación y Seguridad

- Validación de tipos MIME
- Límites de tamaño de archivo
- Nombres de archivo únicos con timestamp
- Headers de seguridad configurados
- Manejo robusto de errores

## 🔄 Flujo de Funcionamiento (Drive-only)

1. **Cliente envía archivo(s)** vía `POST /upload` (multipart/form-data)
2. **Multer (memoryStorage)** procesa y valida los archivos en memoria
3. **El servicio sube** cada archivo a Google Drive
4. **Se retorna** información y enlaces públicos (`fileUrl`, `webViewLink`, `downloadLink`)
5. **Opcional**: se organizan en carpetas por título de tarea (`taskTitle`), carpeta específica (`folderId`) o subcarpeta (`subfolder`)

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

Estado actual (Drive-only): este servicio no usa volúmenes ni directorios locales; todo el guardado se realiza en Google Drive.

Para ejecutar el servicio:

```powershell
docker compose up -d --build file-upload-service
```

Notas:
- No uses `down -v` para limpiar volúmenes (no se crean volúmenes locales).
- Las rutas locales tipo `/files/:filename` ya no están disponibles; usa los enlaces de Google Drive devueltos por los endpoints.