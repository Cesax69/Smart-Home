import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
  private readonly USE_MOCK = environment.useMockData;
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
      // Si no estamos usando mocks, propagar el error
      if (!this.USE_MOCK) {
        return throwError(() => error);
      }
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
        category: 'cocina',
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
        category: 'limpieza',
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
        category: 'limpieza',
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
        category: 'lavanderia',
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
        category: 'mantenimiento',
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
        category: 'jardin',
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
        category: 'limpieza',
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
        category: 'cocina',
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
        category: 'mantenimiento',
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
        category: 'cocina',
        status: 'pending',
        priority: 'high',
        assignedTo: 2, // Miembro de la familia
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(tomorrow)
      },
      // Tareas específicas para César Garay (ID: 3)
      {
        id: 11,
        title: 'Limpiar el baño principal',
        description: 'Limpiar a fondo el baño principal, incluyendo azulejos, espejo y sanitarios.',
        category: 'limpieza',
        status: 'pending',
        priority: 'high',
        assignedTo: 3, // César Garay
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(tomorrow)
      },
      {
        id: 12,
        title: 'Ordenar su habitación',
        description: 'Organizar la ropa, hacer la cama y mantener el espacio ordenado.',
        category: 'organizacion',
        status: 'in_progress',
        priority: 'medium',
        assignedTo: 3, // César Garay
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(currentDate),
        dueDate: new Date(nextWeek)
      },
      {
        id: 13,
        title: 'Pasear al perro',
        description: 'Sacar al perro a pasear por la mañana y por la tarde.',
        category: 'mascotas',
        status: 'pending',
        priority: 'medium',
        assignedTo: 3, // César Garay
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(currentDate)
      },
      {
        id: 14,
        title: 'Estudiar para el examen',
        description: 'Dedicar 2 horas al estudio para el próximo examen de matemáticas.',
        category: 'otros',
        status: 'completed',
        priority: 'high',
        assignedTo: 3, // César Garay
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(currentDate),
        completedAt: new Date(currentDate),
        dueDate: new Date(currentDate)
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
              status: this.mapStatusFromBackend(task.status),
              priority: this.mapPriorityFromBackend((task as any).priority),
              assignedTo: (task as any).assignedUserId || task.assignedTo // Mapear assignedUserId a assignedTo
            })),
            total: response.total || tasks.length
          };
        }),
        catchError((error) => {
          if (this.USE_MOCK) {
            // Si falla la conexión y estamos en modo mock, devolver datos de prueba filtrados por usuario
            const mockTasks = this.getMockTasks();
            let filteredTasks = mockTasks;
            if (filters?.userId) {
              filteredTasks = mockTasks.filter(task => task.assignedTo === filters.userId);
            }
            return of({ tasks: filteredTasks, total: filteredTasks.length });
          }
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
          if (this.USE_MOCK) {
            // Si falla la conexión y estamos en modo mock, buscar en datos de prueba
            const mockTasks = this.getMockTasks();
            const task = mockTasks.find(t => t.id === id);
            if (task) {
              return of(task);
            }
          }
          return throwError(() => error);
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

    return this.http.post<Task>(`${this.API_URL}/tasks`, backendTask)
      .pipe(
        catchError((error) => {
          if (this.USE_MOCK) {
            // En modo de prueba, simular creación de tarea
            const newTask: Task = {
              id: Math.floor(Math.random() * 1000) + 100,
              title: task.title,
              description: task.description,
              category: 'limpieza', // Categoría por defecto
              status: 'pending',
              priority: this.mapPriorityFromBackend(task.priority),
              assignedTo: task.assignedUserId,
              assignedBy: task.createdById,
              createdAt: new Date(),
              updatedAt: new Date(),
              dueDate: task.dueDate
            };
            return of(newTask);
          }
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

  // Mapear prioridad del backend al frontend
  private mapPriorityFromBackend(priority: string): 'low' | 'medium' | 'high' {
    const p = String(priority).toLowerCase();
    const map: { [key: string]: 'low' | 'medium' | 'high' } = {
      'baja': 'low',
      'media': 'medium',
      'alta': 'high',
      'urgente': 'high',
      // passthrough for already-english values
      'low': 'low',
      'medium': 'medium',
      'high': 'high'
    };
    return map[p] || 'medium';
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
          if (this.USE_MOCK) {
            // En modo de prueba, simular actualización
            const mockTasks = this.getMockTasks();
            const taskIndex = mockTasks.findIndex(t => t.id === id);
            if (taskIndex !== -1) {
              const task = mockTasks[taskIndex];
              const updatedTask = { ...task, ...updates, updatedAt: new Date() };
              // Actualizar la tarea en el array mock (simulando persistencia)
              mockTasks[taskIndex] = updatedTask;
              console.log(`Tarea ${id} actualizada en modo mock:`, updatedTask);
              return of(updatedTask);
            }
          }
          return throwError(() => error);
        })
      );
  }

  // Eliminar tarea
  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/tasks/${id}`)
      .pipe(
        catchError((error) => {
          if (this.USE_MOCK) {
            // En modo de prueba, simular eliminación exitosa
            return of(void 0);
          }
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
          if (this.USE_MOCK) {
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
          }
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
          if (this.USE_MOCK) {
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
          }
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
            status: this.mapStatusFromBackend(task.status),
            priority: this.mapPriorityFromBackend((task as any).priority),
            assignedTo: (task as any).assignedUserId || task.assignedTo // Mapear assignedUserId a assignedTo
          }));
        }),
        catchError((error) => {
          console.error('Error loading tasks from backend:', error);
          if (this.USE_MOCK) {
            // En modo de prueba, devolver tareas de ejemplo filtradas por usuario actual
            const mockTasks = this.getMockTasks();
            return of(mockTasks.filter(task => task.assignedTo === currentUserId));
          }
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