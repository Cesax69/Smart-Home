/**
 * Tipos de datos para el sistema de notificaciones familiares
 */

export type NotificationType = 
  | 'tarea_asignada'
  | 'tarea_completada'
  | 'tarea_actualizada'
  | 'recordatorio_tarea'
  | 'tarea_vencida'
  | 'felicitacion'
  | 'reunion_familiar'
  | 'emergencia_hogar'
  | 'recordatorio_general';

export type NotificationPriority = 'baja' | 'media' | 'alta' | 'urgente';

export interface FamilyMember {
  id: number;
  name: string;
  role: string; // 'padre', 'madre', 'hijo', 'hija', 'abuelo', 'abuela', etc.
  phoneNumber?: string;
  preferences?: NotificationPreferences;
}

export interface NotificationPreferences {
  enabledTypes: NotificationType[];
  quietHours?: {
    start: string; // formato HH:mm
    end: string;   // formato HH:mm
  };
  preferredLanguage?: 'es' | 'en';
}

export interface TaskNotificationData {
  taskId?: number;
  taskTitle: string;
  taskCategory?: string;
  category?: string; // Compatibilidad con tasks-service
  assignedMemberName?: string;
  assignedTo?: string; // Compatibilidad con tasks-service
  createdByName?: string;
  completedByName?: string; // Nombre del miembro que completó la tarea
  completedByUserName?: string; // Alias para compatibilidad
  dueDate?: Date | string;
  priority?: string;
  reward?: string;
}

export interface NotificationRequest {
  userId: number;
  type: NotificationType;
  priority: NotificationPriority;
  message?: string; // mensaje personalizado opcional
  taskData?: TaskNotificationData;
  additionalData?: Record<string, any>;
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  timestamp: string;
  userId: number;
  notificationType: NotificationType;
  messageLength: number;
  deliveryMethod: 'whatsapp' | 'sms' | 'email';
  householdHeads?: FamilyMember[];
}

export interface NotificationTemplate {
  type: NotificationType;
  priority: NotificationPriority;
  template: string;
  variables: string[];
  description: string;
}

export interface NotificationStats {
  totalSent: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  successRate: number;
  lastSent?: Date;
}