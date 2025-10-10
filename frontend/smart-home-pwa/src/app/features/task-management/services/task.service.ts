import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStats, TaskFile } from '../models/task.model';
import { AuthService } from '../../../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly API_URL = environment.services.tasks;
  private authService = inject(AuthService);

  constructor(private http: HttpClient) {}

  // Método para mapear estado al backend (inglés -> español)
  private mapStatusToBackend(status: string): string {
    const statusMap: { [key: string]: string } = {
      'pending': 'pendiente',
      'in_progress': 'en_proceso',
      'completed': 'completada'
    };
    return statusMap[status] || status;
  }

  // Método para mapear estado del backend al frontend (español -> inglés)
  private mapStatusFromBackend(status: string): 'pending' | 'in_progress' | 'completed' {
    const statusMap: { [key: string]: 'pending' | 'in_progress' | 'completed' } = {
      'pendiente': 'pending',
      'en_proceso': 'in_progress',
      'completada': 'completed'
    };
    return statusMap[status] || 'pending';
  }

  // Método para manejar errores
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }

  // Sin datos de prueba: sólo datos de la API/BD

  // Helpers de mapeo de prioridad y conversión de Task del backend al FE
  private mapPriorityToFrontend(priority: string | undefined): 'low' | 'medium' | 'high' {
    switch ((priority || '').toLowerCase()) {
      case 'baja':
      case 'low':
        return 'low';
      case 'media':
      case 'medium':
        return 'medium';
      case 'alta':
      case 'urgente':
      case 'high':
        return 'high';
      default:
        return 'medium';
    }
  }

  // Mapear prioridad del FE (inglés) al backend (español)
  private mapPriorityToBackend(priority: string | undefined): 'baja' | 'media' | 'alta' {
    switch ((priority || '').toLowerCase()) {
      case 'low':
        return 'baja';
      case 'medium':
        return 'media';
      case 'high':
        return 'alta';
      default:
        return 'media';
    }
  }

  private mapTaskToFrontend(task: any): Task {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: this.mapStatusFromBackend(task.status),
      priority: this.mapPriorityToFrontend(task.priority),
      assignedTo: task.assignedUserId ?? task.assigned_to ?? task.assignedUserId,
      assignedUserIds: task.assignedUserIds ?? task.assigned_user_ids ?? ((task.assignedUserId ?? task.assigned_to) ? [task.assignedUserId ?? task.assigned_to] : undefined),
      assignedBy: task.createdById ?? task.assignedBy ?? task.user_id,
      startDate: task.startDate ?? task.start_date ?? undefined,
      dueDate: task.dueDate ?? task.due_date ?? undefined,
      estimatedTime: task.estimatedTime ?? task.estimated_time ?? undefined,
      isRecurring: task.isRecurring ?? task.is_recurring ?? undefined,
      recurrenceInterval: task.recurrenceInterval ?? task.recurrence_type ?? task.recurrence_interval ?? undefined,
      createdAt: task.createdAt ?? task.created_at,
      updatedAt: task.updatedAt ?? task.updated_at,
      completedAt: task.completedAt ?? task.completed_at ?? undefined,
      fileUrl: task.fileUrl ?? task.file_url ?? undefined,
      progress: task.progress ?? task.progress
    } as Task;
  }

  getTasks(filters?: {
    status?: string;
    assignedTo?: number;
    userId?: number;
    priority?: string;
    page?: number;
    limit?: number;
  }): Observable<{ tasks: Task[], total: number }> {
    let params = new HttpParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const paramKey = key === 'assignedTo' ? 'userId' : key;
          const paramValue = paramKey === 'status' ? this.mapStatusToBackend(String(value)) : String(value);
          params = params.set(paramKey, paramValue);
        }
      });
    }

    // El Gateway puede responder con { success, data, message } o el servicio con { tasks, total }
    return this.http.get<any>(`${this.API_URL}/tasks`, { params })
      .pipe(
        map((response: any) => {
          const rawTasks: any[] = Array.isArray(response)
            ? response
            : (response?.tasks ?? response?.data ?? []);
          const total: number = (response?.total ?? rawTasks.length ?? 0) as number;

          const tasks = rawTasks.map(t => this.mapTaskToFrontend(t));
          return { tasks, total };
        }),
        catchError(this.handleError<{ tasks: Task[], total: number }>('getTasks', { tasks: [], total: 0 }))
      );
  }

  // Obtener tarea por ID
  getTaskById(id: number): Observable<Task> {
    return this.http.get<any>(`${this.API_URL}/tasks/${id}`)
      .pipe(
        map((response: any) => {
          const task = response?.data ?? response?.task ?? response;
          return this.mapTaskToFrontend(task);
        })
      );
  }

  // Crear nueva tarea
  createTask(task: CreateTaskRequest): Observable<Task> {
    // Mapear los campos del frontend al backend
    const backendTask = {
      title: task.title,
      description: task.description,
      category: task.category,
      // CreateTaskRequest ya usa prioridad en español; usar tal cual
      priority: task.priority,
      assignedUserId: task.assignedUserId,
      assignedUserIds: task.assignedUserIds,
      createdById: task.createdById,
      dueDate: task.dueDate,
      startDate: task.startDate,
      isRecurring: task.isRecurring,
      recurrenceInterval: task.recurrenceInterval,
      estimatedTime: task.estimatedTime,
      reward: task.reward,
      fileUrl: task.fileUrl
    };

    return this.http.post<any>(`${this.API_URL}/tasks`, backendTask)
      .pipe(
        map((response: any) => {
          const raw = response?.data ?? response;
          return this.mapTaskToFrontend(raw);
        }),
        catchError(this.handleError<Task>('crear tarea'))
      );
  }

  // Actualizar tarea
  updateTask(id: number, updates: UpdateTaskRequest): Observable<Task> {
    // Mapear el estado al formato del backend si está presente
    const backendUpdates: any = { ...updates };
    if (updates.status) {
      backendUpdates.status = this.mapStatusToBackend(updates.status) as any;
    }
    if (updates.priority) {
      backendUpdates.priority = this.mapPriorityToBackend(updates.priority) as any;
    }

    return this.http.put<any>(`${this.API_URL}/tasks/${id}`, backendUpdates)
      .pipe(
        map((response: any) => {
          const raw = response?.data ?? response;
          return this.mapTaskToFrontend(raw);
        }),
        catchError(this.handleError<Task>('actualizar tarea'))
      );
  }

  // Eliminar tarea
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tasks/${id}`);
  }

  // Iniciar tarea
  startTask(id: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${id}/start`, {})
      .pipe(
        map(task => ({
          ...task,
          status: this.mapStatusFromBackend(task.status)
        }))
      );
  }

  // Completar tarea
  completeTask(id: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${id}/complete`, {})
      .pipe(
        map(task => ({
          ...task,
          status: this.mapStatusFromBackend(task.status)
        }))
      );
  }

  // Obtener mis tareas (del usuario actual)
  getMyTasks(): Observable<Task[]> {
    const user = this.authService.getCurrentUser();
    const userId = user?.id;
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', String(userId));
    }
    return this.http.get<any>(`${this.API_URL}/tasks`, { params }).pipe(
      map((res: any) => {
        const list: any[] = res?.data ?? res ?? [];
        return Array.isArray(list) ? list.map(t => this.mapTaskToFrontend(t)) : [];
      }),
      catchError(this.handleError<Task[]>('obtener mis tareas', []))
    );
  }

  // ===== Archivos de tarea =====
  /** Listar archivos asociados a una tarea */
  getTaskFiles(taskId: number): Observable<TaskFile[]> {
    return this.http.get<any>(`${this.API_URL}/tasks/${taskId}/files`).pipe(
      map((res: any) => {
        const list: any[] = res?.data ?? res ?? [];
        return Array.isArray(list)
          ? list.map(f => ({
              id: f.id,
              taskId: f.task_id,
              fileName: f.file_name,
              filePath: f.file_path,
              fileUrl: f.file_url,
              fileSize: f.file_size,
              fileType: f.file_type,
              mimeType: f.mime_type,
              uploadedBy: f.uploaded_by,
              storageType: f.storage_type,
              googleDriveId: f.google_drive_id,
              folderId: f.folder_id,
              folderName: f.folder_name,
              isImage: f.is_image,
              thumbnailPath: f.thumbnail_path,
              createdAt: f.created_at
            } as TaskFile))
          : [];
      }),
      catchError(this.handleError<TaskFile[]>('listar archivos de tarea', []))
    );
  }

  /** Registrar archivos subidos para una tarea en la BD */
  registerTaskFiles(taskId: number, uploadedFiles: any[]): Observable<TaskFile[]> {
    const currentUser = this.authService.getCurrentUser();
    const payload = {
      files: uploadedFiles,
      uploadedBy: currentUser?.id || 1
    };
    return this.http.post<any>(`${this.API_URL}/tasks/${taskId}/files`, payload).pipe(
      map((res: any) => {
        const list: any[] = res?.data ?? res ?? [];
        return Array.isArray(list)
          ? list.map(f => ({
              id: f.id,
              taskId: f.task_id,
              fileName: f.file_name,
              filePath: f.file_path,
              fileUrl: f.file_url,
              fileSize: f.file_size,
              fileType: f.file_type,
              mimeType: f.mime_type,
              uploadedBy: f.uploaded_by,
              storageType: f.storage_type,
              googleDriveId: f.google_drive_id,
              folderId: f.folder_id,
              folderName: f.folder_name,
              isImage: f.is_image,
              thumbnailPath: f.thumbnail_path,
              createdAt: f.created_at
            } as TaskFile))
          : [];
      }),
      catchError(this.handleError<TaskFile[]>('registrar archivos de tarea', []))
    );
  }

  /** Eliminar registro de archivo asociado a una tarea */
  deleteTaskFile(fileRecordId: number): Observable<void> {
    return this.http.delete<any>(`${this.API_URL}/tasks/files/${fileRecordId}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('eliminar archivo de tarea'))
    );
  }

  /** Reemplazar/actualizar un archivo existente en BD (actualiza rutas y metadatos) */
  replaceTaskFile(fileRecordId: number, uploadedFile: any): Observable<TaskFile> {
    // Mapear desde respuesta del servicio de subida a snake_case esperado por backend
    const payload: any = {
      file_name: uploadedFile.filename ?? uploadedFile.fileName,
      file_url: uploadedFile.fileUrl,
      file_size: uploadedFile.size,
      mime_type: uploadedFile.mimetype,
      storage_type: uploadedFile.storage ?? 'google_drive',
      google_drive_id: uploadedFile.fileId,
      is_image: typeof uploadedFile.mimetype === 'string' ? uploadedFile.mimetype.startsWith('image/') : undefined,
      folder_id: uploadedFile.folderId,
      folder_name: uploadedFile.folderName
    };
    return this.http.put<any>(`${this.API_URL}/tasks/files/${fileRecordId}`, payload).pipe(
      map((f: any) => {
        const r = f?.data ?? f;
        return {
          id: r.id,
          taskId: r.task_id,
          fileName: r.file_name,
          filePath: r.file_path,
          fileUrl: r.file_url,
          fileSize: r.file_size,
          fileType: r.file_type,
          mimeType: r.mime_type,
          uploadedBy: r.uploaded_by,
          storageType: r.storage_type,
          googleDriveId: r.google_drive_id,
          folderId: r.folder_id,
          folderName: r.folder_name,
          isImage: r.is_image,
          thumbnailPath: r.thumbnail_path,
          createdAt: r.created_at
        } as TaskFile;
      }),
      catchError(this.handleError<TaskFile>('reemplazar archivo de tarea'))
    );
  }

  // Obtener estadísticas de tareas
  getTaskStats(): Observable<TaskStats> {
    return this.http.get<any>(`${this.API_URL}/tasks/stats`).pipe(
      map((res: any) => res?.data ?? res),
      catchError(this.handleError<TaskStats>('obtener estadísticas'))
    );
  }

  // Obtener tareas por usuario (solo para jefe de hogar)
  getTasksByUser(userId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API_URL}/tasks/user/${userId}`);
  }

  // Reasignar tarea
  reassignTask(taskId: number, newAssigneeId: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${taskId}/reassign`, {
      assignedTo: newAssigneeId
    });
  }

  // Agregar comentario a una tarea
  addComment(taskId: number, comment: string): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    const commentData = {
      comment: comment,
      createdBy: currentUser?.id || 1,
      createdByName: currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Usuario'
    };
    
    return this.http.post<any>(`${this.API_URL}/tasks/${taskId}/comments`, commentData)
      .pipe(
        catchError((error) => {
          console.error('Error agregando comentario:', error);
          throw error;
        })
      );
  }

  // Obtener comentarios de una tarea
  getTaskComments(taskId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/tasks/${taskId}/comments`)
      .pipe(
        map(response => response.data || []),
        catchError((error) => {
          console.error('Error obteniendo comentarios:', error);
          return of([]);
        })
      );
  }

  // Agregar archivo a una tarea
  addTaskFile(taskId: number, fileInfo: any): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    const fileData = {
      files: [fileInfo],
      uploadedBy: currentUser?.id || 1
    };
    
    return this.http.post<any>(`${this.API_URL}/tasks/${taskId}/files`, fileData)
      .pipe(
        catchError((error) => {
          console.error('Error agregando archivo:', error);
          throw error;
        })
      );
  }

  // Obtener archivos de una tarea
  // (Versión tipada más arriba)
}