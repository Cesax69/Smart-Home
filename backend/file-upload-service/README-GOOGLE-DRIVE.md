# 📁 File Upload Service - Integración con Google Drive

Este microservicio ha sido actualizado para soportar almacenamiento en **Google Drive** además del almacenamiento local tradicional.

## 🚀 Características

- ✅ **Almacenamiento dual**: Local o Google Drive
- ✅ **Subida automática** a Google Drive
- ✅ **URLs públicas** para acceso directo
- ✅ **Gestión de archivos** (listar, obtener info, eliminar)
- ✅ **Limpieza automática** de archivos temporales
- ✅ **Verificación de conexión** con Google Drive

## ⚙️ Configuración

### 1. Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura las siguientes variables:

```bash
# Configuración de almacenamiento
STORAGE_TYPE=google_drive  # 'local' o 'google_drive'

# Configuración de Google Drive
GOOGLE_DRIVE_CLIENT_ID=tu_client_id_aqui
GOOGLE_DRIVE_CLIENT_SECRET=tu_client_secret_aqui
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:3003/auth/google/callback
GOOGLE_DRIVE_REFRESH_TOKEN=tu_refresh_token_aqui
GOOGLE_DRIVE_FOLDER_ID=id_de_carpeta_opcional
```

### 2. Obtener Credenciales de Google Drive

#### Paso 1: Crear Proyecto en Google Cloud Console
1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la **Google Drive API**

#### Paso 2: Crear Credenciales OAuth2
1. Ve a **APIs & Services > Credentials**
2. Clic en **Create Credentials > OAuth 2.0 Client IDs**
3. Configura:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `http://localhost:3003/auth/google/callback`
4. Guarda el **Client ID** y **Client Secret**

#### Paso 3: Obtener Refresh Token
Puedes usar este script de Node.js para obtener el refresh token:

```javascript
const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
  'TU_CLIENT_ID',
  'TU_CLIENT_SECRET',
  'http://localhost:3003/auth/google/callback'
);

// Genera la URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive.file']
});

console.log('Visita esta URL:', authUrl);
// Después de autorizar, usa el código para obtener tokens
```

## 📋 Endpoints Disponibles

### Endpoints Básicos
- `POST /upload` - Subir archivo
- `GET /health` - Estado del servicio
- `GET /` - Información del servicio

### Endpoints de Google Drive (solo cuando `STORAGE_TYPE=google_drive`)
- `GET /drive/files` - Listar archivos
- `GET /drive/files/:fileId` - Información de archivo específico
- `DELETE /drive/files/:fileId` - Eliminar archivo

## 🔧 Uso

### Subir Archivo

```bash
curl -X POST \
  -F "file=@imagen.jpg" \
  http://localhost:3003/upload
```

**Respuesta con Google Drive:**
```json
{
  "success": true,
  "message": "Archivo subido exitosamente a Google Drive",
  "fileUrl": "https://drive.google.com/uc?id=1ABC123...",
  "fileInfo": {
    "originalName": "imagen.jpg",
    "filename": "imagen-1234567890-123456789.jpg",
    "fileId": "1ABC123DEF456GHI789JKL",
    "mimetype": "image/jpeg",
    "size": 245760,
    "uploadDate": "2024-01-15T10:30:00.000Z",
    "webViewLink": "https://drive.google.com/file/d/1ABC123.../view",
    "downloadLink": "https://drive.google.com/uc?id=1ABC123...",
    "storage": "google_drive"
  }
}
```

### Listar Archivos de Google Drive

```bash
curl http://localhost:3003/drive/files?pageSize=20
```

### Verificar Estado del Servicio

```bash
curl http://localhost:3003/health
```

## 🔄 Migración desde Almacenamiento Local

1. **Cambiar configuración**: Actualiza `STORAGE_TYPE=google_drive` en `.env`
2. **Configurar credenciales**: Añade las variables de Google Drive
3. **Reiniciar servicio**: Los nuevos archivos se subirán a Google Drive
4. **Archivos existentes**: Los archivos locales permanecen accesibles en `/files/:filename`

## 🛠️ Desarrollo

### Estructura de Archivos
```
src/
├── controllers/
│   └── uploadController.ts    # Lógica de subida (local + Google Drive)
├── middleware/
│   └── upload.ts             # Configuración de multer
├── routes/
│   ├── index.ts              # Rutas principales
│   └── uploadRoutes.ts       # Rutas de upload y Google Drive
├── services/
│   └── googleDriveService.ts # Servicio de Google Drive API
└── app.ts                    # Aplicación principal
```

### Directorios
- `uploads/` - Archivos almacenados localmente
- `temp/` - Archivos temporales (se eliminan después de subir a Google Drive)

## 🔍 Troubleshooting

### Error: "Configuración de Google Drive incompleta"
- Verifica que todas las variables de entorno estén configuradas
- Asegúrate de que el refresh token sea válido

### Error: "Error conectando con Google Drive"
- Verifica las credenciales OAuth2
- Confirma que la Google Drive API esté habilitada
- Revisa que el refresh token no haya expirado

### Archivos no se suben a Google Drive
- Verifica que `STORAGE_TYPE=google_drive`
- Revisa los logs del servicio para errores específicos
- Confirma que la carpeta de destino exista (si se especifica `GOOGLE_DRIVE_FOLDER_ID`)

## 📊 Monitoreo

El endpoint `/health` proporciona información sobre:
- Estado del servicio
- Tipo de almacenamiento configurado
- Estado de conexión con Google Drive
- Información del usuario de Google Drive

## 🔐 Seguridad

- Los archivos en Google Drive se configuran como **públicos** para acceso directo
- Las credenciales OAuth2 se almacenan como variables de entorno
- Los archivos temporales se eliminan automáticamente después de la subida
- Se mantienen los límites de tamaño y tipos de archivo

## 📈 Rendimiento

- **Almacenamiento local**: Acceso inmediato, limitado por espacio en disco
- **Google Drive**: URLs públicas, almacenamiento ilimitado, dependiente de la conexión a internet

---

¿Necesitas ayuda? Revisa los logs del servicio o contacta al equipo de desarrollo.