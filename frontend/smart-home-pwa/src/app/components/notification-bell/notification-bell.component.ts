import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatMenuModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule
  ],
  template: `
    <button 
      mat-icon-button 
      [matMenuTriggerFor]="notificationMenu"
      matTooltip="Notificaciones"
      class="notification-bell">
      <mat-icon 
        [matBadge]="unreadCount" 
        [matBadgeHidden]="unreadCount === 0"
        matBadgeColor="warn"
        matBadgeSize="small">
        {{ unreadCount > 0 ? 'notifications_active' : 'notifications' }}
      </mat-icon>
    </button>

    <mat-menu #notificationMenu="matMenu" class="notification-menu">
      <div class="notification-header" (click)="$event.stopPropagation()">
        <h3>Notificaciones</h3>
        <div class="header-actions">
          <button 
            mat-icon-button 
            *ngIf="unreadCount > 0"
            (click)="markAllAsRead()"
            matTooltip="Marcar todas como leídas">
            <mat-icon>done_all</mat-icon>
          </button>
          <button 
            mat-icon-button 
            (click)="clearAllNotifications()"
            matTooltip="Limpiar todas">
            <mat-icon>clear_all</mat-icon>
          </button>
          <div class="connection-status">
            <mat-icon 
              [class]="isConnected ? 'connected' : 'disconnected'"
              [matTooltip]="isConnected ? 'Conectado' : 'Desconectado'">
              {{ isConnected ? 'wifi' : 'wifi_off' }}
            </mat-icon>
          </div>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="notification-list" (click)="$event.stopPropagation()">
        <div *ngIf="notifications.length === 0" class="no-notifications">
          <mat-icon>notifications_none</mat-icon>
          <p>No hay notificaciones</p>
        </div>

        <mat-list *ngIf="notifications.length > 0">
          <mat-list-item 
            *ngFor="let notification of notifications; trackBy: trackByNotificationId"
            [class.unread]="!notification.read"
            class="notification-item">
            
            <div class="notification-content">
              <div class="notification-header-item">
                <mat-icon class="notification-type-icon">
                  {{ getNotificationIcon(notification.type) }}
                </mat-icon>
                <span class="notification-title">{{ notification.title }}</span>
                <span class="notification-time">{{ getRelativeTime(notification.timestamp) }}</span>
              </div>
              
              <p class="notification-message">{{ notification.message }}</p>
              
              <div class="notification-actions">
                <button 
                  mat-icon-button 
                  *ngIf="!notification.read"
                  (click)="markAsRead(notification.id)"
                  matTooltip="Marcar como leída">
                  <mat-icon>done</mat-icon>
                </button>
                <button 
                  mat-icon-button 
                  (click)="deleteNotification(notification.id)"
                  matTooltip="Eliminar">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
          </mat-list-item>
        </mat-list>
      </div>

      <mat-divider *ngIf="notifications.length > 0"></mat-divider>
      
      <div class="notification-footer" (click)="$event.stopPropagation()">
        <button mat-button (click)="goToAllNotifications()">
          <mat-icon>open_in_new</mat-icon>
          Ver todas las notificaciones
        </button>
        <button mat-button (click)="requestNotificationPermission()" *ngIf="!isNotificationPermissionGranted">
          <mat-icon>notifications</mat-icon>
          Habilitar notificaciones del navegador
        </button>
        <button mat-button (click)="reconnectToService()" *ngIf="!isConnected">
          <mat-icon>refresh</mat-icon>
          Reconectar
        </button>
      </div>
    </mat-menu>
  `,
  styles: [`
.notification-bell mat-icon {
  color: #fff !important;
}


    .notification-bell {
      position: relative;
    }

    .notification-menu {
      width: 400px;
      max-width: 90vw;
    }

    .notification-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      background-color: #f5f5f5;
    }

    .notification-header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .connection-status .connected {
      color: #4caf50;
    }

    .connection-status .disconnected {
      color: #f44336;
    }

    .notification-list {
      max-height: 400px;
      overflow-y: auto;
    }

    .no-notifications {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
      color: #ffffffff;
    }

    .no-notifications mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .notification-item {
      border-left: 4px solid transparent;
      transition: all 0.2s ease;
    }

    .notification-item.unread {
      background-color: #f3f4f6;
      border-left-color: #2196f3;
    }

    .notification-item:hover {
      background-color: #e3f2fd;
    }

    .notification-content {
      width: 100%;
      padding: 8px 0;
    }

    .notification-header-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .notification-type-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #666;
    }

    .notification-title {
      font-weight: 500;
      flex: 1;
    }

    .notification-time {
      font-size: 12px;
      color: #666;
    }

    .notification-message {
      margin: 4px 0;
      font-size: 14px;
      color: #333;
      line-height: 1.4;
    }

    .notification-actions {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 8px;
    }

    .notification-actions button {
      width: 32px;
      height: 32px;
      line-height: 32px;
    }

    .notification-actions mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .notification-footer {
      padding: 8px 16px;
      background-color: #fafafa;
    }

    .notification-footer button {
      width: 100%;
      justify-content: flex-start;
    }

    .notification-footer mat-icon {
      margin-right: 8px;
    }
  `]
})
export class NotificationBellComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount: number = 0;
  isConnected: boolean = false;
  isNotificationPermissionGranted: boolean = false;

  private subscriptions: Subscription[] = [];
  constructor(private router: Router, private notificationService: NotificationService) { }

  ngOnInit(): void {
    // Suscribirse a cambios de conexión
    this.subscriptions.push(
      this.notificationService.connectionStatus$.subscribe(status => {
        this.isConnected = status;
      })
    );

    // Suscribirse a la lista de notificaciones
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(items => {
        this.notifications = items;
        this.unreadCount = items.filter(n => !n.read).length;
      })
    );

    // Revisar permiso de notificaciones del navegador
    this.checkNotificationPermission();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }

  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId);
  }

  clearAllNotifications(): void {
    if (confirm('¿Estás seguro de que quieres eliminar todas las notificaciones?')) {
      this.notificationService.clearAllNotifications();
    }
  }

  async requestNotificationPermission(): Promise<void> {
    const granted = await this.notificationService.requestNotificationPermission();
    this.isNotificationPermissionGranted = granted;
  }

  reconnectToService(): void {
    this.notificationService.reconnect();
  }

  private checkNotificationPermission(): void {
    this.isNotificationPermissionGranted = this.notificationService.isNotificationSupported();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'task_completed':
        return 'task_alt';
      case 'task_assigned':
        return 'assignment';
      case 'task_reminder':
        return 'schedule';
      case 'system_alert':
        return 'warning';
      default:
        return 'info';
    }
  }

  getRelativeTime(timestamp: number | Date): string {
    // Simple relative time helper compatible con number o Date
    const tsMs = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
    const diffMs = Date.now() - tsMs;
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'justo ahora';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h`;
    const days = Math.floor(hours / 24);
    return `${days} d`;
  }

  goToAllNotifications(): void {
    this.router.navigate(['/notifications']);
  }
}