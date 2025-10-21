import axios from 'axios';
import { Task } from '../types/Task';

const HTTP_TIMEOUT = Number(process.env.HTTP_TIMEOUT || 1500);

interface UserInfo {
  id: number;
  firstName?: string;
  lastName?: string;
}

interface NotificationEvent {
  type: string;
  channels: ('app' | 'whatsapp' | 'email')[];
  data: any;
  priority?: 'high' | 'low';
}

export class NotificationService {
  private async sendNotification(event: NotificationEvent): Promise<void> {
    try {
      const notificationServiceUrl = process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
      await axios.post(`${notificationServiceUrl}/notify/queue`, event, { timeout: HTTP_TIMEOUT });
    } catch (error) {
      console.warn('NotificationService.sendNotification failed:', (error as any)?.message || error);
      throw error;
    }
  }

  private async getHouseholdHeads(): Promise<number[]> {
    try {
      const usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3001';
      const response = await axios.get(`${usersServiceUrl}/api/users/role/jefe_del_hogar`, { timeout: HTTP_TIMEOUT });
      const heads = Array.isArray(response.data?.data) ? response.data.data : [];
      return heads.map((u: any) => u.id).filter(Boolean);
    } catch (error) {
      console.warn('NotificationService.getHouseholdHeads failed:', (error as any)?.message || error);
      return [];
    }
  }

  private async getUser(userId?: number): Promise<UserInfo | null> {
    try {
      if (!userId) return null;
      const usersServiceUrl = process.env.USERS_SERVICE_URL || 'http://localhost:3001';
      const response = await axios.get(`${usersServiceUrl}/api/users/${userId}`, { timeout: HTTP_TIMEOUT });
      return (response.data?.data || null);
    } catch (error) {
      return null;
    }
  }

  private async getTaskComments(taskId?: number): Promise<any[]> {
    try {
      if (!taskId) return [];
      const tasksServiceUrl = process.env.TASKS_SERVICE_INTERNAL_URL || process.env.TASKS_SERVICE_URL || 'http://localhost:3002';
      const response = await axios.get(`${tasksServiceUrl}/api/tasks/${taskId}/comments`, { timeout: HTTP_TIMEOUT });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      return [];
    }
  }

  private async getTaskFiles(taskId?: number): Promise<any[]> {
    try {
      if (!taskId) return [];
      const tasksServiceUrl = process.env.TASKS_SERVICE_INTERNAL_URL || process.env.TASKS_SERVICE_URL || 'http://localhost:3002';
      const response = await axios.get(`${tasksServiceUrl}/api/tasks/${taskId}/files`, { timeout: HTTP_TIMEOUT });
      return Array.isArray(response.data?.data) ? response.data.data : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Enviar notificación de tarea completada a los jefes del hogar
   */
  async sendTaskCompletedNotification(task: Task, completedByUserId: number): Promise<void> {
    try {
      const headIds = (await this.getHouseholdHeads()) || [];
      if (!headIds.length) return;

      const completedByUser = await this.getUser(completedByUserId);
      const taskComments = await this.getTaskComments(task.id);
      const taskFiles = await this.getTaskFiles(task.id);

      const message = `La tarea "${task.title}" fue completada${completedByUser ? ` por ${completedByUser.firstName} ${completedByUser.lastName}` : ''}. ✅`;

      const event: NotificationEvent = {
        type: 'task_completed',
        channels: ['app'],
        data: {
          userId: completedByUserId,
          recipients: headIds.map(id => id.toString()),
          bossUserId: headIds[0]?.toString(),
          familyId: 'family_1',
          taskId: task.id?.toString(),
          taskTitle: task.title,
          message,
          metadata: {
            taskData: {
              taskId: task.id?.toString(),
              taskTitle: task.title,
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate,
              reward: task.reward,
              completedAt: new Date().toISOString(),
              completedByUserId,
              completedByUserName: completedByUser ? `${completedByUser.firstName} ${completedByUser.lastName}` : undefined,
              originalAssignee: task.assignedUserId
            },
            commentsCount: taskComments.length,
            filesCount: taskFiles.length,
            comments: taskComments.slice(0, 3),
            files: taskFiles.slice(0, 5)
          }
        },
        priority: task.priority === 'alta' ? 'high' : 'low'
      };

      await this.sendNotification(event);
      console.log(`✅ Task completion notification queued for heads: ${JSON.stringify(headIds)}`);
    } catch (error) {
      console.error('❌ Error sending task completion notification:', error);
    }
  }

  /**
   * Enviar notificación de asignación de tarea a los asignados
   */
  async sendTaskAssignedNotification(task: Task, assignedUserIds: number[]): Promise<void> {
    try {
      const recipients = Array.from(new Set((assignedUserIds || []).filter(Boolean)))
        .filter(id => id !== task.createdById)
        .map(id => id.toString());
      if (!recipients.length) {
        console.warn('⚠️ No hay destinatarios para asignación de tarea');
        return;
      }

      const message = `Se te ha asignado una nueva tarea: "${task.title}". ¡Es hora de ponerse manos a la obra! 💪`;
      const event: NotificationEvent = {
        type: 'task_assigned',
        channels: ['app'],
        data: {
          userId: (task.createdById || Number(recipients[0])).toString(),
          recipients,
          taskId: task.id?.toString(),
          taskTitle: task.title,
          message,
          metadata: {
            taskData: {
              taskId: task.id?.toString(),
              taskTitle: task.title,
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate,
              createdById: task.createdById,
              createdByName: task.createdByName,
              description: task.description
            }
          }
        },
        priority: task.priority === 'alta' ? 'high' : 'low'
      };

      await this.sendNotification(event);
      console.log(`✅ Task assignment notification queued for recipients: ${JSON.stringify(recipients)}`);
    } catch (error) {
      console.error('❌ Error sending task assignment notification:', error);
    }
  }

  /**
   * Send task reminder notification
   */
  async sendTaskReminderNotification(task: Task, userIds: number[]): Promise<void> {
    try {
      const recipients = (userIds || []).filter(Boolean).map(id => id.toString());
      if (!recipients.length) return;

      const event: NotificationEvent = {
        type: 'task_reminder',
        channels: ['app'],
        data: {
          userId: recipients[0],
          recipients,
          taskId: task.id?.toString(),
          taskTitle: task.title,
          message: `⏰ Recordatorio: La tarea "${task.title}" está pendiente. ¡No olvides completarla!`,
          metadata: {
            taskData: {
              taskId: task.id?.toString(),
              taskTitle: task.title,
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate
            }
          }
        },
        priority: task.priority === 'alta' ? 'high' : 'low'
      };

      await this.sendNotification(event);
    } catch (error) {
      console.error('❌ Error sending task reminder notification:', error);
    }
  }
}