import { NotificationTemplate, NotificationType, NotificationPriority, TaskNotificationData } from '../types/Notification';

/**
 * Servicio de plantillas de notificaciones familiares
 * Maneja la generación de mensajes personalizados para diferentes tipos de notificaciones del hogar
 */
export class NotificationTemplateService {
  
  private static templates: NotificationTemplate[] = [
    // Plantillas para tareas asignadas
    {
      type: 'tarea_asignada',
      priority: 'media',
      template: '🏠 ¡Hola {memberName}! Te han asignado una nueva tarea: "{taskTitle}" en la categoría {taskCategory}. {dueDate} {reward} ¡Gracias por ayudar en casa! 💪',
      variables: ['memberName', 'taskTitle', 'taskCategory', 'dueDate', 'reward'],
      description: 'Notificación cuando se asigna una nueva tarea a un miembro de la familia'
    },
    {
      type: 'tarea_asignada',
      priority: 'alta',
      template: '🚨 ¡{memberName}! TAREA URGENTE: "{taskTitle}" - {taskCategory}. {dueDate} {reward} ¡Tu familia cuenta contigo! 🏠',
      variables: ['memberName', 'taskTitle', 'taskCategory', 'dueDate', 'reward'],
      description: 'Notificación urgente para tareas de alta prioridad'
    },

    // Plantillas para tareas completadas
    {
      type: 'tarea_completada',
      priority: 'baja',
      template: '🎉 ¡Excelente trabajo, {memberName}! Has completado "{taskTitle}". {reward} ¡La familia está orgullosa de ti! 👏',
      variables: ['memberName', 'taskTitle', 'reward'],
      description: 'Felicitación por completar una tarea'
    },

    // Plantillas para recordatorios
    {
      type: 'recordatorio_tarea',
      priority: 'media',
      template: '⏰ Recordatorio amigable: {memberName}, tienes pendiente "{taskTitle}" ({taskCategory}). {dueDate} ¡No olvides que tu familia cuenta contigo! 🏠',
      variables: ['memberName', 'taskTitle', 'taskCategory', 'dueDate'],
      description: 'Recordatorio suave para tareas pendientes'
    },

    // Plantillas para tareas vencidas
    {
      type: 'tarea_vencida',
      priority: 'alta',
      template: '⚠️ {memberName}, la tarea "{taskTitle}" ({taskCategory}) ya venció. ¿Necesitas ayuda para completarla? ¡Hablemos en familia! 💬',
      variables: ['memberName', 'taskTitle', 'taskCategory'],
      description: 'Notificación para tareas que han vencido'
    },

    // Plantillas para felicitaciones
    {
      type: 'felicitacion',
      priority: 'baja',
      template: '🌟 ¡{memberName}, eres increíble! Has completado {completedTasks} tareas esta semana. ¡Sigue así, campeón/campeona de la casa! 🏆',
      variables: ['memberName', 'completedTasks'],
      description: 'Felicitación por buen desempeño en las tareas'
    },

    // Plantillas para reuniones familiares
    {
      type: 'reunion_familiar',
      priority: 'media',
      template: '👨‍👩‍👧‍👦 Recordatorio: Reunión familiar hoy a las {time} para revisar las tareas de la semana y planificar actividades. ¡Nos vemos en {location}! 💕',
      variables: ['time', 'location'],
      description: 'Recordatorio para reuniones familiares'
    },

    // Plantillas para emergencias del hogar
    {
      type: 'emergencia_hogar',
      priority: 'urgente',
      template: '🚨 ATENCIÓN FAMILIA: {emergencyType} en casa. {details} Por favor, {action}. Mantengámonos unidos y seguros. 🏠',
      variables: ['emergencyType', 'details', 'action'],
      description: 'Notificación para emergencias del hogar'
    },

    // Plantillas para recordatorios generales
    {
      type: 'recordatorio_general',
      priority: 'baja',
      template: '📝 Recordatorio familiar: {message} ¡Gracias por mantener nuestro hogar organizado! 🏠💕',
      variables: ['message'],
      description: 'Recordatorios generales para la familia'
    }
  ];

  /**
   * Obtiene una plantilla específica por tipo y prioridad
   */
  static getTemplate(type: NotificationType, priority: NotificationPriority): NotificationTemplate | null {
    return this.templates.find(template => 
      template.type === type && template.priority === priority
    ) || this.templates.find(template => template.type === type) || null;
  }

  /**
   * Genera un mensaje personalizado basado en los datos de la tarea
   */
  static generateTaskMessage(type: NotificationType, priority: NotificationPriority, taskData: TaskNotificationData): string {
    const template = this.getTemplate(type, priority);
    
    if (!template) {
      return `Notificación: ${type} - ${taskData.taskTitle}`;
    }

    let message = template.template;

    // Reemplazar variables de la tarea con valores por defecto si no están disponibles
    message = message.replace('{memberName}', taskData.assignedMemberName || taskData.assignedTo || 'Miembro de la familia');
    message = message.replace('{taskTitle}', taskData.taskTitle || 'Tarea sin título');
    message = message.replace('{taskCategory}', this.getCategoryDisplayName(taskData.taskCategory || taskData.category || 'general'));
    message = message.replace('{createdByName}', taskData.createdByName || 'Sistema');

    // Formatear fecha de vencimiento
    if (taskData.dueDate) {
      const dueDateStr = this.formatDueDate(taskData.dueDate);
      message = message.replace('{dueDate}', dueDateStr);
    } else {
      message = message.replace('{dueDate}', '');
    }

    // Agregar información de recompensa
    if (taskData.reward) {
      message = message.replace('{reward}', `🎁 Recompensa: ${taskData.reward}. `);
    } else {
      message = message.replace('{reward}', '');
    }

    return message.trim();
  }

  /**
   * Genera un mensaje personalizado con datos adicionales
   */
  static generateCustomMessage(type: NotificationType, priority: NotificationPriority, data: Record<string, any>): string {
    const template = this.getTemplate(type, priority);
    
    if (!template) {
      return `Notificación: ${type}`;
    }

    let message = template.template;

    // Reemplazar todas las variables disponibles
    template.variables.forEach(variable => {
      const value = data[variable] || '';
      message = message.replace(`{${variable}}`, value);
    });

    return message.trim();
  }

  /**
   * Obtiene todas las plantillas disponibles
   */
  static getAllTemplates(): NotificationTemplate[] {
    return [...this.templates];
  }

  /**
   * Obtiene plantillas por tipo
   */
  static getTemplatesByType(type: NotificationType): NotificationTemplate[] {
    return this.templates.filter(template => template.type === type);
  }

  /**
   * Convierte el nombre técnico de categoría a nombre amigable
   */
  private static getCategoryDisplayName(category: string): string {
    const categoryNames: Record<string, string> = {
      'limpieza': 'Limpieza',
      'cocina': 'Cocina',
      'lavanderia': 'Lavandería',
      'jardin': 'Jardín',
      'mantenimiento': 'Mantenimiento',
      'organizacion': 'Organización',
      'mascotas': 'Mascotas',
      'compras': 'Compras',
      'otros': 'Otros'
    };
    
    return categoryNames[category] || category;
  }

  /**
   * Formatea la fecha de vencimiento de manera amigable
   */
  private static formatDueDate(dueDate: string | Date): string {
    const date = typeof dueDate === 'string' ? new Date(dueDate) : dueDate;
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `⚠️ Venció hace ${Math.abs(diffDays)} día(s).`;
    } else if (diffDays === 0) {
      return '🚨 ¡Vence HOY!';
    } else if (diffDays === 1) {
      return '⏰ Vence mañana.';
    } else if (diffDays <= 7) {
      return `📅 Vence en ${diffDays} días.`;
    } else {
      return `📅 Vence el ${date.toLocaleDateString('es-ES')}.`;
    }
  }
}