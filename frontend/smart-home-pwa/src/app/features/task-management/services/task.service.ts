import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskStats } from '../models/task.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly API_URL = environment.services.tasks;

  constructor(private http: HttpClient) {}

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
        title: 'Regar las plantas del jardín',
        description: 'Regar todas las plantas del jardín y revisar que estén en buen estado.',
        status: 'pending',
        priority: 'low',
        assignedTo: 1, // Jefe del hogar
        assignedBy: 1,
        createdAt: new Date(currentDate),
        updatedAt: new Date(currentDate),
        dueDate: new Date(nextWeek)
      },
      // Tareas en progreso - algunas asignadas al jefe del hogar
      {
        id: 4,
        title: 'Organizar el armario del dormitorio',
        description: 'Doblar la ropa, organizarla por categorías y donar la que ya no se use.',
        status: 'in_progress',
        priority: 'medium',
        assignedTo: 1, // Jefe del hogar
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(currentDate),
        dueDate: new Date(nextWeek)
      },
      {
        id: 5,
        title: 'Preparar la cena familiar',
        description: 'Planificar y preparar una cena especial para toda la familia este fin de semana.',
        status: 'in_progress',
        priority: 'high',
        assignedTo: 2, // Miembro de la familia
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(currentDate),
        dueDate: new Date(nextWeek)
      },
      // Tareas completadas
      {
        id: 6,
        title: 'Aspirar la sala de estar',
        description: 'Aspirar toda la alfombra y limpiar debajo de los muebles.',
        status: 'completed',
        priority: 'medium',
        assignedTo: 1, // Jefe del hogar
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(lastWeek),
        completedAt: new Date(lastWeek)
      },
      {
        id: 7,
        title: 'Lavar la ropa',
        description: 'Separar, lavar, secar y doblar toda la ropa de la familia.',
        status: 'completed',
        priority: 'high',
        assignedTo: 2,
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(lastWeek),
        dueDate: new Date(lastWeek),
        completedAt: new Date(lastWeek)
      },
      {
        id: 8,
        title: 'Limpiar los baños',
        description: 'Limpiar y desinfectar todos los baños de la casa.',
        status: 'completed',
        priority: 'high',
        assignedTo: 2,
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(lastWeek),
        dueDate: new Date(lastWeek),
        completedAt: new Date(lastWeek)
      },
      {
        id: 9,
        title: 'Comprar víveres',
        description: 'Hacer la compra semanal según la lista de la familia.',
        status: 'completed',
        priority: 'medium',
        assignedTo: 2,
        assignedBy: 1,
        createdAt: new Date(lastWeek),
        updatedAt: new Date(lastWeek),
        dueDate: new Date(lastWeek),
        completedAt: new Date(lastWeek)
      }
    ];
  }

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

    return this.http.get<{ tasks: Task[], total: number }>(`${this.API_URL}/tasks`, { params })
      .pipe(
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
    return this.http.post<Task>(`${this.API_URL}/tasks`, task)
      .pipe(
        catchError(() => {
          // En modo de prueba, simular creación de tarea
          const newTask: Task = {
            id: Math.floor(Math.random() * 1000) + 100,
            title: task.title,
            description: task.description,
            status: 'pending',
            priority: task.priority,
            assignedTo: task.assignedTo,
            assignedBy: 1, // Simular que fue creada por el admin
            createdAt: new Date(),
            updatedAt: new Date(),
            dueDate: task.dueDate
          };
          return of(newTask);
        })
      );
  }

  // Actualizar tarea
  updateTask(id: number, updates: UpdateTaskRequest): Observable<Task> {
    return this.http.put<Task>(`${this.API_URL}/tasks/${id}`, updates)
      .pipe(
        catchError(() => {
          // En modo de prueba, simular actualización
          const mockTasks = this.getMockTasks();
          const task = mockTasks.find(t => t.id === id);
          if (task) {
            const updatedTask: Task = { 
              ...task, 
              ...updates, 
              updatedAt: new Date()
            };
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

  // Marcar tarea como completada
  completeTask(id: number): Observable<Task> {
    return this.http.patch<Task>(`${this.API_URL}/tasks/${id}/complete`, {})
      .pipe(
        catchError(() => {
          // En modo de prueba, simular completar tarea
          const mockTasks = this.getMockTasks();
          const task = mockTasks.find(t => t.id === id);
          if (task) {
            const completedTask: Task = { 
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

  // Obtener tareas asignadas al usuario actual
  getMyTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.API_URL}/tasks/my-tasks`)
      .pipe(
        catchError(() => {
          // Si falla la conexión, devolver datos de prueba filtrados para el usuario actual (María - ID 2)
          const mockTasks = this.getMockTasks();
          const myTasks = mockTasks.filter(task => task.assignedTo === 2);
          return of(myTasks);
        })
      );
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

  // Agregar comentario a una tarea
  addComment(taskId: number, comment: string): Observable<any> {
    return this.http.post(`${this.API_URL}/tasks/${taskId}/comments`, { comment })
      .pipe(
        catchError(() => {
          // En modo de prueba, simular agregar comentario
          const mockComment = {
            id: Math.floor(Math.random() * 1000),
            taskId: taskId,
            comment: comment,
            createdAt: new Date(),
            createdBy: 2 // Usuario actual (María)
          };
          return of(mockComment);
        })
      );
  }

  // Obtener comentarios de una tarea
  getTaskComments(taskId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/tasks/${taskId}/comments`)
      .pipe(
        catchError(() => {
          // En modo de prueba, devolver comentarios simulados
          const mockComments = [
            {
              id: 1,
              taskId: taskId,
              comment: 'Comentario de ejemplo para esta tarea',
              createdAt: new Date(Date.now() - 86400000), // Hace 1 día
              createdBy: 2,
              createdByName: 'María García'
            }
          ];
          return of(mockComments);
        })
      );
  }

  // Agregar archivo a una tarea
  addTaskFile(taskId: number, fileInfo: any): Observable<any> {
    return this.http.post(`${this.API_URL}/tasks/${taskId}/files`, fileInfo)
      .pipe(
        catchError(() => {
          // En modo de prueba, simular agregar archivo
          const mockFile = {
            id: Math.floor(Math.random() * 1000),
            taskId: taskId,
            fileName: fileInfo.fileName,
            fileUrl: fileInfo.fileUrl,
            fileSize: fileInfo.fileSize,
            mimeType: fileInfo.mimeType,
            uploadedAt: new Date(),
            uploadedBy: 2 // Usuario actual (María)
          };
          return of(mockFile);
        })
      );
  }

  // Obtener archivos de una tarea
  getTaskFiles(taskId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API_URL}/tasks/${taskId}/files`)
      .pipe(
        catchError(() => {
          // En modo de prueba, devolver archivos simulados
          const mockFiles = [
            {
              id: 1,
              taskId: taskId,
              fileName: 'ejemplo.pdf',
              fileUrl: '/uploads/ejemplo.pdf',
              fileSize: 1024000,
              mimeType: 'application/pdf',
              uploadedAt: new Date(Date.now() - 3600000), // Hace 1 hora
              uploadedBy: 2,
              uploadedByName: 'María García'
            }
          ];
          return of(mockFiles);
        })
      );
  }
}