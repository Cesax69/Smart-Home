import { google } from 'googleapis';
import { Readable } from 'stream';
import path from 'path';

export interface GoogleDriveConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  refreshToken: string;
  folderId?: string;
}

export interface UploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  webViewLink: string;
  downloadLink: string;
}

export class GoogleDriveService {
  private drive: any;
  private folderId: string;

  constructor(config: GoogleDriveConfig) {
    // Configurar OAuth2
    const oauth2Client = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
      config.redirectUri
    );

    oauth2Client.setCredentials({
      refresh_token: config.refreshToken
    });

    // Inicializar Google Drive API
    this.drive = google.drive({ version: 'v3', auth: oauth2Client });
    this.folderId = config.folderId || 'root';
  }

  /**
   * Subir archivo a Google Drive
   */
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<UploadResult> {
    try {
      // Crear stream desde el buffer
      const fileStream = new Readable();
      fileStream.push(fileBuffer);
      fileStream.push(null);

      // Configurar metadata del archivo
      const fileMetadata = {
        name: fileName,
        parents: this.folderId !== 'root' ? [this.folderId] : undefined
      };

      // Subir archivo
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: {
          mimeType: mimeType,
          body: fileStream
        },
        fields: 'id, name, webViewLink, webContentLink'
      });

      const file = response.data;

      // Hacer el archivo público (opcional)
      await this.makeFilePublic(file.id);

      // Generar URL de acceso directo
      const directLink = `https://drive.google.com/uc?id=${file.id}`;

      console.log(`📁 Archivo subido a Google Drive: ${fileName}`);
      console.log(`🔗 ID del archivo: ${file.id}`);
      console.log(`🌐 URL directa: ${directLink}`);

      return {
        fileId: file.id,
        fileName: file.name,
        fileUrl: directLink,
        webViewLink: file.webViewLink,
        downloadLink: file.webContentLink || directLink
      };

    } catch (error) {
      console.error('❌ Error al subir archivo a Google Drive:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      throw new Error(`Error al subir archivo a Google Drive: ${errorMessage}`);
    }
  }

  /**
   * Hacer archivo público para acceso directo
   */
  private async makeFilePublic(fileId: string): Promise<void> {
    try {
      await this.drive.permissions.create({
        fileId: fileId,
        resource: {
          role: 'reader',
          type: 'anyone'
        }
      });
      console.log(`🔓 Archivo ${fileId} configurado como público`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.warn(`⚠️ No se pudo hacer público el archivo ${fileId}:`, errorMessage);
    }
  }

  /**
   * Eliminar archivo de Google Drive
   */
  async deleteFile(fileId: string): Promise<boolean> {
    try {
      await this.drive.files.delete({
        fileId: fileId
      });
      console.log(`🗑️ Archivo eliminado de Google Drive: ${fileId}`);
      return true;
    } catch (error) {
      console.error(`❌ Error eliminando archivo ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Obtener información de un archivo
   */
  async getFileInfo(fileId: string): Promise<any> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, size, mimeType, createdTime, modifiedTime, webViewLink, webContentLink'
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Error obteniendo información del archivo ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Listar archivos en la carpeta configurada
   */
  async listFiles(pageSize: number = 10): Promise<any[]> {
    try {
      const response = await this.drive.files.list({
        q: this.folderId !== 'root' ? `'${this.folderId}' in parents` : undefined,
        pageSize: pageSize,
        fields: 'files(id, name, size, mimeType, createdTime, modifiedTime, webViewLink)'
      });
      return response.data.files || [];
    } catch (error) {
      console.error('❌ Error listando archivos:', error);
      throw error;
    }
  }

  /**
   * Crear carpeta en Google Drive
   */
  async createFolder(folderName: string, parentFolderId?: string): Promise<string> {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      });

      console.log(`📁 Carpeta creada en Google Drive: ${folderName} (ID: ${response.data.id})`);
      return response.data.id;
    } catch (error) {
      console.error(`❌ Error creando carpeta ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Verificar conexión con Google Drive
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.drive.about.get({
        fields: 'user, storageQuota'
      });
      
      console.log('✅ Conexión con Google Drive exitosa');
      console.log(`👤 Usuario: ${response.data.user.displayName}`);
      console.log(`💾 Almacenamiento usado: ${(response.data.storageQuota.usage / 1024 / 1024 / 1024).toFixed(2)} GB`);
      
      return true;
    } catch (error) {
      console.error('❌ Error conectando con Google Drive:', error);
      return false;
    }
  }
}