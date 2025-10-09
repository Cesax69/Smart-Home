import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStats, TaskFile } from '../models/task.model';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly API_URL = environment.services.tasks;

  constructor(private http: HttpClient) {}
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  // Estado reactivo con Signals (Angular)
  /** Lista de tareas cargadas recientemente */
  public tasks = signal<Task[]>([]);
  /** Total de tareas para la última consulta */
  public total = signal<number>(0);
  /** Estado de carga general de operaciones de tareas */
  public isLoading = signal<boolean>(false);
  /** Última tarea creada exitosamente */
  public lastCreatedTask = signal<Task | null>(null);

  // Manejo centralizado de errores
  private handleError<T>(operation = 'operación', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} falló:`, error);
      
      let message = 'Error de conexión';
      if (error.status === 0) {
        message = 'No se puede conectar al servidor';
      } else if (error.status >= 400 && error.status < 500) {
        message = error.error?.message || 'Error en la solicitud';
      } else if (error.status >= 500) {
        message = 'Error interno del servidor';
      }
      
      this.snackBar.open(message, 'Cerrar', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top'
      });
      
      return of(result as T);
    };
  }

  // Mapear estado del backend (es) a frontend (en)
  private mapStatusToFrontend(status: string | undefined): 'pending' | 'in_progress' | 'completed' {
    switch ((status || '').toLowerCase()) {
      case 'pendiente':
      case 'pending':
        return 'pending';
      case 'en_proceso':
      case 'in_progress':
        return 'in_progress';
      case 'completada':
      case 'completed':
        return 'completed';
      default:
        return 'pending';
    }
  }

  // Mapear estado del frontend (en) a backend (es)
  private mapStatusToBackend(status: string | undefined): 'pendiente' | 'en_proceso' | 'completada' {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return 'pendiente';
      case 'in_progress':
        return 'en_proceso';
      case 'completed':
        return 'completada';
      default:
        return 'pendiente';
    }
  }

  // Mapear prioridad (backend usa español, FE usa inglés)
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

  // Mapear prioridad del frontend (en) a backend (es)
  private mapPriorityToBackend(priority: string | undefined): 'baja' | 'media' | 'alta' | 'urgente' {
    switch ((priority || '').toLowerCase()) {
      case 'low':
      case 'baja':
        return 'baja';
      case 'medium':
      case 'media':
        return 'media';
      case 'high':
      case 'alta':
        return 'alta';
      case 'urgente':
        return 'urgente';
      default:
        return 'media';
    }
  }

  private mapTaskToFrontend(task: any): Task {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: this.mapStatusToFrontend(task.status),
      priority: this.mapPriorityToFrontend(task.priority),
      assignedTo: task.assignedUserId ?? task.assigned_to ?? task.assignedUserId,
      assignedUserIds: task.assignedUserIds ?? task.assigned_user_ids ?? ((task.assignedUserId ?? task.assigned_to) ? [task.assignedUserId ?? task.assigned_to] : undefined),
      assignedBy: task.createdById ?? task.assignedBy ?? task.user_id,
      startDate: task.startDate ?? task.start_date ?? undefined,
      dueDate: task.dueDate ?? task.due_date ?? undefined,
      estimatedTime: task.estimatedTime ?? task.estimated_time ?? undefined,
      isRecurring: task.isRecurring ?? task.is_recurring ?? undefined,
      // Mapear correctamente desde backend: puede venir como recurrence_type
      recurrenceInterval: task.recurrenceInterval ?? task.recurrence_type ?? task.recurrence_interval ?? undefined,
      createdAt: task.createdAt ?? task.created_at,
      updatedAt: task.updatedAt ?? task.updated_at,
      completedAt: task.completedAt ?? task.completed_at ?? undefined,
      fileUrl: task.fileUrl ?? task.file_url ?? undefined
    } as Task;
  }

  // Obtener todas las tareas
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
          // Mapear assignedTo -> userId si corresponde
          const paramKey = key === 'assignedTo' ? 'userId' : key;
          // Mapear estado al backend si se filtra por estado
          const paramValue = paramKey === 'status' ? this.mapStatusToBackend(String(value)) : String(value);
          params = params.set(paramKey, paramValue);
        }
      });
    }

    this.isLoading.set(true);
    return this.http.get<any>(`${this.API_URL}/tasks`, { params }).pipe(
      map((res: any) => {
        const list: any[] = res?.data ?? res?.tasks ?? [];
        const mapped = Array.isArray(list) ? list.map(t => this.mapTaskToFrontend(t)) : [];
        const total = typeof res?.total === 'number' ? res.total : mapped.length;
        // Actualizar señales
        this.tasks.set(mapped);
        this.total.set(total);
        this.isLoading.set(false);
        return { tasks: mapped, total };
      }),
      catchError(err => {
        this.isLoading.set(false);
        return this.handleError<{ tasks: Task[], total: number }>('obtener tareas', { tasks: [], total: 0 })(err);
      })
    );
  }

  // Obtener tarea por ID
  getTaskById(id: number): Observable<Task> {
    return this.http.get<any>(`${this.API_URL}/tasks/${id}`).pipe(
      map((res: any) => this.mapTaskToFrontend(res?.data ?? res)),
      catchError(this.handleError<Task>('obtener tarea'))
    );
  }

  // Crear nueva tarea
  createTask(task: CreateTaskRequest): Observable<Task> {
    this.isLoading.set(true);
    return this.http.post<any>(`${this.API_URL}/tasks`, task).pipe(
      map((res: any) => {
        const created = this.mapTaskToFrontend(res?.data ?? res);
        this.lastCreatedTask.set(created);
        // Opcional: añadir a la lista actual
        const current = this.tasks();
        if (Array.isArray(current)) {
          this.tasks.set([created, ...current]);
          this.total.set((this.total() || 0) + 1);
        }
        this.isLoading.set(false);
        return created;
      }),
      catchError(err => {
        this.isLoading.set(false);
        return this.handleError<Task>('crear tarea')(err);
      })
    );
  }

  // Actualizar tarea
  updateTask(id: number, updates: UpdateTaskRequest): Observable<Task> {
    const payload = { ...updates } as any;
    // Normalizar asignaciones: assignedTo -> assignedUserId/Ids
    if (Array.isArray(payload.assignedTo) && payload.assignedTo.length > 0) {
      payload.assignedUserIds = payload.assignedTo;
      delete payload.assignedTo;
    } else if (typeof payload.assignedTo === 'number') {
      payload.assignedUserId = payload.assignedTo;
      delete payload.assignedTo;
    }
    if (payload.status) {
      payload.status = this.mapStatusToBackend(payload.status);
    }
    if (payload.priority) {
      payload.priority = this.mapPriorityToBackend(payload.priority);
    }
    return this.http.put<any>(`${this.API_URL}/tasks/${id}`, payload).pipe(
      map((res: any) => this.mapTaskToFrontend(res?.data ?? res)),
      catchError(this.handleError<Task>('actualizar tarea'))
    );
  }

  // Eliminar tarea
  deleteTask(id: number): Observable<void> {
    return this.http.delete<any>(`${this.API_URL}/tasks/${id}`).pipe(
      map(() => void 0),
      catchError(this.handleError<void>('eliminar tarea'))
    );
  }

  // Marcar tarea como completada
  completeTask(id: number): Observable<Task> {
    return this.http.patch<any>(`${this.API_URL}/tasks/${id}/complete`, {}).pipe(
      map((res: any) => this.mapTaskToFrontend(res?.data ?? res)),
      catchError(this.handleError<Task>('completar tarea'))
    );
  }

  // Obtener tareas asignadas al usuario actual
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
    return this.http.post<any>(`${this.API_URL}/tasks/${taskId}/files`, { files: uploadedFiles }).pipe(
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

  // Reasignar tarea (solo para jefe de hogar)
  reassignTask(taskId: number, newAssigneeId: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${taskId}/reassign`, {
      assignedTo: newAssigneeId
    });
  }
}