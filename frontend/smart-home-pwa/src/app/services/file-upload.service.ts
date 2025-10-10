import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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
  // Usar la URL del microservicio configurada en environment (p.ej. http://localhost:3005/api)
  private readonly apiUrl = environment.services.fileUpload;

  constructor(private http: HttpClient) {}

  /**
   * Subir un archivo vía API Gateway -> File Upload Service
   */
  uploadFile(file: File, options?: { taskTitle?: string; folderId?: string; subfolder?: string }): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.taskTitle) {
      formData.append('taskTitle', options.taskTitle);
      formData.append('title', options.taskTitle); // compatibilidad
    }
    if (options?.folderId) formData.append('folderId', options.folderId);
    if (options?.subfolder) formData.append('subfolder', options.subfolder);

    // Endpoint en el servicio: POST /upload (Gateway: /api/files -> strip prefix)
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Verificar el estado del servicio de subida de archivos
   */
  checkHealth(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  /**
   * Obtener información del servicio
   */
  getServiceInfo(): Observable<any> {
    return this.http.get(`${this.apiUrl}/`);
  }

  /**
   * Listar archivos de Google Drive
   */
  listDriveFiles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/drive/files`);
  }

  /**
   * Obtener información de un archivo específico de Google Drive
   */
  getDriveFileInfo(fileId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/drive/files/${fileId}`);
  }

  /**
   * Eliminar archivo de Google Drive
   */
  deleteDriveFile(fileId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/drive/files/${fileId}`);
  }

  /**
   * Subir múltiples archivos
   */
  uploadMultipleFiles(files: File[], options?: { taskTitle?: string; folderId?: string; subfolder?: string }): Observable<any> {
    const formData = new FormData();
    files.forEach(file => formData.append('file', file));
    if (options?.taskTitle) {
      formData.append('taskTitle', options.taskTitle);
      formData.append('title', options.taskTitle);
    }
    if (options?.folderId) formData.append('folderId', options.folderId);
    if (options?.subfolder) formData.append('subfolder', options.subfolder);

    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
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