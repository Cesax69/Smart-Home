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
  private readonly NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
  private readonly USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://localhost:3001';
  private readonly TASKS_SERVICE_URL = process.env.TASKS_SERVICE_URL || 'http://localhost:3002';

  /**
   * Obtiene información de un usuario por ID
   */
  private async getUserById(userId: number): Promise<User | null> {
    try {
      const response = await axios.get(`${this.USERS_SERVICE_URL}/api/users/${userId}`);
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
      const response = await axios.get(`${this.USERS_SERVICE_URL}/api/users/leaders`);
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
        console.warn('⚠️ Usuario que completó la tarea no encontrado, usaré valores por defecto:', completedByUserId);
      }
      
      if (completedByUser) {
        console.log('👤 User who completed task:', { id: completedByUser.id, name: `${completedByUser.firstName} ${completedByUser.lastName}` });
      }

      // Obtener comentarios y archivos de la tarea
      const taskComments = await this.getTaskComments(task.id);
      const taskFiles = await this.getTaskFiles(task.id);
      
      console.log('💬 Task comments found:', taskComments.length);
      console.log('📎 Task files found:', taskFiles.length);

      // Obtener los jefes del hogar
      const householdHeads = await this.getHouseholdHeads();
      if (!householdHeads || householdHeads.length === 0) {
        console.warn('⚠️ No se encontraron jefes del hogar, se usará fallback con usuario 1');
      }
      
      if (householdHeads && householdHeads.length > 0) {
        console.log('👥 Household heads found:', householdHeads.map(h => ({ id: h.id, name: `${h.firstName} ${h.lastName}` })));
      }

      // Crear el mensaje de notificación con información adicional
      const completedByDisplayName = completedByUser
        ? `${completedByUser.firstName} ${completedByUser.lastName}`
        : `Usuario ${completedByUserId}`;
      let message = `${completedByDisplayName} ha completado la tarea "${task.title}"`;
      
      if (taskComments.length > 0) {
        message += ` con ${taskComments.length} comentario${taskComments.length > 1 ? 's' : ''}`;
      }
      
      if (taskFiles.length > 0) {
        message += ` y ${taskFiles.length} archivo${taskFiles.length > 1 ? 's' : ''} adjunto${taskFiles.length > 1 ? 's' : ''}`;
      }
      
      console.log('📝 Notification message:', message);

      // Build recipient set: household heads + assigned user + completedBy user
      const recipientIds = new Set<number>();

      if (householdHeads && householdHeads.length > 0) {
        for (const head of householdHeads) {
          if (head?.id) recipientIds.add(head.id);
        }
      } else {
        // Fallback to user 1 if no heads found
        recipientIds.add(1);
      }

      if (task.assignedUserId) {
        recipientIds.add(task.assignedUserId);
      }

      const completedByNum = parseInt(completedByUserId);
      if (!isNaN(completedByNum)) {
        recipientIds.add(completedByNum);
      }

      console.log('👥 Recipients to notify:', Array.from(recipientIds));

      // Send notification to each recipient
      for (const recipientId of recipientIds) {
        const notification: NotificationEvent = {
          type: 'task_completed',
          channels: ['app', 'whatsapp'],
          data: {
            userId: recipientId.toString(),
            familyId: 'family_1',
            taskId: task.id?.toString(),
            taskTitle: task.title,
            message,
            metadata: {
              category: task.category,
              priority: task.priority,
              completedAt: new Date().toISOString(),
              completedByUserId: completedByUserId,
              completedByUserName: completedByUser ? `${completedByUser.firstName} ${completedByUser.lastName}` : undefined,
              originalAssignee: task.assignedUserId,
              commentsCount: taskComments.length,
              filesCount: taskFiles.length,
              comments: taskComments.slice(0, 3),
              files: taskFiles.slice(0, 5)
            }
          },
          priority: task.priority === 'alta' ? 'high' : 'low'
        };

        console.log('📤 Sending notification to recipient:', { recipientId, notification });
        await this.sendNotification(notification);
        console.log('✅ Notification sent to recipient:', recipientId);
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
          channels: ['app', 'whatsapp'],
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
          channels: ['app', 'whatsapp'],
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
      // Transform the event to match the expected format for /notify/family
      const notificationPayload = {
        userId: parseInt(event.data.userId),
        type: event.type === 'task_completed' ? 'tarea_completada' : 
              event.type === 'task_assigned' ? 'tarea_asignada' : 
              event.type === 'task_reminder' ? 'recordatorio_tarea' : 'recordatorio_general',
        priority: event.priority === 'high' ? 'alta' : 'media',
        taskData: {
          taskId: event.data.taskId,
          taskTitle: event.data.taskTitle,
          category: event.data.metadata?.category,
          priority: event.data.metadata?.priority,
          completedAt: event.data.metadata?.completedAt,
          completedByUserId: event.data.metadata?.completedByUserId,
          completedByUserName: event.data.metadata?.completedByUserName,
          originalAssignee: event.data.metadata?.originalAssignee,
          commentsCount: event.data.metadata?.commentsCount,
          filesCount: event.data.metadata?.filesCount,
          comments: event.data.metadata?.comments,
          files: event.data.metadata?.files
        },
        message: event.data.message
      };

      const url = `${this.NOTIFICATION_SERVICE_URL}/notify/family`;
      console.log('📤 Enviando notificación', { url, notificationPayload });
      const res = await axios.post(url, notificationPayload);
      console.log('✅ Notificación enviada correctamente', { status: res.status });
    } catch (error) {
      const status = (error as any)?.response?.status;
      const data = (error as any)?.response?.data;
      console.error('❌ Error enviando notificación', { status, data, event });
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
      const response = await axios.get(`${this.TASKS_SERVICE_URL}/api/tasks/${taskId}/comments`);
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
      const response = await axios.get(`${this.TASKS_SERVICE_URL}/api/tasks/${taskId}/files`);
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
      const response = await axios.get(`${this.NOTIFICATION_SERVICE_URL}/health`, {
        timeout: 3000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('⚠️ Cannot connect to notifications service');
      return false;
    }
  }
}