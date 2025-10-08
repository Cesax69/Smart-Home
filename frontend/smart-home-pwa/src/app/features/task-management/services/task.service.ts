import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStats } from '../models/task.model';
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

  private mapTaskToFrontend(task: any): Task {
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: this.mapStatusToFrontend(task.status),
      priority: this.mapPriorityToFrontend(task.priority),
      assignedTo: task.assignedUserId ?? task.assigned_to ?? task.assignedUserId,
      assignedBy: task.createdById ?? task.assignedBy ?? task.user_id,
      dueDate: task.dueDate ?? task.due_date ?? undefined,
      createdAt: task.createdAt ?? task.created_at,
      updatedAt: task.updatedAt ?? task.updated_at,
      completedAt: task.completedAt ?? task.completed_at ?? undefined
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

    return this.http.get<any>(`${this.API_URL}/tasks`, { params }).pipe(
      map((res: any) => {
        const list: any[] = res?.data ?? res?.tasks ?? [];
        const mapped = Array.isArray(list) ? list.map(t => this.mapTaskToFrontend(t)) : [];
        const total = typeof res?.total === 'number' ? res.total : mapped.length;
        return { tasks: mapped, total };
      }),
      catchError(this.handleError<{ tasks: Task[], total: number }>('obtener tareas', { tasks: [], total: 0 }))
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
    return this.http.post<any>(`${this.API_URL}/tasks`, task).pipe(
      map((res: any) => this.mapTaskToFrontend(res?.data ?? res)),
      catchError(this.handleError<Task>('crear tarea'))
    );
  }

  // Actualizar tarea
  updateTask(id: number, updates: UpdateTaskRequest): Observable<Task> {
    const payload = { ...updates } as any;
    if (payload.status) {
      payload.status = this.mapStatusToBackend(payload.status);
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