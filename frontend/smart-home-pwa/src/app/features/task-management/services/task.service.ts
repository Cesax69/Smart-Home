import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
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

  // Datos de prueba para cuando no hay conexión a la base de datos
  private getMockTasks(): Task[] {
    const currentDate = new Date();
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(currentDate.getDate() + 1);
    
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    
    const lastWeek = new Date(currentDate);
    lastWeek.setDate(currentDate.getDate() - 7);

    return [
      // Tareas pendientes - algunas asignadas al jefe del hogar (id: 1)
      {
        id: 1,
        title: 'Limpiar la cocina',
        description: 'Lavar los platos, limpiar las superficies y organizar los utensilios de cocina.',
        status: 'pending',
        priority: 'high',
        assignedTo: 1, // Jefe del hogar
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(tomorrow)
      },
      {
        id: 2,
        title: 'Sacar la basura',
        description: 'Recoger la basura de todas las habitaciones y sacarla al contenedor.',
        status: 'pending',
        priority: 'medium',
        assignedTo: 2, // Miembro de la familia
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(tomorrow)
      },
      {
        id: 3,
        title: 'Aspirar la sala',
        description: 'Aspirar toda la sala de estar, incluyendo debajo de los muebles.',
        status: 'in_progress',
        priority: 'medium',
        assignedTo: 1, // Jefe del hogar
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(currentDate),
        dueDate: new Date(nextWeek)
      },
      {
        id: 4,
        title: 'Lavar la ropa',
        description: 'Separar, lavar, secar y doblar toda la ropa de la familia.',
        status: 'in_progress',
        priority: 'low',
        assignedTo: 2, // Miembro de la familia
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(currentDate),
        dueDate: new Date(nextWeek)
      },
      {
        id: 5,
        title: 'Organizar el garaje',
        description: 'Clasificar y organizar todas las herramientas y objetos del garaje.',
        status: 'completed',
        priority: 'low',
        assignedTo: 1, // Jefe del hogar
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(currentDate),
        completedAt: new Date(currentDate),
        dueDate: new Date(currentDate)
      },
      {
        id: 6,
        title: 'Regar las plantas',
        description: 'Regar todas las plantas del jardín y las macetas de interior.',
        status: 'completed',
        priority: 'medium',
        assignedTo: 2, // Miembro de la familia
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(currentDate),
        completedAt: new Date(currentDate),
        dueDate: new Date(currentDate)
      },
      // Tarea vencida para mostrar funcionalidad
      {
        id: 7,
        title: 'Limpiar ventanas',
        description: 'Limpiar todas las ventanas de la casa por dentro y por fuera.',
        status: 'pending',
        priority: 'high',
        assignedTo: 1, // Jefe del hogar
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(lastWeek),
        dueDate: new Date(lastWeek) // Vencida
      },
      {
        id: 8,
        title: 'Preparar cena especial',
        description: 'Planificar y preparar una cena especial para la familia el fin de semana.',
        status: 'pending',
        priority: 'medium',
        assignedTo: 2, // Miembro de la familia
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(nextWeek)
      },
      {
        id: 9,
        title: 'Revisar sistema eléctrico',
        description: 'Inspeccionar y revisar el sistema eléctrico de la casa por seguridad.',
        status: 'in_progress',
        priority: 'high',
        assignedTo: 1, // Jefe del hogar
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(nextWeek)
      },
      {
        id: 10,
        title: 'Comprar víveres',
        description: 'Hacer la compra semanal de alimentos y productos de limpieza.',
        status: 'pending',
        priority: 'high',
        assignedTo: 2, // Miembro de la familia
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(tomorrow)
      }
    ];
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

    return this.http.get<{ tasks: Task[], total: number }>(`${this.API_URL}/tasks`, { params })
      .pipe(
        map(response => ({
          tasks: response.tasks.map(task => ({
            ...task,
            status: this.mapStatusFromBackend(task.status)
          })),
          total: response.total
        })),
        catchError(() => {
          // Si falla la conexión, devolver datos de prueba
          const mockTasks = this.getMockTasks();
          return of({ tasks: mockTasks, total: mockTasks.length });
        })
      );
  }

  // Obtener tarea por ID
  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.API_URL}/tasks/${id}`)
      .pipe(
        map(task => ({
          ...task,
          status: this.mapStatusFromBackend(task.status)
        })),
        catchError(() => {
          // Si falla la conexión, buscar en datos de prueba
          const mockTasks = this.getMockTasks();
          const task = mockTasks.find(t => t.id === id);
          if (task) {
            return of(task);
          }
          throw new Error('Tarea no encontrada');
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
      priority: this.mapPriorityToBackend(task.priority),
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

    return this.http.post<Task>(`${this.API_URL}/tasks`, backendTask)
      .pipe(
        catchError(() => {
          // En modo de prueba, simular creación de tarea
          const newTask: Task = {
            id: Math.floor(Math.random() * 1000) + 100,
            title: task.title,
            description: task.description,
            status: 'pending',
            priority: this.mapPriorityFromBackend(task.priority),
            assignedTo: task.assignedUserId,
            assignedBy: task.createdById,
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate: task.dueDate
          };
          return of(newTask);
        })
      );
  }

  // Mapear prioridad del frontend al backend
  private mapPriorityToBackend(priority: 'baja' | 'media' | 'alta' | 'urgente'): 'low' | 'medium' | 'high' {
    const priorityMap: { [key: string]: 'low' | 'medium' | 'high' } = {
      'baja': 'low',
      'media': 'medium',
      'alta': 'high',
      'urgente': 'high'
    };
    return priorityMap[priority] || 'medium';
  }

  // Mapear prioridad del backend al frontend
  private mapPriorityFromBackend(priority: 'baja' | 'media' | 'alta' | 'urgente'): 'low' | 'medium' | 'high' {
    const priorityMap: { [key: string]: 'low' | 'medium' | 'high' } = {
      'baja': 'low',
      'media': 'medium',
      'alta': 'high',
      'urgente': 'high'
    };
    return priorityMap[priority] || 'medium';
  }

  // Actualizar tarea
  updateTask(id: number, updates: UpdateTaskRequest): Observable<Task> {
    // Mapear el estado al formato del backend si está presente
    const backendUpdates = { ...updates };
    if (updates.status) {
      backendUpdates.status = this.mapStatusToBackend(updates.status) as any;
    }

    return this.http.put<Task>(`${this.API_URL}/tasks/${id}`, backendUpdates)
      .pipe(
        catchError(() => {
          // En modo de prueba, simular actualización
          const mockTasks = this.getMockTasks();
          const task = mockTasks.find(t => t.id === id);
          if (task) {
            const updatedTask = { ...task, ...updates, updatedAt: new Date() };
            return of(updatedTask);
          }
          throw new Error('Tarea no encontrada');
        })
      );
  }

  // Eliminar tarea
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tasks/${id}`)
      .pipe(
        catchError(() => {
          // En modo de prueba, simular eliminación exitosa
          return of(void 0);
        })
      );
  }

  // Iniciar tarea
  startTask(id: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${id}/start`, {})
      .pipe(
        map(task => ({
          ...task,
          status: this.mapStatusFromBackend(task.status)
        })),
        catchError(() => {
          // En modo de prueba, simular iniciar tarea
          const mockTasks = this.getMockTasks();
          const task = mockTasks.find(t => t.id === id);
          if (task) {
            const startedTask = { 
              ...task, 
              status: 'in_progress' as const, 
              progress: 0,
              updatedAt: new Date() 
            };
            return of(startedTask);
          }
          throw new Error('Tarea no encontrada');
        })
      );
  }

  // Completar tarea
  completeTask(id: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${id}/complete`, {})
      .pipe(
        map(task => ({
          ...task,
          status: this.mapStatusFromBackend(task.status)
        })),
        catchError(() => {
          // En modo de prueba, simular completar tarea
          const mockTasks = this.getMockTasks();
          const task = mockTasks.find(t => t.id === id);
          if (task) {
            const completedTask = { 
              ...task, 
              status: 'completed' as const, 
              completedAt: new Date(),
              updatedAt: new Date() 
            };
            return of(completedTask);
          }
          throw new Error('Tarea no encontrada');
        })
      );
  }

  // Obtener mis tareas (del usuario actual)
  getMyTasks(): Observable<Task[]> {
    // Usar el endpoint con filtro de usuario
    const currentUserId = 1; // TODO: Obtener del servicio de autenticación
    return this.http.get<{ tasks: Task[], total: number }>(`${this.API_URL}/tasks?userId=${currentUserId}`)
      .pipe(
        map(response => response.tasks.map(task => ({
          ...task,
          status: this.mapStatusFromBackend(task.status)
        }))),
        catchError(() => {
          // En modo de prueba, devolver tareas de ejemplo
          const mockTasks = this.getMockTasks();
          return of(mockTasks.filter(task => task.assignedTo === 1)); // Simular usuario actual
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
}