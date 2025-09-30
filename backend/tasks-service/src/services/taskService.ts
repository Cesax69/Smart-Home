import { Task, CreateTaskRequest, UpdateTaskRequest, DatabaseTask, TaskStatus, TaskCategory, TaskPriority, TaskStats } from '../types/Task';
import { databaseService } from '../config/database';

// Datos mockeados de tareas domésticas familiares
const mockTasks: Task[] = [
  {
    id: 1,
    title: "Lavar los platos",
    description: "Lavar todos los platos del desayuno y almuerzo",
    category: "cocina",
    priority: "alta",
    status: "pendiente",
    assignedUserId: 3,
    assignedUserName: "María García",
    createdById: 1,
    createdByName: "Papá García",
    dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas desde ahora
    estimatedTime: 30,
    reward: "30 minutos extra de TV",
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hora atrás
  },
  {
    id: 2,
    title: "Sacar la basura",
    description: "Sacar las bolsas de basura de la cocina y baños",
    category: "limpieza",
    priority: "media",
    status: "completada",
    assignedUserId: 4,
    assignedUserName: "Carlos García",
    createdById: 2,
    createdByName: "Mamá García",
    estimatedTime: 15,
    reward: "Postre extra en la cena",
    completedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 horas atrás
  },
  {
    id: 3,
    title: "Ordenar el cuarto",
    description: "Organizar la ropa, hacer la cama y limpiar el escritorio",
    category: "organizacion",
    priority: "baja",
    status: "en_proceso",
    assignedUserId: 3,
    assignedUserName: "María García",
    createdById: 1,
    createdByName: "Papá García",
    dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // mañana
    estimatedTime: 45,
    reward: "Elegir la película del viernes",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 horas atrás
  },
  {
    id: 4,
    title: "Regar las plantas",
    description: "Regar todas las plantas del jardín y balcón",
    category: "jardin",
    priority: "media",
    status: "pendiente",
    assignedUserId: 4,
    assignedUserName: "Carlos García",
    createdById: 2,
    createdByName: "Mamá García",
    dueDate: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 horas desde ahora
    estimatedTime: 20,
    reward: "Jugar videojuegos 1 hora extra",
    createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutos atrás
  },
  {
    id: 5,
    title: "Doblar la ropa limpia",
    description: "Doblar y guardar la ropa que está en el tendedero",
    category: "lavanderia",
    priority: "baja",
    status: "pendiente",
    assignedUserId: 3,
    assignedUserName: "María García",
    createdById: 2,
    createdByName: "Mamá García",
    estimatedTime: 25,
    reward: "Salir con amigas el sábado",
    createdAt: new Date(Date.now() - 45 * 60 * 1000), // 45 minutos atrás
  }
];

export class TaskService {
  
  /**
   * Publica un evento real al servicio de notificaciones
   */
  private async publishEvent(eventType: string, taskData: Task) {
    try {
      console.log(`EVENTO PUBLICADO: ${eventType}, UsuarioID: ${taskData.assignedUserId}, TareaID: ${taskData.id}, Título: ${taskData.title}`);
      
      // Mapear tipos de eventos a tipos de notificación
      let notificationType: string;
      switch (eventType) {
        case 'TareaCreada':
          notificationType = 'tarea_asignada';
          break;
        case 'TareaActualizada':
          notificationType = taskData.status === 'completada' ? 'tarea_completada' : 'tarea_actualizada';
          break;
        case 'TareaEliminada':
          notificationType = 'tarea_eliminada';
          break;
        default:
          notificationType = 'general';
      }

      // Preparar datos para el webhook de notificaciones
      const notificationPayload = {
        userId: taskData.assignedUserId,
        type: notificationType,
        priority: taskData.priority === 'urgente' ? 'alta' : taskData.priority === 'alta' ? 'media' : 'baja',
        taskData: {
          id: taskData.id,
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority,
          status: taskData.status,
          assignedUserName: taskData.assignedUserName,
          createdByName: taskData.createdByName,
          dueDate: taskData.dueDate,
          reward: taskData.reward
        }
      };

      // Enviar notificación al notifications-service
      const notificationServiceUrl = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:3004';
      const response = await fetch(`${notificationServiceUrl}/notify/family`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload)
      });

      if (response.ok) {
         const result = await response.json() as { message?: string };
         console.log(`✅ Notificación enviada exitosamente:`, result.message || 'Sin mensaje');
       } else {
         console.error(`❌ Error al enviar notificación: ${response.status} ${response.statusText}`);
       }
    } catch (error) {
      console.error('❌ Error al publicar evento de notificación:', error);
      // No lanzamos el error para que no afecte la operación principal de la tarea
    }
  }

  /**
   * Convierte un registro de base de datos a objeto Task
   */
  private mapDatabaseTaskToTask(dbTask: DatabaseTask): Task {
    return {
      id: dbTask.id,
      title: dbTask.title,
      description: dbTask.description,
      category: dbTask.category,
      priority: dbTask.priority,
      status: dbTask.status,
      assignedUserId: dbTask.assigned_user_id,
      assignedUserName: dbTask.assigned_user_name,
      createdById: dbTask.created_by_id,
      createdByName: dbTask.created_by_name,
      dueDate: dbTask.due_date,
      estimatedTime: dbTask.estimated_time,
      reward: dbTask.reward,
      fileUrl: dbTask.file_url || undefined,
      completedAt: dbTask.completed_at,
      createdAt: dbTask.created_at,
      updatedAt: dbTask.updated_at
    };
  }

  /**
   * Valida el estado de una tarea
   */
  private isValidStatus(status: string): status is TaskStatus {
    return ['pendiente', 'en_proceso', 'completada'].includes(status);
  }

  /**
   * Valida la categoría de una tarea
   */
  private isValidCategory(category: string): category is TaskCategory {
    return ['limpieza', 'cocina', 'lavanderia', 'jardin', 'mantenimiento', 'organizacion', 'mascotas', 'compras', 'otros'].includes(category);
  }

  /**
   * Valida la prioridad de una tarea
   */
  private isValidPriority(priority: string): priority is TaskPriority {
    return ['baja', 'media', 'alta', 'urgente'].includes(priority);
  }

  /**
   * Crea una nueva tarea doméstica
   */
  async createTask(taskData: CreateTaskRequest): Promise<Task> {
    try {
      // Validar datos de entrada
      if (!taskData.title || taskData.title.trim().length === 0) {
        throw new Error('El título de la tarea es requerido');
      }

      if (!taskData.description || taskData.description.trim().length === 0) {
        throw new Error('La descripción de la tarea es requerida');
      }

      if (!taskData.assignedUserId || taskData.assignedUserId <= 0) {
        throw new Error('El ID del usuario asignado es requerido y debe ser válido');
      }

      if (!taskData.createdById || taskData.createdById <= 0) {
        throw new Error('El ID del creador es requerido y debe ser válido');
      }

      if (!this.isValidCategory(taskData.category)) {
        throw new Error('Categoría de tarea inválida');
      }

      const status = taskData.status || 'pendiente';
      if (!this.isValidStatus(status)) {
        throw new Error('Estado de tarea inválido. Debe ser: pendiente, en_proceso o completada');
      }

      const priority = taskData.priority || 'media';
      if (!this.isValidPriority(priority)) {
        throw new Error('Prioridad de tarea inválida. Debe ser: baja, media, alta o urgente');
      }

      // En un entorno real, aquí se insertaría en la base de datos
      // Por ahora, simulamos con datos mockeados
      const newTask: Task = {
        id: Math.max(...mockTasks.map(t => t.id)) + 1,
        title: taskData.title.trim(),
        description: taskData.description.trim(),
        category: taskData.category,
        priority: priority,
        status: status,
        assignedUserId: taskData.assignedUserId,
        createdById: taskData.createdById,
        dueDate: taskData.dueDate,
        estimatedTime: taskData.estimatedTime,
        reward: taskData.reward,
        fileUrl: taskData.fileUrl,
        createdAt: new Date(),
      };

      mockTasks.push(newTask);
      
      // Publicar evento de tarea creada
      await this.publishEvent('TareaCreada', newTask);
      
      return newTask;
    } catch (error) {
      console.error('Error en createTask:', error);
      throw error;
    }
  }

  /**
   * Obtiene todas las tareas domésticas
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      return mockTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error en getAllTasks:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas por miembro de la familia
   */
  async getTasksByMember(userId: number): Promise<Task[]> {
    try {
      return mockTasks
        .filter(task => task.assignedUserId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error en getTasksByMember:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas por categoría
   */
  async getTasksByCategory(category: TaskCategory): Promise<Task[]> {
    try {
      if (!this.isValidCategory(category)) {
        throw new Error('Categoría inválida');
      }

      return mockTasks
        .filter(task => task.category === category)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error en getTasksByCategory:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas por estado
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    try {
      if (!this.isValidStatus(status)) {
        throw new Error('Estado inválido');
      }

      return mockTasks
        .filter(task => task.status === status)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error en getTasksByStatus:', error);
      throw error;
    }
  }

  /**
   * Obtiene una tarea por su ID
   */
  async getTaskById(id: number): Promise<Task | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('ID de tarea inválido');
      }

      const task = mockTasks.find(task => task.id === id);
      return task || null;
    } catch (error) {
      console.error('Error en getTaskById:', error);
      throw error;
    }
  }

  /**
   * Actualiza una tarea existente
   */
  async updateTask(id: number, updateData: UpdateTaskRequest): Promise<Task | null> {
    try {
      if (!id || id <= 0) {
        throw new Error('ID de tarea inválido');
      }

      const taskIndex = mockTasks.findIndex(task => task.id === id);
      if (taskIndex === -1) {
        return null;
      }

      // Validar datos de actualización
      if (updateData.status && !this.isValidStatus(updateData.status)) {
        throw new Error('Estado de tarea inválido. Debe ser: pendiente, en_proceso o completada');
      }

      if (updateData.category && !this.isValidCategory(updateData.category)) {
        throw new Error('Categoría de tarea inválida');
      }

      if (updateData.priority && !this.isValidPriority(updateData.priority)) {
        throw new Error('Prioridad de tarea inválida');
      }

      // Actualizar la tarea
      const updatedTask = {
        ...mockTasks[taskIndex],
        ...updateData,
        updatedAt: new Date(),
        // Si se marca como completada, agregar fecha de completación
        completedAt: updateData.status === 'completada' ? new Date() : mockTasks[taskIndex].completedAt
      };

      mockTasks[taskIndex] = updatedTask;

      // Publicar evento de tarea actualizada
      await this.publishEvent('TareaActualizada', updatedTask);

      return updatedTask;
    } catch (error) {
      console.error('Error en updateTask:', error);
      throw error;
    }
  }

  /**
   * Elimina una tarea
   */
  async deleteTask(id: number): Promise<boolean> {
    try {
      if (!id || id <= 0) {
        throw new Error('ID de tarea inválido');
      }

      const taskIndex = mockTasks.findIndex(task => task.id === id);
      if (taskIndex === -1) {
        return false;
      }

      const deletedTask = mockTasks[taskIndex];
      mockTasks.splice(taskIndex, 1);

      // Publicar evento de tarea eliminada
      await this.publishEvent('TareaEliminada', deletedTask);

      return true;
    } catch (error) {
      console.error('Error en deleteTask:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de las tareas familiares
   */
  async getTaskStats(): Promise<TaskStats> {
    try {
      const totalTasks = mockTasks.length;
      const pendingTasks = mockTasks.filter(task => task.status === 'pendiente').length;
      const inProgressTasks = mockTasks.filter(task => task.status === 'en_proceso').length;
      const completedTasks = mockTasks.filter(task => task.status === 'completada').length;

      // Estadísticas por categoría
      const tasksByCategory: Record<TaskCategory, number> = {
        limpieza: 0,
        cocina: 0,
        lavanderia: 0,
        jardin: 0,
        mantenimiento: 0,
        organizacion: 0,
        mascotas: 0,
        compras: 0,
        otros: 0
      };

      // Estadísticas por prioridad
      const tasksByPriority: Record<TaskPriority, number> = {
        baja: 0,
        media: 0,
        alta: 0,
        urgente: 0
      };

      // Estadísticas por miembro
      const tasksByMember: Record<number, { name: string; count: number; completed: number }> = {};

      mockTasks.forEach(task => {
        // Contar por categoría
        tasksByCategory[task.category]++;

        // Contar por prioridad
        tasksByPriority[task.priority]++;

        // Contar por miembro
        if (!tasksByMember[task.assignedUserId]) {
          tasksByMember[task.assignedUserId] = {
            name: task.assignedUserName || `Usuario ${task.assignedUserId}`,
            count: 0,
            completed: 0
          };
        }
        tasksByMember[task.assignedUserId].count++;
        if (task.status === 'completada') {
          tasksByMember[task.assignedUserId].completed++;
        }
      });

      return {
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        tasksByCategory,
        tasksByPriority,
        tasksByMember
      };
    } catch (error) {
      console.error('Error en getTaskStats:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas que vencen pronto (próximas 24 horas)
   */
  async getUpcomingTasks(): Promise<Task[]> {
    try {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      return mockTasks
        .filter(task => 
          task.status !== 'completada' && 
          task.dueDate && 
          task.dueDate <= next24Hours && 
          task.dueDate > now
        )
        .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
    } catch (error) {
      console.error('Error en getUpcomingTasks:', error);
      throw error;
    }
  }

  /**
   * Obtiene tareas vencidas
   */
  async getOverdueTasks(): Promise<Task[]> {
    try {
      const now = new Date();

      return mockTasks
        .filter(task => 
          task.status !== 'completada' && 
          task.dueDate && 
          task.dueDate < now
        )
        .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0));
    } catch (error) {
      console.error('Error en getOverdueTasks:', error);
      throw error;
    }
  }
}