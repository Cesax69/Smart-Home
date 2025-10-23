import axios from 'axios';
import { Task } from '../types/Task';

const HTTP_TIMEOUT = Number(process.env.HTTP_TIMEOUT || 5000);

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
      const gatewayUrl = process.env.API_GATEWAY_URL;
      const base = gatewayUrl
        ? `${gatewayUrl.replace(/\/+$/, '')}/api/notifications`
        : (process.env.NOTIFICATIONS_SERVICE_URL || process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004');
      await axios.post(`${base.replace(/\/+$/, '')}/notify/queue`, event, { timeout: HTTP_TIMEOUT });
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
   * Enviar notificación de tarea completada a jefes del hogar y asignados
   */
  async sendTaskCompletedNotification(task: Task, completedByUserId: number): Promise<void> {
    try {
      const headIds = (await this.getHouseholdHeads()) || [];

      // Agregar asignados de la tarea (soporta uno o varios)
      const assigneeIds = Array.isArray(task.assignedUserIds) && task.assignedUserIds.length
        ? task.assignedUserIds
        : (task.assignedUserId ? [task.assignedUserId] : []);

      // Unificar destinatarios: jefes + asignados, excluyendo a quien completó
      const recipientIds = Array.from(new Set([ ...headIds, ...assigneeIds ].filter(id => !!id)))
        .filter(id => id !== completedByUserId);

      if (!recipientIds.length) {
        console.warn('⚠️ No hay destinatarios para notificación de tarea completada');
        return;
      }

      const completedByUser = await this.getUser(completedByUserId);
      const taskComments = await this.getTaskComments(task.id);
      const taskFiles = await this.getTaskFiles(task.id);

      const message = `La tarea "${task.title}" fue completada${completedByUser ? ` por ${completedByUser.firstName} ${completedByUser.lastName}` : ''}. ✅`;

      // Identificar un jefe del hogar para metadata si existe
      const bossHeadId = headIds.find(id => id !== completedByUserId);

      const event: NotificationEvent = {
        type: 'task_completed',
        channels: ['app'],
        data: {
          userId: completedByUserId.toString(),
          recipients: recipientIds.map(id => id.toString()),
          bossUserId: bossHeadId?.toString(),
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
              originalAssignee: task.assignedUserId,
              assignedUserIds: task.assignedUserIds
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
      console.log(`✅ Task completion notification queued for recipients: ${JSON.stringify(recipientIds)}`);
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
   * Notificación de actualización de tarea (comentarios, archivos, edición)
   */
  async sendTaskUpdatedNotification(task: Task, actorUserId: number, info?: { change: 'files_added' | 'file_updated' | 'file_deleted' | 'task_edited' | 'comment_added'; count?: number; fileName?: string; commentPreview?: string }): Promise<void> {
    try {
      const recipients = Array.from(new Set(
        ((task.assignedUserIds && task.assignedUserIds.length ? task.assignedUserIds : (task.assignedUserId ? [task.assignedUserId] : [])) || [])
          .filter(Boolean)
      ))
      .filter(id => id !== actorUserId)
      .map(id => id.toString());

      if (!recipients.length) {
        console.warn('⚠️ No hay destinatarios para actualización de tarea');
        return;
      }

      const actor = await this.getUser(actorUserId);
      const taskComments = await this.getTaskComments(task.id);
      const taskFiles = await this.getTaskFiles(task.id);

      let message = `La tarea "${task.title}" fue actualizada.`;
      if (info?.change === 'files_added') {
        message = `${actor ? `${actor.firstName} ${actor.lastName}` : 'Se'} agregó${(info?.count || 0) > 1 ? 'ron' : ''} ${(info?.count || 1)} archivo${(info?.count || 1) > 1 ? 's' : ''} a la tarea "${task.title}"`;
      } else if (info?.change === 'file_updated') {
        message = `${actor ? `${actor.firstName} ${actor.lastName}` : 'Se'} actualizó el archivo "${info?.fileName || ''}" en la tarea "${task.title}"`;
      } else if (info?.change === 'file_deleted') {
        message = `${actor ? `${actor.firstName} ${actor.lastName}` : 'Se'} eliminó un archivo de la tarea "${task.title}"`;
      } else if (info?.change === 'comment_added') {
        const preview = (info?.commentPreview || '').trim();
        message = `${actor ? `${actor.firstName} ${actor.lastName}` : 'Se'} agregó un comentario en "${task.title}": ${preview ? '"' + preview + '"' : ''}`;
      } else if (info?.change === 'task_edited') {
        message = `${actor ? `${actor.firstName} ${actor.lastName}` : 'Se'} editó la información de la tarea "${task.title}"`;
      }

      const event: NotificationEvent = {
        type: 'task_updated',
        channels: ['app'],
        data: {
          userId: actorUserId.toString(),
          recipients,
          taskId: task.id?.toString(),
          taskTitle: task.title,
          message,
          metadata: {
            change: info?.change || 'task_edited',
            count: info?.count,
            fileName: info?.fileName,
            commentPreview: info?.commentPreview,
            taskData: {
              taskId: task.id?.toString(),
              taskTitle: task.title,
              category: task.category,
              priority: task.priority,
              dueDate: task.dueDate,
              description: task.description,
              createdById: task.createdById,
              createdByName: task.createdByName,
              assignedUserIds: task.assignedUserIds,
              assignedUserId: task.assignedUserId
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
      console.log(`✅ Task updated notification queued for recipients: ${JSON.stringify(recipients)}`);
    } catch (error) {
      console.error('❌ Error sending task updated notification:', error);
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