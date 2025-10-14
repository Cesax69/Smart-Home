import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

export interface Notification {
  id: string;
  type: 'task_completed' | 'task_assigned' | 'task_reminder' | 'system_alert';
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

  private notificationsServiceUrl = 'http://localhost:3004';
  private currentUserId: string | null = null; // This should come from auth service

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private authService: AuthService
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
    
    if (this.currentUserId) {
      this.connectToNotificationService();
    } else {
      console.warn('⚠️ No user ID found, notifications will not work');
      // Subscribe to auth changes to connect when user logs in
      this.authService.currentUser$.subscribe((user: User | null) => {
        if (user && user.id) {
          this.currentUserId = user.id.toString();
          console.log('👤 User logged in, connecting to notifications:', this.currentUserId);
          this.connectToNotificationService();
        } else if (!user) {
          console.log('👤 User logged out, disconnecting from notifications');
          this.disconnect();
        }
      });
    }
    
    // Load stored notifications from localStorage FIRST
    this.loadStoredNotifications();
  }

  /**
   * Get current user ID from localStorage or auth service
   */
  private getCurrentUserId(): string | null {
    try {
      // First try to get from auth service
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.id) {
        console.log('📱 User from AuthService:', currentUser);
        return currentUser.id.toString();
      }
      
      // Fallback: try to get from localStorage with correct key
      const storedUser = localStorage.getItem('smart_home_user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        console.log('📱 User from localStorage:', user);
        return user.id ? user.id.toString() : null;
      }
      
      console.log('⚠️ No user found in AuthService or localStorage');
      return null;
    } catch (error) {
      console.error('❌ Error getting current user ID:', error);
      return null;
    }
  }

  /**
   * Connect to the notifications service WebSocket
   */
  private connectToNotificationService(): void {
    try {
      console.log('🔌 Attempting to connect to notifications service at:', this.notificationsServiceUrl);
      
      this.socket = io(this.notificationsServiceUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
        forceNew: true
      });

      this.socket.on('connect', () => {
        console.log('✅ Connected to notifications service');
        this.connectionStatusSubject.next(true);
        
        // Join user-specific room for notifications
        if (this.currentUserId) {
          this.socket?.emit('join_user_room', { userId: this.currentUserId });
          console.log(`👤 Joined user room for user ${this.currentUserId}`);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ Disconnected from notifications service. Reason:', reason);
        this.connectionStatusSubject.next(false);
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
        this.connectionStatusSubject.next(false);
      });

      this.socket.on('connection_confirmed', (data) => {
        console.log('✅ Connection confirmed:', data);
      });

      // Listen for new notifications
      this.socket.on('new_notification', (notification: any) => {
        console.log('📱 New notification received:', notification);
        this.addNotification(notification);
      });

      // Listen for notification updates
      this.socket.on('notification_update', (data: any) => {
        console.log('🔄 Notification update received:', data);
        this.updateNotification(data.notificationId, data.updates);
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
      userId: notificationData.data?.userId || this.currentUserId || 'guest',
      metadata: notificationData.metadata || notificationData.data?.metadata
    };

    const currentNotifications = this.notificationsSubject.value;
    const updatedNotifications = [notification, ...currentNotifications];
    
    // Keep only the last 50 notifications
    if (updatedNotifications.length > 50) {
      updatedNotifications.splice(50);
    }

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();

    // Show browser notification if permission is granted
    this.showBrowserNotification(notification);
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

    this.notificationsSubject.next(updatedNotifications);
    this.updateUnreadCount();
    this.saveNotificationsToStorage();
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
    this.saveNotificationsToStorage();

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
    this.saveNotificationsToStorage();

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
    this.saveNotificationsToStorage();

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
      const response = await fetch(`${this.notificationsServiceUrl}/notifications/${this.currentUserId}?limit=${limit}&offset=${offset}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const backendNotifications = result.data.map((notif: any) => ({
            id: notif.notification_id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            timestamp: new Date(notif.created_at),
            read: notif.is_read,
            userId: notif.user_id.toString(),
            metadata: notif.metadata
          }));

          // Merge with existing notifications, avoiding duplicates
          const currentNotifications = this.notificationsSubject.value;
          const mergedNotifications = this.mergeNotifications(currentNotifications, backendNotifications);
          
          this.notificationsSubject.next(mergedNotifications);
          this.updateUnreadCount();
          this.saveNotificationsToStorage();
          
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
      const response = await fetch(`${this.notificationsServiceUrl}/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
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
      const response = await fetch(`${this.notificationsServiceUrl}/notifications/user/${this.currentUserId}/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        }
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
      const response = await fetch(`${this.notificationsServiceUrl}/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
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
      const response = await fetch(`${this.notificationsServiceUrl}/notifications/${this.currentUserId}/unread-count`);
      
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

  /**
   * Clear all notifications
   */
  clearAllNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.saveNotificationsToStorage();
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
    if ('Notification' in window && Notification.permission === 'granted') {
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
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  /**
   * Check if notifications are supported and permitted
   */
  isNotificationSupported(): boolean {
    return 'Notification' in window && Notification.permission === 'granted';
  }

  /**
   * Save notifications to localStorage
   */
  private saveNotificationsToStorage(): void {
    try {
      const notifications = this.notificationsSubject.value;
      localStorage.setItem('smart_home_notifications', JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  /**
   * Load notifications from localStorage
   */
  private loadStoredNotifications(): void {
    try {
      const stored = localStorage.getItem('smart_home_notifications');
      if (stored) {
        const notifications: Notification[] = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const processedNotifications = notifications.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        
        this.notificationsSubject.next(processedNotifications);
        this.updateUnreadCount();
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
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

  /**
   * Cleanup on service destroy
   */
  ngOnDestroy(): void {
    this.disconnect();
  }
}