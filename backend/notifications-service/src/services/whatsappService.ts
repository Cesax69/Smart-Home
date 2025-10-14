/**
 * Servicio de WhatsApp para comunicación familiar
 * Maneja la lógica de envío de mensajes por WhatsApp con plantillas familiares
 */

import { 
  NotificationRequest, 
  NotificationResponse, 
  NotificationType, 
  NotificationPriority,
  TaskNotificationData,
  FamilyMember,
  NotificationStats
} from '../types/Notification';
import { NotificationTemplateService } from './notificationTemplateService';

// Datos de miembros de la familia
const mockFamilyMembers: FamilyMember[] = [
  { id: 1, name: 'Papá', role: 'padre', phoneNumber: '+1234567890' },
  { id: 2, name: 'Mamá', role: 'madre', phoneNumber: '+1234567891' },
  { id: 3, name: 'Ana', role: 'hija', phoneNumber: '+1234567892' },
  { id: 4, name: 'Carlos', role: 'hijo', phoneNumber: '+1234567893' },
  { id: 5, name: 'Abuela Rosa', role: 'abuela', phoneNumber: '+1234567894' }
];

// Estadísticas de notificaciones
let notificationStats: NotificationStats = {
  totalSent: 0,
  byType: {
    'tarea_asignada': 0,
    'tarea_completada': 0,
    'tarea_actualizada': 0,
    'recordatorio_tarea': 0,
    'tarea_vencida': 0,
    'felicitacion': 0,
    'reunion_familiar': 0,
    'emergencia_hogar': 0,
    'recordatorio_general': 0
  },
  byPriority: {
    'baja': 0,
    'media': 0,
    'alta': 0,
    'urgente': 0
  },
  successRate: 100
};

export class WhatsAppService {
  /**
   * Envía una notificación familiar personalizada
   * @param request - Datos de la notificación familiar
   * @returns Respuesta del servicio
   */
  static async sendFamilyNotification(request: NotificationRequest): Promise<NotificationResponse> {
    const timestamp = new Date().toISOString();
    const member = WhatsAppService.getFamilyMember(request.userId);
    
    let message: string;
    
    // Generar mensaje basado en el tipo de notificación
    if (request.taskData) {
      message = NotificationTemplateService.generateTaskMessage(
        request.type, 
        request.priority, 
        request.taskData
      );
    } else if (request.additionalData) {
      message = NotificationTemplateService.generateCustomMessage(
        request.type, 
        request.priority, 
        request.additionalData
      );
    } else if (request.message) {
      message = request.message;
    } else {
      message = `Notificación familiar: ${request.type}`;
    }

    // Actualizar estadísticas
    WhatsAppService.updateStats(request.type, request.priority);

    // Logging detallado en consola
    console.log(`\n🏠 ================================`);
    console.log(`👨‍👩‍👧‍👦 NOTIFICACIÓN FAMILIAR`);
    console.log(`🏠 ================================`);
    console.log(`📱 Destinatario: ${member?.name || 'Usuario ' + request.userId} (${member?.role || 'miembro'})`);
    console.log(`📞 Teléfono: ${member?.phoneNumber || 'No disponible'}`);
    console.log(`🏷️  Tipo: ${request.type}`);
    console.log(`⚡ Prioridad: ${request.priority}`);
    console.log(`💬 Mensaje: "${message}"`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log(`📏 Longitud: ${message.length} caracteres`);
    console.log(`🎯 Estado: Mensaje enviado exitosamente`);
    console.log(`🏠 ================================\n`);

    // Simular delay basado en prioridad
    const delay = WhatsAppService.getDelayByPriority(request.priority);
    await new Promise(resolve => setTimeout(resolve, delay));

    return {
      success: true,
      message: "Notificación familiar enviada exitosamente",
      timestamp,
      userId: request.userId,
      notificationType: request.type,
      messageLength: message.length,
      deliveryMethod: 'whatsapp'
    };
  }

  /**
   * Método legacy para compatibilidad con versiones anteriores
   * @param userId - ID del usuario destinatario
   * @param message - Mensaje a enviar
   * @returns Respuesta del servicio
   */
  static async sendMessage(userId: number, message: string): Promise<NotificationResponse> {
    const request: NotificationRequest = {
      userId,
      type: 'recordatorio_general',
      priority: 'media',
      message
    };

    return this.sendFamilyNotification(request);
  }

  /**
   * Obtiene información de un miembro de la familia
   */
  static getFamilyMember(userId: number): FamilyMember | null {
    return mockFamilyMembers.find(member => member.id === userId) || null;
  }

  /**
   * Obtiene todos los miembros de la familia
   */
  static getAllFamilyMembers(): FamilyMember[] {
    return [...mockFamilyMembers];
  }

  /**
   * Actualiza las estadísticas de notificaciones
   */
  private static updateStats(type: NotificationType, priority: NotificationPriority): void {
    notificationStats.totalSent++;
    notificationStats.byType[type]++;
    notificationStats.byPriority[priority]++;
    notificationStats.lastSent = new Date();
  }

  /**
   * Obtiene estadísticas de notificaciones
   */
  static getNotificationStats(): NotificationStats {
    return { ...notificationStats };
  }

  /**
   * Obtiene delay basado en prioridad
   */
  private static getDelayByPriority(priority: NotificationPriority): number {
    const delays = {
      'urgente': 50,   // Muy rápido para emergencias
      'alta': 100,     // Rápido para tareas importantes
      'media': 200,    // Normal
      'baja': 300      // Más lento para notificaciones no críticas
    };
    
    return delays[priority] || 200;
  }

  /**
   * Valida el formato de la notificación familiar
   * @param data - Datos de la notificación
   * @returns true si es válido, false en caso contrario
   */
  static validateNotificationData(data: any): data is NotificationRequest {
    if (!data || typeof data !== 'object') {
      return false;
    }

    // Validaciones básicas
    if (typeof data.userId !== 'number' || data.userId <= 0) {
      return false;
    }

    if (!data.type || typeof data.type !== 'string') {
      return false;
    }

    if (!data.priority || typeof data.priority !== 'string') {
      return false;
    }

    // Validar tipos permitidos
    const validTypes: NotificationType[] = [
      'tarea_asignada', 'tarea_completada', 'tarea_actualizada', 'recordatorio_tarea', 'tarea_vencida',
      'felicitacion', 'reunion_familiar', 'emergencia_hogar', 'recordatorio_general'
    ];

    const validPriorities: NotificationPriority[] = ['baja', 'media', 'alta', 'urgente'];

    if (!validTypes.includes(data.type as NotificationType)) {
      return false;
    }

    if (!validPriorities.includes(data.priority as NotificationPriority)) {
      return false;
    }

    // Si hay mensaje personalizado, validar longitud
    if (data.message && (typeof data.message !== 'string' || data.message.length > 1000)) {
      return false;
    }

    return true;
  }

  /**
   * Valida el formato legacy de notificación (para compatibilidad)
   * @param data - Datos de la notificación legacy
   * @returns true si es válido, false en caso contrario
   */
  static validateLegacyNotificationData(data: any): boolean {
    return (
      data &&
      typeof data.userId === 'number' &&
      typeof data.message === 'string' &&
      data.message.trim().length > 0 &&
      data.userId > 0
    );
  }

  /**
   * Obtiene información del servicio familiar
   * @returns Información del servicio de WhatsApp familiar
   */
  static getServiceInfo() {
    return {
      service: "Family WhatsApp Notification Service",
      version: "2.0.0",
      description: "Servicio para notificaciones familiares por WhatsApp",
      capabilities: [
        "Notificaciones familiares personalizadas",
        "Plantillas de mensajes por tipo de notificación",
        "Gestión de miembros de la familia",
        "Estadísticas de notificaciones",
        "Priorización de mensajes",
        "Logging detallado en consola",
        "Compatibilidad con versiones anteriores"
      ],
      supportedNotificationTypes: [
        "tarea_asignada", "tarea_completada", "recordatorio_tarea", "tarea_vencida",
        "felicitacion", "reunion_familiar", "emergencia_hogar", "recordatorio_general"
      ],
      supportedPriorities: ["baja", "media", "alta", "urgente"],
      maxMessageLength: 1000,
      familyMembers: mockFamilyMembers.length,
      supportedMethods: ["POST /notify", "POST /notify/family"]
    };
  }
}