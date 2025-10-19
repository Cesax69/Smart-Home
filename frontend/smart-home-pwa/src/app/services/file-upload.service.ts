import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

export interface FileUploadResponse {
  success: boolean;
  message: string;
  fileUrl: string;
  fileInfo: {
    originalName: string;
    filename: string;
    mimetype: string;
    size: number;
    uploadDate: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FileUploadService {
  private readonly apiUrl = environment.services.fileUpload; // Use environment-configured base URL

  constructor(private http: HttpClient) {}

  /**
   * Subir un archivo al microservicio de file-upload
   */
  uploadFile(file: File, taskTitle?: string): Observable<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (taskTitle && taskTitle.trim().length > 0) {
      formData.append('taskTitle', taskTitle.trim());
    }

    return this.http.post<any>(`${this.apiUrl}/files/upload`, formData).pipe(
      map((res: any) => {
        const uploaded = Array.isArray(res?.uploaded) ? res.uploaded[0] : null;
        return {
          success: !!res?.success,
          message: res?.message || 'Subida completada',
          fileUrl: uploaded?.fileUrl || res?.fileUrl || '',
          fileInfo: {
            originalName: uploaded?.originalName || file.name,
            filename: uploaded?.filename || file.name,
            mimetype: uploaded?.mimetype || file.type,
            size: uploaded?.size || file.size,
            uploadDate: uploaded?.uploadDate || new Date().toISOString()
          }
        } as FileUploadResponse;
      })
    );
  }

  /**
   * Verificar el estado del servicio de subida de archivos
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/files/health`);
  }

  /**
   * Obtener información del servicio
   */
  getServiceInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/files/`);
  }

  /**
   * Listar archivos de Google Drive
   */
  listDriveFiles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/files/drive/files`);
  }

  /**
   * Obtener información de un archivo específico de Google Drive
   */
  getDriveFileInfo(fileId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/files/drive/files/${fileId}`);
  }

  /**
   * Eliminar archivo de Google Drive
   */
  deleteDriveFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/files/drive/files/${fileId}`);
  }

  /**
   * Subir múltiples archivos
   */
  uploadMultipleFiles(files: File[], taskTitle?: string): Observable<FileUploadResponse[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('file', file);
    });
    if (taskTitle && taskTitle.trim().length > 0) {
      formData.append('taskTitle', taskTitle.trim());
    }

    return this.http.post<any>(`${this.apiUrl}/files/upload`, formData).pipe(
      map((res: any) => {
        const uploaded = Array.isArray(res?.uploaded) ? res.uploaded : [];
        return uploaded.map((u: any, idx: number) => ({
          success: !!res?.success,
          message: res?.message || 'Subida completada',
          fileUrl: u?.fileUrl || '',
          fileInfo: {
            originalName: u?.originalName || files[idx]?.name,
            filename: u?.filename || files[idx]?.name,
            mimetype: u?.mimetype || files[idx]?.type,
            size: u?.size || files[idx]?.size,
            uploadDate: u?.uploadDate || new Date().toISOString()
          }
        } as FileUploadResponse));
      })
    );
  }

  /**
   * Validar tipo de archivo
   */
  isValidFileType(file: File): boolean {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    return allowedTypes.includes(file.type);
  }

  /**
   * Validar tamaño de archivo (10MB máximo)
   */
  isValidFileSize(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  }

  /**
   * Validar archivo (tipo y tamaño)
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!this.isValidFileType(file)) {
      return {
        valid: false,
        error: 'Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX'
      };
    }

    if (!this.isValidFileSize(file)) {
      return {
        valid: false,
        error: 'El archivo es demasiado grande. Tamaño máximo: 10MB'
      };
    }

    return { valid: true };
  }

  /**
   * Formatear tamaño de archivo en formato legible
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}