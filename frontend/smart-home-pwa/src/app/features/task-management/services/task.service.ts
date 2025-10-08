import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStats } from '../models/task.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly API_URL = environment.services.tasks;

  constructor(private http: HttpClient) {}

  // Obtener todas las tareas
  getTasks(filters?: {
    status?: string;
    assignedTo?: number;
    priority?: string;
    page?: number;
    limit?: number;
  }): Observable<{ tasks: Task[], total: number }> {
    let params = new HttpParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<{ tasks: Task[], total: number }>(`${this.API_URL}/tasks`, { params });
  }

  // Obtener tarea por ID
  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.API_URL}/tasks/${id}`);
  }

  // Crear nueva tarea
  createTask(task: CreateTaskRequest): Observable<Task> {
    return this.http.post<Task>(`${this.API_URL}/tasks`, task);
  }

  // Actualizar tarea
  updateTask(id: number, updates: UpdateTaskRequest): Observable<Task> {
    return this.http.put<Task>(`${this.API_URL}/tasks/${id}`, updates);
  }

  // Eliminar tarea
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tasks/${id}`);
  }

  // Marcar tarea como completada
  completeTask(id: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${id}/complete`, {});
  }

  // Obtener tareas asignadas al usuario actual
  getMyTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API_URL}/tasks/my-tasks`);
  }

  // Obtener estadísticas de tareas
  getTaskStats(): Observable<TaskStats> {
    return this.http.get<TaskStats>(`${this.API_URL}/tasks/stats`);
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