import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStats } from '../models/task.model';
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

  // Método para mapear estado del backend al frontend al frontend (español -> inglés)
  private mapStatusFromBackend(status: string): 'pending' | 'in_progress' | 'completed' | 'archived' {
    const statusMap: { [key: string]: 'pending' | 'in_progress' | 'completed' | 'archived' } = {
      'pendiente': 'pending',
      'en_proceso': 'in_progress',
      'completada': 'completed',
      'archivada': 'archived'
    };
    return statusMap[status] || 'pending';
  }

  // Método para manejar errores
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error);
      return throwError(() => error);
    };
  }

  // Datos de prueba para cuando no hay conexión a la base de datos


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
          // Mapear estado y prioridad al backend si se filtra por ellos
          let paramValue = String(value);
          if (paramKey === 'status') {
            paramValue = this.mapStatusToBackend(String(value));
          } else if (paramKey === 'priority') {
            paramValue = this.mapPriorityToBackend(String(value));
          }
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
              title: (task as any).title ?? '',
              description: (task as any).description ?? '',
              status: this.mapStatusFromBackend(task.status),
              priority: this.mapPriorityFromBackend((task as any).priority),
              assignedTo: (task as any).assignedUserId || task.assignedTo
            })),
            total: response.total || tasks.length
          };
        }),
        catchError((error) => {
          return throwError(() => error);
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
            priority: this.mapPriorityFromBackend((task as any).priority),
            assignedTo: (task as any).assignedUserId || task.assignedTo // Mapear assignedUserId a assignedTo
          };
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  // Crear nueva tarea
  createTask(task: CreateTaskRequest): Observable<Task> {
    // Mapear los campos del frontend al backend
    const backendTask = {
      title: task.title,
      description: (task.description ?? '').trim().length > 0 ? (task.description as string).trim() : null,
      category: task.category,
      priority: this.mapPriorityToBackend(task.priority as any),
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

    return this.http.post<{ success: boolean; data: Task; message?: string }>(`${this.API_URL}/tasks`, backendTask)
      .pipe(
        map(response => {
          const created = response?.data ?? (response as any);
          return {
            ...created,
            status: this.mapStatusFromBackend((created as any).status),
            priority: this.mapPriorityFromBackend((created as any).priority),
            assignedTo: (created as any).assignedUserId || (created as any).assignedTo
          } as Task;
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  // Mapear prioridad del frontend al backend
  private mapPriorityToBackend(priority: string): 'baja' | 'media' | 'alta' | 'urgente' {
    const p = String(priority).toLowerCase();
    const englishToSpanish: { [key: string]: 'baja' | 'media' | 'alta' | 'urgente' } = {
      'low': 'baja',
      'medium': 'media',
      'high': 'alta',
      'urgent': 'urgente'
    };
    const spanish: Array<'baja' | 'media' | 'alta' | 'urgente'> = ['baja', 'media', 'alta', 'urgente'];
    if (spanish.includes(p as any)) return p as any;
    return englishToSpanish[p] || 'media';
  }

  // Mapear prioridad del backend al frontend (a valores en español)
  private mapPriorityFromBackend(priority: string): 'baja' | 'media' | 'alta' | 'urgente' {
    const p = String(priority).toLowerCase();
    const englishToSpanish: { [key: string]: 'baja' | 'media' | 'alta' | 'urgente' } = {
      'low': 'baja',
      'medium': 'media',
      'high': 'alta',
      'urgent': 'urgente'
    };
    const spanish: Array<'baja' | 'media' | 'alta' | 'urgente'> = ['baja', 'media', 'alta', 'urgente'];
    if (spanish.includes(p as any)) return p as any;
    return englishToSpanish[p] || 'media';
  }

  // Actualizar tarea
  updateTask(id: number, updates: UpdateTaskRequest): Observable<Task> {
    // Mapear el estado al formato del backend si está presente
    const backendUpdates = { ...updates };
    if (updates.status) {
      backendUpdates.status = this.mapStatusToBackend(updates.status) as any;
    }
    if ((updates as any).priority) {
      (backendUpdates as any).priority = this.mapPriorityToBackend((updates as any).priority);
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
            priority: this.mapPriorityFromBackend((task as any).priority),
            assignedTo: task.assignedUserId || task.assignedTo
          };
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  // Eliminar tarea
  deleteTask(id: number, confirmCode?: string): Observable<void> {
    const options: { headers?: HttpHeaders; observe: 'body' } = { observe: 'body' };
    if (confirmCode && confirmCode.trim().length > 0) {
      options.headers = new HttpHeaders({ 'x-confirm-code': confirmCode.trim() });
    }
    return this.http.delete<{ success: boolean; message: string }>(`${this.API_URL}/tasks/${id}`, options)
      .pipe(
        map(() => undefined),
        catchError((error) => {
          return throwError(() => error);
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
            priority: this.mapPriorityFromBackend((task as any).priority),
            assignedTo: task.assignedUserId || task.assignedTo
          };
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  // Completar tarea
  completeTask(id: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${id}/complete`, {})
      .pipe(
        map(task => ({
          ...task as any,
          status: this.mapStatusFromBackend((task as any).status),
          priority: this.mapPriorityFromBackend((task as any).priority),
          assignedTo: (task as any).assignedUserId || (task as any).assignedTo
        })),
        catchError((error) => {
          return throwError(() => error);
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
            status: this.mapStatusFromBackend(task.status),
            priority: this.mapPriorityFromBackend((task as any).priority),
            assignedTo: (task as any).assignedUserId || (task as any).assignedTo
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
            title: (task as any).title ?? '',
            description: (task as any).description ?? '',
            status: this.mapStatusFromBackend(task.status),
            priority: this.mapPriorityFromBackend((task as any).priority),
            assignedTo: (task as any).assignedUserId || task.assignedTo
          }));
        }),
        catchError((error) => {
          console.error('Error loading tasks from backend:', error);
          return throwError(() => error);
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

  // Obtener métricas agregadas de tareas para gráficas
  getTaskMetrics(query: import('../../../core/builders/task-metrics-query.builder').TaskMetricsQuery): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/tasks/metrics`, query).pipe(
      map((res: any) => res?.data ?? res),
      catchError(this.handleError<any>('obtener métricas de tareas'))
    );
  }

  // Obtener tareas por usuario (solo para jefe de hogar)
  getTasksByUser(userId: number): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API_URL}/tasks/user/${userId}`)
      .pipe(
        map(tasks => (tasks || []).map(task => ({
          ...task as any,
          status: this.mapStatusFromBackend((task as any).status),
          priority: this.mapPriorityFromBackend((task as any).priority),
          assignedTo: (task as any).assignedUserId || (task as any).assignedTo
        })))
      );
  }

  // Reasignar tarea
  reassignTask(taskId: number, newAssigneeId: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${taskId}/reassign`, {
      assignedTo: newAssigneeId
    }).pipe(
      map(response => {
        const task = (response as any).data || response;
        return {
          ...task,
          status: this.mapStatusFromBackend((task as any).status),
          priority: this.mapPriorityFromBackend((task as any).priority),
          assignedTo: (task as any).assignedUserId || (task as any).assignedTo
        };
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
  getTaskComments(taskId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/tasks/${taskId}/comments`)
      .pipe(
        map(response => {
          const list = response.data || [];
          // Normalizar a camelCase para el frontend
          return list.map((c: any) => ({
            ...c,
            createdByName: c?.created_by_name ?? c?.createdByName,
            createdAt: c?.created_at ?? c?.createdAt,
          }));
        }),
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
  getTaskFiles(taskId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API_URL}/tasks/${taskId}/files`)
      .pipe(
        map(response => response.data || []),
        catchError((error) => {
          console.error('Error obteniendo archivos:', error);
          return of([]);
        })
      );
  }

  // Registrar múltiples archivos para una tarea
  registerTaskFiles(taskId: number, uploaded: any[]): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    const payload = {
      files: uploaded,
      uploadedBy: currentUser?.id || 1
    };
    return this.http.post<any>(`${this.API_URL}/tasks/${taskId}/files`, payload)
      .pipe(
        map(response => (response as any)?.data ?? response),
        catchError((error) => {
          console.error('Error registrando archivos:', error);
          throw error;
        })
      );
  }

  // Eliminar archivo de una tarea por ID de registro
  deleteTaskFile(fileRecordId: number): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/tasks/files/${fileRecordId}`)
      .pipe(
        map(response => (response as any)?.data ?? response),
        catchError((error) => {
          console.error('Error eliminando archivo:', error);
          throw error;
        })
      );
  }

  // Reemplazar archivo existente con datos de nuevo archivo subido
  replaceTaskFile(fileRecordId: number, fileData: any): Observable<any> {
    // Normalizar campos esperados por el backend (acepta camelCase/snake_case)
    const directUrl =
      fileData?.fileUrl ||
      fileData?.file_path ||
      fileData?.filePath ||
      fileData?.downloadLink ||
      fileData?.webViewLink ||
      (fileData?.fileId ? `https://drive.google.com/uc?id=${fileData.fileId}` : undefined);

    const payload: any = {
      filename: fileData?.filename || fileData?.originalName,
      originalName: fileData?.originalName,
      fileUrl: directUrl,
      filePath: directUrl,
      size: fileData?.size || fileData?.fileSize,
      fileSize: fileData?.size || fileData?.fileSize,
      mimetype: fileData?.mimetype || fileData?.mime_type || fileData?.mimeType,
      mimeType: fileData?.mimetype || fileData?.mime_type || fileData?.mimeType,
      storage: fileData?.storage || fileData?.storageType,
      storageType: fileData?.storage || fileData?.storageType,
      fileId: fileData?.fileId || fileData?.googleDriveId,
      googleDriveId: fileData?.fileId || fileData?.googleDriveId,
      isImage: typeof fileData?.isImage === 'boolean' ? fileData.isImage : undefined,
      folderId: fileData?.folderId || fileData?.folder_id,
      folder_id: fileData?.folderId || fileData?.folder_id,
      folderName: fileData?.folderName
    };

    return this.http.put<any>(`${this.API_URL}/tasks/files/${fileRecordId}`, payload)
      .pipe(
        map(response => (response as any)?.data ?? response),
        catchError((error) => {
          console.error('Error reemplazando archivo:', error);
          throw error;
        })
      );
  }

  // Actualizar campos de un archivo de tarea existente
  updateTaskFile(fileRecordId: number, updates: any): Observable<any> {
    const payload: any = {
      ...updates,
      folderId: updates?.folderId ?? updates?.folder_id,
      folder_id: updates?.folder_id ?? updates?.folderId,
      folderName: updates?.folderName ?? updates?.folder_name
    };
    return this.http.put<any>(`${this.API_URL}/tasks/files/${fileRecordId}`, payload)
      .pipe(
        map(response => (response as any)?.data ?? response),
        catchError((error) => {
          console.error('Error actualizando archivo de tarea:', error);
          throw error;
        })
      );
  }


  // Archivar tarea
  archiveTask(id: number): Observable<Task> {
    return this.http.patch<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks/${id}/archive`, {})
      .pipe(
        map(response => {
          const task = response.data;
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            priority: this.mapPriorityFromBackend((task as any).priority),
            assignedTo: task.assignedUserId || task.assignedTo
          };
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }

  // Desarchivar tarea
  unarchiveTask(id: number): Observable<Task> {
    return this.http.patch<{success: boolean, data: any, message: string}>(`${this.API_URL}/tasks/${id}/unarchive`, {})
      .pipe(
        map(response => {
          const task = response.data;
          return {
            ...task,
            status: this.mapStatusFromBackend(task.status),
            priority: this.mapPriorityFromBackend((task as any).priority),
            assignedTo: task.assignedUserId || task.assignedTo
          };
        }),
        catchError((error) => {
          return throwError(() => error);
        })
      );
  }
}
