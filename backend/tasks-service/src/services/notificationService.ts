import { Task } from '../types/Task';
import axios from 'axios';

interface NotificationEvent {
  type: string;
  channels: string[];
  data: {
    userId: string;
    familyId: string;
    taskId?: string;
    taskTitle?: string;
    message: string;
    metadata?: any;
  };
  priority: 'high' | 'low';
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'head_of_household' | 'family_member';
}

export class NotificationService {
  // Siempre preferimos enrutar a través del API Gateway
  private readonly API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway:3000';
  private readonly NOTIFICATIONS_BASE_URL = `${this.API_GATEWAY_URL}/api/notifications`;
  private readonly USERS_BASE_URL = `${this.API_GATEWAY_URL}/api/users`;
  private readonly TASKS_BASE_URL = `${this.API_GATEWAY_URL}/api/tasks`;

  /**
   * Obtiene información de un usuario por ID
   */
  private async getUserById(userId: number): Promise<User | null> {
    try {
      const response = await axios.get(`${this.USERS_BASE_URL}/${userId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      return null;
    }
  }

  /**
   * Obtiene los jefes del hogar
   */
  private async getHouseholdHeads(): Promise<User[]> {
    try {
      const response = await axios.get(`${this.USERS_BASE_URL}/leaders`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching household heads:', error);
      return [];
    }
  }

  /**
   * Envía una notificación cuando se completa una tarea
   */
  async sendTaskCompletedNotification(task: Task, completedByUserId: string): Promise<void> {
    try {
      console.log('🔔 sendTaskCompletedNotification called with:');
      console.log('  - Task:', { id: task.id, title: task.title, assignedUserId: task.assignedUserId });
      console.log('  - completedByUserId:', completedByUserId);

      // Obtener información del usuario que completó la tarea
      const completedByUser = await this.getUserById(parseInt(completedByUserId));
      if (!completedByUser) {
        console.error('❌ Usuario que completó la tarea no encontrado:', completedByUserId);
        return;
      }
      
      console.log('👤 User who completed task:', { id: completedByUser.id, name: `${completedByUser.firstName} ${completedByUser.lastName}` });

      // Obtener comentarios y archivos de la tarea
      const taskComments = await this.getTaskComments(task.id);
      const taskFiles = await this.getTaskFiles(task.id);
      
      console.log('💬 Task comments found:', taskComments.length);
      console.log('📎 Task files found:', taskFiles.length);

      // Obtener los jefes del hogar
      const householdHeads = await this.getHouseholdHeads();
      if (!householdHeads || householdHeads.length === 0) {
        console.error('❌ No se encontraron jefes del hogar para enviar la notificación');
        return;
      }
      
      console.log('👥 Household heads found:', householdHeads.map(h => ({ id: h.id, name: `${h.firstName} ${h.lastName}` })));

      // Crear el mensaje de notificación con información adicional
      let message = `${completedByUser.firstName} ${completedByUser.lastName} ha completado la tarea "${task.title}"`;
      
      if (taskComments.length > 0) {
        message += ` con ${taskComments.length} comentario${taskComments.length > 1 ? 's' : ''}`;
      }
      
      if (taskFiles.length > 0) {
        message += ` y ${taskFiles.length} archivo${taskFiles.length > 1 ? 's' : ''} adjunto${taskFiles.length > 1 ? 's' : ''}`;
      }
      
      console.log('📝 Notification message:', message);

      // Enviar notificación a cada jefe del hogar
      for (const head of householdHeads) {
        const notification: NotificationEvent = {
          type: 'task_completed',
          channels: ['app'],
          data: {
            userId: head.id.toString(),
            familyId: 'family_1',
            taskId: task.id?.toString(),
            taskTitle: task.title,
            message,
            metadata: {
              category: task.category,
              priority: task.priority,
              completedAt: new Date().toISOString(),
              completedByUserId: completedByUserId,
              completedByUserName: `${completedByUser.firstName} ${completedByUser.lastName}`,
              originalAssignee: task.assignedUserId,
              commentsCount: taskComments.length,
              filesCount: taskFiles.length,
              comments: taskComments.slice(0, 3), // Solo los primeros 3 comentarios para evitar payload muy grande
              files: taskFiles.slice(0, 5) // Solo los primeros 5 archivos
            }
          },
          priority: task.priority === 'alta' ? 'high' : 'low'
        };

        console.log('📤 Sending notification to head:', { headId: head.id, notification });
        await this.sendNotification(notification);
        console.log('✅ Notification sent to head:', head.id);
      }
      
      console.log(`✅ Task completion notification sent for task: ${task.title}`);
    } catch (error) {
      console.error('❌ Error sending task completion notification:', error);
      // Don't throw error to avoid breaking task completion flow
    }
  }

  /**
   * Send task assignment notification
   */
  async sendTaskAssignedNotification(task: Task, assignedUserIds: number[]): Promise<void> {
    try {
      // Send notification to each assigned user
      for (const userId of assignedUserIds) {
        const notification: NotificationEvent = {
          type: 'task_assigned',
          channels: ['app'],
          data: {
            userId: userId.toString(),
            familyId: 'family_1',
            taskId: task.id?.toString(),
            taskTitle: task.title,
            message: `Se te ha asignado una nueva tarea: "${task.title}". ¡Es hora de ponerse manos a la obra! 💪`,
            metadata: {
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate,
              createdBy: task.createdById,
              description: task.description
            }
          },
          priority: task.priority === 'alta' ? 'high' : 'low'
        };

        await this.sendNotification(notification);
      }
      
      console.log(`✅ Task assignment notifications sent for task: ${task.title}`);
    } catch (error) {
      console.error('❌ Error sending task assignment notification:', error);
    }
  }

  /**
   * Send task reminder notification
   */
  async sendTaskReminderNotification(task: Task, userIds: number[]): Promise<void> {
    try {
      for (const userId of userIds) {
        const notification: NotificationEvent = {
          type: 'task_reminder',
          channels: ['app'],
          data: {
            userId: userId.toString(),
            familyId: 'family_1',
            taskId: task.id?.toString(),
            taskTitle: task.title,
            message: `⏰ Recordatorio: La tarea "${task.title}" está pendiente. ¡No olvides completarla!`,
            metadata: {
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate,
              daysSinceAssigned: this.calculateDaysSinceCreated(task.createdAt)
            }
          },
          priority: 'low'
        };

        await this.sendNotification(notification);
      }
      
      console.log(`✅ Task reminder notifications sent for task: ${task.title}`);
    } catch (error) {
      console.error('❌ Error sending task reminder notification:', error);
    }
  }

  /**
   * Envía una notificación al servicio de notificaciones
   */
  private async sendNotification(event: NotificationEvent): Promise<void> {
    try {
      await axios.post(`${this.NOTIFICATIONS_BASE_URL}/notify/queue`, event);
      console.log('Notification queued successfully');
    } catch (error) {
      console.error('Error queuing notification:', error);
    }
  }

  /**
   * Calculate days since task was created
   */
  private calculateDaysSinceCreated(createdAt: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtener comentarios de una tarea
   */
  private async getTaskComments(taskId: number): Promise<any[]> {
    try {
      const response = await axios.get(`${this.TASKS_BASE_URL}/${taskId}/comments`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching task comments:', error);
      return [];
    }
  }

  /**
   * Obtener archivos de una tarea
   */
  private async getTaskFiles(taskId: number): Promise<any[]> {
    try {
      const response = await axios.get(`${this.TASKS_BASE_URL}/${taskId}/files`);
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching task files:', error);
      return [];
    }
  }

  /**
   * Test notification service connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.NOTIFICATIONS_BASE_URL}/health`, {
        timeout: 3000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('⚠️ Cannot connect to notifications service');
      return false;
    }
  }
}