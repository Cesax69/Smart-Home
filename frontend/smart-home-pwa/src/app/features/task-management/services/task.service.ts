import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStats, TaskFile } from '../models/task.model';
import type { TaskComment } from '../models/task.model';
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
      'completed': 'completada',
      'archived': 'archivada'
    };
    return statusMap[status] || status;
  }

  // Método para mapear estado del backend al frontend (español -> inglés)
  private mapStatusFromBackend(status: string): 'pending' | 'in_progress' | 'completed' {
    const statusMap: { [key: string]: 'pending' | 'in_progress' | 'completed' | 'archived' } = {
      'pendiente': 'pending',
      'en_proceso': 'in_progress',
      'completada': 'completed',
      'archivada': 'archived'
    };
    return (statusMap as any)[status] || 'pending';
  }

  // Método para manejar errores
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return of(result as T);
    };
  }

  

  // Obtener todas las tareas con filtros opcionales
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

    return this.http.get<{ success: boolean, data: Task[], message: string, total?: number }>(`${this.API_URL}/tasks`, { params })
      .pipe(
        map(response => {
          // El backend devuelve { success: true, data: [...] }
          const tasks = response.data || [];
          return {
            tasks: tasks.map(task => ({
              ...task,
              status: this.mapStatusFromBackend(task.status),
              assignedTo: (task as any).assignedUserId || task.assignedTo // Mapear assignedUserId a assignedTo
            })),
            total: response.total || tasks.length
          };
        }),
        catchError((error) => {
          console.error('Error loading tasks from backend:', error);
          return of({ tasks: [], total: 0 });
        })
      );
  }

  // Obtener tarea por ID
  getTaskById(id: number): Observable<Task> {
    return this.http.get<{ success: boolean, data: Task, message: string }>(`${this.API_URL}/tasks/${id}`)
      .pipe(
        map(response => {
          const task = response.data;
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: (task as any).assignedUserId || task.assignedTo // Mapear assignedUserId a assignedTo
          };
        }),
        catchError((error) => {
          console.error('Error getting task by id:', error);
          throw error;
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

    return this.http.post<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks`, backendTask)
      .pipe(
        map(response => {
          const task = response.data || (response as any);
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: task.assignedUserId || task.assignedTo
          } as Task;
        }),
        catchError((error) => {
          console.error('Error creating task:', error);
          throw error;
        })
      );
  }

  // Prioridad: ahora se maneja directamente en español ('baja' | 'media' | 'alta' | 'urgente')

  // Actualizar tarea
  updateTask(id: number, updates: UpdateTaskRequest): Observable<Task> {
    // Mapear el estado al formato del backend si está presente
    const backendUpdates = { ...updates };
    if (updates.status) {
      backendUpdates.status = this.mapStatusToBackend(updates.status) as any;
    }

    // Agregar el userId del usuario actual para las notificaciones
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      (backendUpdates as any).userId = currentUser.id;
    }

    return this.http.put<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks/${id}`, backendUpdates)
      .pipe(
        map(response => {
          const task = response.data;
          // Mapear la respuesta del backend
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: task.assignedUserId || task.assignedTo
          };
        }),
        catchError((error) => {
          console.error('Error updating task:', error);
          throw error;
        })
      );
  }

  // Eliminar tarea
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tasks/${id}`)
      .pipe(
        catchError((error) => {
          console.error('Error deleting task:', error);
          throw error;
        })
      );
  }

  // Eliminar tarea con confirmación (envía 'x-confirm-code' requerido por backend)
  deleteTaskWithConfirmation(id: number, confirmationCode: string): Observable<void> {
    const headers = new HttpHeaders({ 'x-confirm-code': confirmationCode });
    // Enviar tanto por header como por body para mayor compatibilidad con proxies/gateway
    return this.http.delete<void>(`${this.API_URL}/tasks/${id}`, { headers, body: { confirmationCode } })
      .pipe(
        catchError((error) => {
          console.error('Error deleting task with confirmation:', error);
          throw error;
        })
      );
  }

  // Iniciar tarea
  startTask(id: number): Observable<Task> {
    return this.http.patch<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks/${id}/start`, {})
      .pipe(
        map(response => {
          const task = response.data;
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: task.assignedUserId || task.assignedTo
          };
        }),
        catchError((error) => {
          console.error('Error starting task:', error);
          throw error;
        })
      );
  }

  // Completar tarea
  completeTask(id: number): Observable<Task> {
    return this.http.patch<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks/${id}/complete`, {})
      .pipe(
        map(response => {
          const task = response.data || (response as any);
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: task.assignedUserId || task.assignedTo
          } as Task;
        }),
        catchError((error) => {
          console.error('Error completing task:', error);
          throw error;
        })
      );
  }

  // Archivar tarea
  archiveTask(id: number): Observable<Task> {
    return this.http.patch<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks/${id}/archive`, {})
      .pipe(
        map(response => {
          const task = response.data || response;
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: task.assignedUserId || task.assignedTo
          } as Task;
        }),
        catchError((error) => {
          console.error('Error archiving task:', error);
          throw error;
        })
      );
  }

  // Restaurar tarea archivada
  unarchiveTask(id: number): Observable<Task> {
    return this.http.patch<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks/${id}/unarchive`, {})
      .pipe(
        map(response => {
          const task = response.data || response;
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: task.assignedUserId || task.assignedTo
          } as Task;
        }),
        catchError((error) => {
          console.error('Error unarchiving task:', error);
          throw error;
        })
      );
  }

  // Nuevo método que envía el userId al completar la tarea
  completeTaskWithUserId(id: number, userId: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${id}/complete`, { userId: userId })
      .pipe(
        map(response => {
          // Si la respuesta tiene una estructura { success: true, data: task }
          const task = (response as any).data || response;
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status)
          };
        }),
        catchError((error) => {
          console.error('Error completing task:', error);
          throw error;
        })
      );
  }

  // Obtener mis tareas (del usuario actual)
  getMyTasks(): Observable<Task[]> {
    // Obtener el usuario actual del servicio de autenticación
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser || !currentUser.id) {
      // Si no hay usuario autenticado, devolver array vacío
      console.warn('No hay usuario autenticado para obtener tareas');
      return of([]);
    }
    
    const currentUserId = currentUser.id;
    
    return this.http.get<{ success: boolean, data: Task[], message: string }>(`${this.API_URL}/tasks?userId=${currentUserId}`)
      .pipe(
        map(response => {
          // El backend devuelve { success: true, data: [...] }
          const tasks = response.data || [];
          return tasks.map(task => ({
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: (task as any).assignedUserId || task.assignedTo // Mapear assignedUserId a assignedTo
          }));
        }),
        catchError((error) => {
          console.error('Error loading current user tasks:', error);
          return of([]);
        })
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
    return this.http.get<{ success: boolean, data: Task[], message: string }>(`${this.API_URL}/tasks/member/${userId}`)
      .pipe(
        map(response => {
          const tasks = response.data || [];
          return tasks.map(task => ({
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: (task as any).assignedUserId || task.assignedTo
          }));
        }),
        catchError((error) => {
          console.error('Error loading tasks by user:', error);
          return of([]);
        })
      );
  }

  // Reasignar tarea
  reassignTask(taskId: number, newAssigneeId: number): Observable<Task> {
    // Backend no expone /reassign; usar update
    const payload = { assignedUserId: newAssigneeId } as any;
    return this.http.put<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks/${taskId}`, payload)
      .pipe(
        map(response => {
          const task = response.data || (response as any);
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            assignedTo: task.assignedUserId || task.assignedTo
          } as Task;
        }),
        catchError((error) => {
          console.error('Error reassigning task:', error);
          throw error;
        })
      );
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
  getTaskComments(taskId: number): Observable<TaskComment[]> {
    return this.http.get<any>(`${this.API_URL}/tasks/${taskId}/comments`)
      .pipe(
        map(response => (response?.data ?? []) as TaskComment[]),
        catchError((error) => {
          console.error('Error obteniendo comentarios:', error);
          return of([] as TaskComment[]);
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
  getTaskFiles(taskId: number): Observable<TaskFile[]> {
    return this.http.get<any>(`${this.API_URL}/tasks/${taskId}/files`)
      .pipe(
        map(response => (response?.data ?? []) as TaskFile[]),
        catchError((error) => {
          console.error('Error obteniendo archivos:', error);
          return of([] as TaskFile[]);
        })
      );
  }

  // Registrar múltiples archivos subidos para una tarea
  registerTaskFiles(taskId: number, files: any[]): Observable<any[]> {
    const currentUser = this.authService.getCurrentUser();
    const payload = {
      files: files,
      uploadedBy: currentUser?.id || 1
    };
    return this.http.post<any>(`${this.API_URL}/tasks/${taskId}/files`, payload)
      .pipe(
        map(response => response.data || response || []),
        catchError((error) => {
          console.error('Error registrando archivos:', error);
          throw error;
        })
      );
  }

  // Eliminar registro de archivo de una tarea
  deleteTaskFile(fileRecordId: number): Observable<void> {
    return this.http.delete<any>(`${this.API_URL}/tasks/files/${fileRecordId}`)
      .pipe(
        map(() => void 0),
        catchError((error) => {
          console.error('Error eliminando archivo:', error);
          throw error;
        })
      );
  }

  // Reemplazar/actualizar metadatos de un archivo de tarea
  replaceTaskFile(fileRecordId: number, uploaded: any): Observable<any> {
    // Mapear payload aceptado por backend (snake_case o equivalentes camel)
    const payload = {
      filename: uploaded?.filename ?? uploaded?.originalName ?? uploaded?.fileName,
      file_name: uploaded?.filename ?? uploaded?.originalName ?? uploaded?.fileName,
      filePath: uploaded?.filePath ?? uploaded?.downloadLink ?? uploaded?.fileUrl ?? null,
      file_path: uploaded?.filePath ?? uploaded?.downloadLink ?? uploaded?.fileUrl ?? null,
      fileUrl: uploaded?.fileUrl ?? uploaded?.downloadLink ?? null,
      file_url: uploaded?.fileUrl ?? uploaded?.downloadLink ?? null,
      size: uploaded?.size ?? null,
      file_size: uploaded?.size ?? null,
      file_type: uploaded?.fileType ?? null,
      mimetype: uploaded?.mimetype ?? null,
      mime_type: uploaded?.mimetype ?? null,
      uploaded_by: uploaded?.uploadedBy ?? undefined,
      storage: uploaded?.storage ?? 'google_drive',
      storage_type: uploaded?.storage ?? 'google_drive',
      fileId: uploaded?.fileId ?? null,
      google_drive_id: uploaded?.fileId ?? null,
      is_image: typeof uploaded?.mimetype === 'string' ? uploaded.mimetype.startsWith('image/') : undefined,
      thumbnail_path: uploaded?.thumbnail_path ?? null,
      folderId: uploaded?.folderId ?? null,
      folder_id: uploaded?.folderId ?? null,
      folderName: uploaded?.folderName ?? null,
      folder_name: uploaded?.folderName ?? null
    };

    return this.http.put<any>(`${this.API_URL}/tasks/files/${fileRecordId}`, payload)
      .pipe(
        map(response => response.data || response),
        catchError((error) => {
          console.error('Error reemplazando archivo:', error);
          throw error;
        })
      );
  }
}