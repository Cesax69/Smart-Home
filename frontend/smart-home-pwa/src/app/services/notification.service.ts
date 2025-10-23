import { Injectable, Inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';
import { User } from '../models/user.model';

export interface Notification {
  id: string;
  type: 'task_completed' | 'task_assigned' | 'task_reminder' | 'system_alert' | 'comment_added' | 'task_updated';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId: string;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private socket: Socket | null = null;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();

  private readonly API_BASE: string = environment.services.notifications || environment.apiUrl;
  private readonly SOCKET_URL: string = (environment as any).notificationsSocketUrl || 'http://localhost:3004';
  private currentUserId: string | null = null; // This should come from auth service

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService,
    private ngZone: NgZone
  ) {
    console.log('🚀 NotificationService initialized');

    // Only initialize if we're in the browser
    if (isPlatformBrowser(this.platformId)) {
      this.initializeService();
    }
  }

  private initializeService(): void {
    this.currentUserId = this.getCurrentUserId();
    console.log('👤 Current user ID:', this.currentUserId);

    // Suscribir SIEMPRE a cambios de autenticación (login/logout/cambio de usuario)
    this.authService.currentUser$.subscribe((user: User | null) => {
      const newUserId = user?.id ? user.id.toString() : null;

      if (!newUserId) {
        // Logout: desconectar y limpiar estado
        if (this.currentUserId !== null) {
          console.log('👤 User logged out, disconnecting and clearing notifications');
        }
        this.currentUserId = null;
        this.disconnect();
        this.notificationsSubject.next([]);
        this.updateUnreadCount();
        return;
      }

      if (this.currentUserId !== newUserId) {
        // Cambio de usuario o primer login: limpiar y reconectar
        console.log('👤 Switching user, reconnecting notifications:', newUserId);
        this.currentUserId = newUserId;
        // Evitar mezcla de notificaciones entre sesiones
        this.notificationsSubject.next([]);
        this.updateUnreadCount();
        // Reunirse a la sala correcta
        this.disconnect();
        this.connectToNotificationService();
        this.loadNotificationsFromBackend().catch(err => console.error('❌ Error loading notifications after switch:', err));
      } else {
        // Mismo usuario: asegurar conexión y cargar si fuese necesario
        if (!this.isConnected()) {
          this.connectToNotificationService();
          this.loadNotificationsFromBackend().catch(err => console.error('❌ Error loading notifications after reconnect:', err));
        }
      }
    });

    // Si ya hay usuario al iniciar el servicio, conectar y cargar inmediatamente
    if (this.currentUserId) {
      this.connectToNotificationService();
      this.loadNotificationsFromBackend().catch(err => console.error('❌ Error initial loading notifications:', err));
    } else {
      console.warn('⚠️ No user ID found at init; waiting for login to connect');
    }
  }

  /**
   * Get current user ID from auth service
   */
  private getCurrentUserId(): string | null {
    try {
      // Get from auth service only
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.id) {
        console.log('📱 User from AuthService:', currentUser);
        return currentUser.id.toString();
      }
      console.log('⚠️ No user found in AuthService');
      return null;
    } catch (error) {
      console.error('❌ Error getting current user ID:', error);
      return null;
    }
  }

  private getAuthHeaders(contentTypeJson: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.authService.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (contentTypeJson) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  /**
   * Connect to the notifications service WebSocket
   */
  private connectToNotificationService(): void {
    try {
      console.log('🔌 Attempting to connect to notifications service at:', this.SOCKET_URL);

      this.socket = io(this.SOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to notifications service');
        this.ngZone.run(() => {
          this.connectionStatusSubject.next(true);

          // Join user-specific room for notifications
          if (this.currentUserId) {
            this.socket?.emit('join_user_room', { userId: this.currentUserId });
            console.log(`👤 Joined user room for user ${this.currentUserId}`);
          }
        });
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from notifications service. Reason:', reason);
        this.ngZone.run(() => this.connectionStatusSubject.next(false));
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        this.ngZone.run(() => this.connectionStatusSubject.next(false));
      });

      this.socket.on('connection_confirmed', (data) => {
        console.log('✅ Connection confirmed:', data);
      });

      // Listen for new notifications
      this.socket.on('new_notification', (notification: any) => {
        console.log('📱 New notification received:', notification);
        this.ngZone.run(() => this.addNotification(notification));
      });

      // Listen for notification updates
      this.socket.on('notification_update', (data: any) => {
        console.log('🔄 Notification update received:', data);
        this.ngZone.run(() => this.updateNotification(data.notificationId, data.updates));
      });
    } catch (error) {
      console.error('❌ Error connecting to notifications service:', error);
      this.connectionStatusSubject.next(false);
    }
  }

  /**
   * Add a new notification
   */
  private addNotification(notificationData: any): void {
    const notification: Notification = {
      id: notificationData.id || this.generateId(),
      type: notificationData.type || 'system_alert',
      title: notificationData.title || 'Nueva notificación',
      message: notificationData.message || notificationData.data?.message || '',
      timestamp: new Date(notificationData.timestamp || Date.now()),
      read: false,
      userId: notificationData.userId || notificationData.data?.userId || this.currentUserId || 'guest',
      metadata: notificationData.metadata || notificationData.data?.metadata
    };

    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = [notification, ...currentNotifications];

    // Keep only the last 50 notifications
    if (updatedNotifications.length > 50) {
      updatedNotifications.splice(50);
    }

    this.ngZone.run(() => {
      this.notificationsSubject.next(updatedNotifications);
      this.updateUnreadCount();

      // Show browser notification if permission is granted
      this.showBrowserNotification(notification);
    });
  }

  /**
   * Update an existing notification
   */
  private updateNotification(notificationId: string, updates: Partial<Notification>): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, ...updates }
        : notification
    );

    this.ngZone.run(() => {
      this.notificationsSubject.next(updatedNotifications);
      this.updateUnreadCount();
    });
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === notificationId
        ? { ...notification, read: true }
        : notification
    );

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();

    // Sync with backend database
    this.syncMarkAsReadWithBackend(notificationId);
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.map(notification =>
      ({ ...notification, read: true })
    );

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();

    // Sync with backend database
    this.syncMarkAllAsReadWithBackend();
  }

  /**
   * Delete notification
   */
  deleteNotification(notificationId: string): void {
    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = currentNotifications.filter(
      notification => notification.id !== notificationId
    );

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();

    // Sync with backend database
    this.syncDeleteWithBackend(notificationId);
  }

  /**
   * Load notifications from backend database
   */
  async loadNotificationsFromBackend(limit: number = 20, offset: number = 0): Promise<void> {
    if (!this.currentUserId) {
      console.warn('⚠️ No user ID available for loading notifications');
      return;
    }

    try {
      const response = await fetch(`${this.API_BASE}/notifications/${this.currentUserId}?limit=${limit}&offset=${offset}`, {
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const backendNotifications = result.data.map((notif: any) => ({
            id: notif.notification_id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            timestamp: new Date(notif.created_at || notif.timestamp || Date.now()),
            read: Array.isArray(notif.readBy) ? notif.readBy.includes(parseInt(this.currentUserId || '0')) : false,
            userId: (notif.user_id ?? parseInt(this.currentUserId || '0')).toString(),
            metadata: notif.metadata
          }));

          // Merge with existing notifications, avoiding duplicates
          const currentNotifications = this.notificationsSubject.value;
          const mergedNotifications = this.mergeNotifications(currentNotifications, backendNotifications);

          this.ngZone.run(() => {
            this.notificationsSubject.next(mergedNotifications);
            this.updateUnreadCount();
          });

          console.log(`📋 Loaded ${backendNotifications.length} notifications from backend`);
        }
      }
    } catch (error) {
      console.error('❌ Error loading notifications from backend:', error);
    }
  }

  /**
   * Sync mark as read with backend
   */
  private async syncMarkAsReadWithBackend(notificationId: string): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const response = await fetch(`${this.API_BASE}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({ userId: parseInt(this.currentUserId) })
      });

      if (response.ok) {
        console.log(`✅ Notification ${notificationId} marked as read in backend`);
      }
    } catch (error) {
      console.error('❌ Error syncing mark as read with backend:', error);
    }
  }

  /**
   * Sync mark all as read with backend
   */
  private async syncMarkAllAsReadWithBackend(): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const response = await fetch(`${this.API_BASE}/notifications/user/${this.currentUserId}/read-all`, {
        method: 'PUT',
        headers: this.getAuthHeaders(true)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ ${result.data?.updatedCount || 0} notifications marked as read in backend`);
      }
    } catch (error) {
      console.error('❌ Error syncing mark all as read with backend:', error);
    }
  }

  /**
   * Sync delete with backend
   */
  private async syncDeleteWithBackend(notificationId: string): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const response = await fetch(`${this.API_BASE}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify({ userId: parseInt(this.currentUserId) })
      });

      if (response.ok) {
        console.log(`✅ Notification ${notificationId} deleted from backend`);
      }
    } catch (error) {
      console.error('❌ Error syncing delete with backend:', error);
    }
  }

  /**
   * Get unread count from backend
   */
  async getUnreadCountFromBackend(): Promise<number> {
    if (!this.currentUserId) return 0;

    try {
      const response = await fetch(`${this.API_BASE}/notifications/${this.currentUserId}/unread-count`, {
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          return result.data.unreadCount || 0;
        }
      }
    } catch (error) {
      console.error('❌ Error getting unread count from backend:', error);
    }

    return 0;
  }

  /**
   * Merge notifications avoiding duplicates
   */
  private mergeNotifications(current: Notification[], backend: Notification[]): Notification[] {
    const merged = [...current];

    backend.forEach(backendNotif => {
      const exists = merged.find(notif => notif.id === backendNotif.id);
      if (!exists) {
        merged.push(backendNotif);
      }
    });

    // Sort by timestamp (newest first) and limit to 50
    return merged
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50);
  }

  async clearAllNotifications(): Promise<void> {
    if (this.currentUserId) {
      try {
        const response = await fetch(`${this.API_BASE}/notifications/user/${this.currentUserId}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders(true)
        });
        if (response.ok) {
          const result = await response.json().catch(() => null);
          console.log(`✅ Notificaciones eliminadas en backend para usuario ${this.currentUserId}`, result?.data || {});
        } else {
          const text = await response.text().catch(() => '');
          console.warn('❌ Error borrando todas las notificaciones en backend:', text);
        }
      } catch (error) {
        console.error('❌ Error sincronizando borrado masivo con backend:', error);
      }
    }
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
  }

  /**
   * Update unread count
   */
  private updateUnreadCount(): void {
    const unreadCount = this.notificationsSubject.value.filter(n => !n.read).length;
    this.unreadCountSubject.next(unreadCount);
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: Notification): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/icon-192x192.png',
        badge: '/assets/icons/icon-72x72.png',
        tag: notification.id,
        requireInteraction: false,
        silent: false
      });

      browserNotification.onclick = () => {
        window.focus();
        this.markAsRead(notification.id);
        browserNotification.close();
      };

      // Auto close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) return false;
    if (typeof Notification !== 'undefined') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Check if notifications are supported and permitted
   */
  isNotificationSupported(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return typeof Notification !== 'undefined' && Notification.permission === 'granted';
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Set current user ID (should be called from auth service)
   */
  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;

    // Rejoin user room if socket is connected
    if (this.socket?.connected && this.currentUserId) {
      this.socket.emit('join_user_room', { userId: this.currentUserId });
    }
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Manually reconnect to notification service
   */
  reconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
    this.connectToNotificationService();
  }

  /**
   * Disconnect from notification service
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionStatusSubject.next(false);
  }

  public async createNotification(payload: { userId: number; title: string; message: string; type?: string; metadata?: any }): Promise<boolean> {
    try {
      // Enviar SIEMPRE a la cola Redis para entrega centralizada
      const queuePayload = {
        type: payload.type || 'system_alert',
        channels: ['app'],
        data: {
          userId: payload.userId.toString(),
          message: payload.message,
          taskId: payload.metadata?.taskData?.taskId?.toString(),
          taskTitle: payload.metadata?.taskData?.taskTitle,
          metadata: payload.metadata
        },
        priority: 'low'
      };

      const response = await fetch(`${this.API_BASE}/notify/queue`, {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify(queuePayload),
      });

      const ok = response.ok;
      if (!ok) {
        const errorText = await response.text().catch(() => '');
        console.warn('Notificación no encolada correctamente:', errorText);
      }

      // No espejar localmente: la entrega vendrá por Socket.IO
      return ok;
    } catch (error) {
      console.error('❌ Error creando notificación en cola Redis:', error);
      // No agregar a estado local: evitar desincronización; confiar en Redis/WebSocket
      return false;
    }
  }

  // Nuevo: enviar notificación de prueba a /test del microservicio
  public async sendTestNotification(message: string = '🔔 Notificación de prueba desde el cliente'): Promise<boolean> {
    if (!this.currentUserId) {
      console.warn('⚠️ No hay usuario actual para enviar prueba');
      return false;
    }

    const payload = {
      userId: this.currentUserId,
      recipients: [this.currentUserId],
      type: 'system_alert',
      message
    };

    try {
      const response = await fetch(`${this.API_BASE}/test`, {
        method: 'POST',
        headers: this.getAuthHeaders(true),
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        console.warn('❌ Error enviando notificación de prueba:', text);
        return false;
      }

      console.log('✅ Notificación de prueba encolada');
      return true;
    } catch (error) {
      console.error('❌ Excepción enviando notificación de prueba:', error);
      return false;
    }
  }

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.disconnect();
  }
}
