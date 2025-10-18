import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { Router } from '@angular/router';
import { TaskService } from '../../features/task-management/services/task.service';

@Component({
  selector: 'app-notifications-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatListModule,
    MatDividerModule,
    MatTooltipModule,
    MatToolbarModule,
    MatChipsModule,
    MatMenuModule,
    MatSnackBarModule
  ],
  template: `
    <div class="notifications-container">
      <!-- Professional Header Layout -->
      <div class="notifications-header">
        <!-- Main Title Section -->
        <div class="header-main">
          <div class="title-section">
            <div class="notifications-title">
              <mat-icon class="notifications-icon">notifications_active</mat-icon>
              <h1>Centro de Notificaciones</h1>
            </div>
            <p class="notifications-subtitle">
              Gestiona todas tus notificaciones de manera eficiente
            </p>
          </div>
        </div>

        <!-- Status and User Info Section -->
        <div class="header-info">
          <div class="connection-status" [class.connected]="isConnected" [class.disconnected]="!isConnected">
            <mat-icon class="status-icon">{{ isConnected ? 'wifi' : 'wifi_off' }}</mat-icon>
            <span class="status-text">{{ isConnected ? 'Conectado' : 'Desconectado' }}</span>
          </div>

          <div class="user-info" *ngIf="currentUser">
            <div class="user-avatar">
              {{ (currentUser.firstName.charAt(0) || '') + (currentUser.lastName.charAt(0) || '') }}
            </div>
            <div class="user-details">
              <div class="user-name">{{ currentUser.firstName }} {{ currentUser.lastName }}</div>
              <div class="user-role">{{ currentUser.role === 'head_of_household' ? 'Jefe del Hogar' : 'Miembro' }}</div>
            </div>
          </div>
        </div>

        <!-- Action Buttons Section -->
        <div class="header-actions">
          <button 
            class="action-btn back-btn"
            (click)="goBack()"
            matTooltip="Volver al Dashboard">
            <mat-icon>arrow_back</mat-icon>
            <span>Volver</span>
          </button>
          
          <button 
            class="action-btn mark-read-btn"
            *ngIf="unreadCount > 0"
            (click)="markAllAsRead()"
            matTooltip="Marcar todas como leídas">
            <mat-icon>done_all</mat-icon>
            <span>Marcar Leídas</span>
          </button>
          
          <button 
            class="action-btn clear-btn"
            (click)="clearAllNotifications()"
            matTooltip="Limpiar todas las notificaciones">
            <mat-icon>clear_all</mat-icon>
            <span>Limpiar</span>
          </button>
        </div>
      </div>

      <!-- Enhanced Stats Section -->
      <div class="stats-section">
        <div class="stat-card">
          <div class="stat-number">{{ notifications.length }}</div>
          <div class="stat-label">Total de Notificaciones</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-number">{{ unreadCount }}</div>
          <div class="stat-label">Sin Leer</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-number">{{ notifications.length - unreadCount }}</div>
          <div class="stat-label">Leídas</div>
        </div>
      </div>

      <!-- Notifications List -->
      <div class="notifications-list">
        <!-- Empty State -->
        <div *ngIf="notifications.length === 0" class="empty-state">
          <mat-icon class="empty-icon">notifications_none</mat-icon>
          <h3 class="empty-title">No hay notificaciones</h3>
          <p class="empty-message">
            Cuando recibas notificaciones del sistema o de otros miembros del hogar, aparecerán aquí.
            <br>Mantente al día con todas las actividades importantes.
          </p>
        </div>

        <!-- Loading State -->
        <div *ngIf="isLoading" class="loading-state">
          <div class="loading-spinner"></div>
          <div class="loading-text">Cargando notificaciones...</div>
        </div>

        <!-- Notification Cards -->
        <div *ngFor="let notification of notifications; trackBy: trackByNotificationId" 
             class="notification-card"
             [class.unread]="!notification.read"
             [class.collapsed]="!showDetails[notification.id]"
             [class.expanded]="showDetails[notification.id]"
             (click)="toggleDetails(notification.id)">
          
          <div class="notification-header">
            <div class="notification-meta">
              <div *ngIf="!notification.read" class="unread-indicator"></div>
              <mat-icon class="type-icon" [class]="getNotificationTypeClass(notification.type)">
                {{ getNotificationIcon(notification.type) }}
              </mat-icon>
              <mat-chip class="type-chip" [class]="getNotificationTypeClass(notification.type)">
                {{ getNotificationTypeLabel(notification.type) }}
              </mat-chip>
            </div>
            <div class="notification-time">
              {{ formatTime(notification.timestamp) }}
            </div>
          </div>

            <div class="notification-summary" *ngIf="!showDetails[notification.id]">
              <h4 class="summary-title">{{ notification.title }}</h4>
              <p class="summary-message">{{ notification.message }}</p>
            </div>

            <div class="notification-body" *ngIf="showDetails[notification.id]">
              <h4 class="notification-title">{{ notification.title }}</h4>
              <p class="notification-message">{{ notification.message }}</p>
            
            <!-- Member Information -->
            <div *ngIf="notification.metadata?.taskData?.createdByName || notification.metadata?.taskData?.completedByUserName" 
                 class="member-info">
              <div class="member-avatar">
                {{ getMemberInitials(notification.metadata.taskData.completedByUserName || notification.metadata.taskData.createdByName) }}
              </div>
              <div class="member-details">
                <h5>
                  <ng-container *ngIf="notification.metadata.taskData.completedByUserName">
                    {{ notification.metadata.taskData.completedByUserName }}
                  </ng-container>
                  <ng-container *ngIf="!notification.metadata.taskData.completedByUserName && notification.metadata.taskData.createdByName">
                    {{ notification.metadata.taskData.createdByName }}
                  </ng-container>
                </h5>
                <p>
                  <ng-container *ngIf="notification.metadata.taskData.completedByUserName">
                    Completó la tarea
                  </ng-container>
                  <ng-container *ngIf="!notification.metadata.taskData.completedByUserName && notification.metadata.taskData.createdByName">
                    Asignó la tarea
                  </ng-container>
                </p>
              </div>
            </div>
            
            <!-- Task Metadata -->
            <div *ngIf="notification.metadata?.taskData" class="task-metadata">
              <div class="metadata-item">
                <div class="metadata-label">Tarea</div>
                <div class="metadata-value">{{ notification.metadata.taskData.taskTitle }}</div>
              </div>
              <div class="metadata-item" *ngIf="notification.metadata.taskData.category">
                <div class="metadata-label">Categoría</div>
                <div class="metadata-value">{{ notification.metadata.taskData.category }}</div>
              </div>
              <div class="metadata-item" *ngIf="notification.metadata.taskData.priority">
                <div class="metadata-label">Prioridad</div>
                <div class="metadata-value">{{ notification.metadata.taskData.priority }}</div>
              </div>
              <div class="metadata-item" *ngIf="notification.metadata.taskData.dueDate">
                <div class="metadata-label">Fecha Límite</div>
                <div class="metadata-value">{{ formatTime(notification.metadata.taskData.dueDate) }}</div>
              </div>
            </div>

            <!-- Additional Information -->
            <div class="additional-info" *ngIf="notification.metadata?.taskData?.commentsCount > 0 || notification.metadata?.taskData?.filesCount > 0">
              
              <!-- Comments Section -->
              <div class="info-section" *ngIf="notification.metadata.taskData.commentsCount > 0">
                <div class="info-title" 
                     [class.expandable]="canViewDetails(notification)"
                     (click)="canViewDetails(notification) && toggleComments(notification.id)">
                  <mat-icon>comment</mat-icon>
                  <span>{{ notification.metadata.taskData.commentsCount }} Comentario{{ notification.metadata.taskData.commentsCount > 1 ? 's' : '' }}</span>
                  <mat-icon *ngIf="canViewDetails(notification)" class="expand-icon" [class.expanded]="showComments[notification.id]">
                    expand_more
                  </mat-icon>
                </div>
                
                <div class="info-content" *ngIf="showComments[notification.id] && notification.metadata.taskData.comments">
                  <div class="comment-item" *ngFor="let comment of notification.metadata.taskData.comments">
                    <div class="comment-header">
                      <strong>{{ comment.created_by_name }}</strong>
                      <span class="comment-date">{{ formatTime(comment.created_at) }}</span>
                    </div>
                    <p>{{ comment.comment }}</p>
                  </div>
                </div>
              </div>

              <!-- Files Section -->
              <div class="info-section" *ngIf="notification.metadata.taskData.filesCount > 0">
                <div class="info-title"
                     [class.expandable]="canViewDetails(notification)"
                     (click)="canViewDetails(notification) && toggleFiles(notification.id)">
                  <mat-icon>attach_file</mat-icon>
                  <span>{{ notification.metadata.taskData.filesCount }} Archivo{{ notification.metadata.taskData.filesCount > 1 ? 's' : '' }}</span>
                  <mat-icon *ngIf="canViewDetails(notification)" class="expand-icon" [class.expanded]="showFiles[notification.id]">
                    expand_more
                  </mat-icon>
                </div>
                
                <div class="info-content" *ngIf="showFiles[notification.id] && notification.metadata.taskData.files">
                  <div class="file-item" *ngFor="let file of notification.metadata.taskData.files">
                    <mat-icon class="file-icon">{{ getFileIcon(file.mime_type) }}</mat-icon>
                    <div class="file-info">
                      <div class="file-name">{{ file.file_name }}</div>
                      <div class="file-size" *ngIf="file.file_size">{{ formatFileSize(file.file_size) }}</div>
                    </div>
                    <button *ngIf="file.file_url" 
                            class="file-action-btn"
                            (click)="$event.stopPropagation(); openFile(file.file_url)"
                            matTooltip="Abrir archivo">
                      <mat-icon>open_in_new</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Notification Actions -->
          <div class="notification-actions">
            <button 
              *ngIf="!notification.read"
              class="notification-btn mark-read"
              (click)="markAsRead(notification.id)"
              matTooltip="Marcar como leída">
              <mat-icon>done</mat-icon>
              <span>Marcar Leída</span>
            </button>
            
            <button 
              *ngIf="notification.metadata?.taskData?.taskId"
              class="notification-btn view-task"
              (click)="$event.stopPropagation(); viewTask(notification.metadata.taskData.taskId)"
              matTooltip="Ver tarea">
              <mat-icon>visibility</mat-icon>
              <span>Ver Tarea</span>
            </button>
            
            <button 
              *ngIf="notification.type === 'comment_added' && notification.metadata?.taskData?.taskId"
              class="notification-btn reply-btn"
              (click)="$event.stopPropagation(); replyToNotification(notification)"
              matTooltip="Responder">
              <mat-icon>reply</mat-icon>
              <span>Responder</span>
            </button>
            
            <button 
              class="notification-btn delete"
              (click)="deleteNotification(notification.id)"
              matTooltip="Eliminar notificación">
              <mat-icon>delete</mat-icon>
              <span>Eliminar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notifications-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .notifications-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px 32px;
      box-shadow: 0 8px 32px rgba(102, 126, 234, 0.3);
      border-radius: 0 0 24px 24px;
      margin-bottom: 32px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Header Main Section */
    .header-main {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .title-section {
      text-align: center;
    }

    .notifications-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 8px;
    }

    .notifications-title h1 {
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.5px;
      background: linear-gradient(45deg, #ffffff, #e3f2fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .notifications-icon {
      font-size: 36px;
      width: 56px;
      height: 56px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .notifications-subtitle {
      font-size: 16px;
      opacity: 0.9;
      font-weight: 400;
      margin: 0;
      color: rgba(255, 255, 255, 0.9);
    }

    /* Header Info Section */
    .header-info {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }

    .connection-status {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .connection-status.connected {
      background: rgba(76, 175, 80, 0.25);
      border: 1px solid rgba(76, 175, 80, 0.4);
      box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
    }

    .connection-status.disconnected {
      background: rgba(244, 67, 54, 0.25);
      border: 1px solid rgba(244, 67, 54, 0.4);
      box-shadow: 0 4px 16px rgba(244, 67, 54, 0.2);
    }

    .status-icon {
      font-size: 20px;
    }

    .status-text {
      font-size: 14px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 12px 20px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }

    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff6b6b, #4ecdc4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 16px;
      color: white;
      text-transform: uppercase;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .user-details {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .user-name {
      font-size: 16px;
      font-weight: 600;
      color: white;
      margin: 0;
    }

    .user-role {
      font-size: 12px;
      opacity: 0.8;
      color: rgba(255, 255, 255, 0.8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    /* Header Actions Section */
    .header-actions {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      border: none;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      backdrop-filter: blur(10px);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      min-width: 120px;
      justify-content: center;
    }

    .back-btn {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .back-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .mark-read-btn {
      background: rgba(76, 175, 80, 0.2);
      color: white;
      border: 1px solid rgba(76, 175, 80, 0.4);
    }

    .mark-read-btn:hover {
      background: rgba(76, 175, 80, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(76, 175, 80, 0.3);
    }

    .clear-btn {
      background: rgba(244, 67, 54, 0.2);
      color: white;
      border: 1px solid rgba(244, 67, 54, 0.4);
    }

    .clear-btn:hover {
      background: rgba(244, 67, 54, 0.3);
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(244, 67, 54, 0.3);
    }

    .action-btn mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }

    .user-name {
      font-size: 16px;
      font-weight: 600;
    }

    .user-role {
      font-size: 12px;
      opacity: 0.8;
      font-weight: 400;
    }

    .user-avatar {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      transition: all 0.3s ease;
    }

    .user-avatar:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.05);
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .action-btn {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .action-btn:hover {
      background: rgba(255, 255, 255, 0.25);
      transform: translateY(-2px);
    }

    /* Stats Section - Professional Design */
    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      padding: 0 32px;
      margin-bottom: 40px;
      max-width: 1200px;
      margin-left: auto;
      margin-right: auto;
    }

    .stat-card {
      background: white;
      border-radius: 20px;
      padding: 32px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.05);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }

    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .stat-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.12);
    }

    .stat-card:first-child::before {
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .stat-card:nth-child(2)::before {
      background: linear-gradient(90deg, #ff6b6b, #ee5a52);
    }

    .stat-card:nth-child(3)::before {
      background: linear-gradient(90deg, #4ecdc4, #44a08d);
    }

    .stat-card .stat-content {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .stat-card .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: white;
      background: linear-gradient(135deg, #667eea, #764ba2);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
    }

    .stat-card:nth-child(2) .stat-icon {
      background: linear-gradient(135deg, #ff6b6b, #ee5a52);
      box-shadow: 0 8px 24px rgba(255, 107, 107, 0.3);
    }

    .stat-card:nth-child(3) .stat-icon {
      background: linear-gradient(135deg, #4ecdc4, #44a08d);
      box-shadow: 0 8px 24px rgba(78, 205, 196, 0.3);
    }

    .stat-info {
      flex: 1;
    }

    .stat-number {
      font-size: 32px;
      font-weight: 800;
      color: #2d3748;
      line-height: 1;
      margin-bottom: 8px;
      background: linear-gradient(135deg, #2d3748, #4a5568);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .stat-label {
      font-size: 14px;
      color: #718096;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin: 0;
    }

    /* Notifications Content */
    .notifications-content {
      padding: 0 32px 40px;
      max-width: 1200px;
      margin: 0 auto;
    }

    /* Empty State - Enhanced */
    .empty-state {
      background: white;
      border-radius: 24px;
      padding: 80px 40px;
      text-align: center;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.05);
      margin-top: 40px;
      position: relative;
      overflow: hidden;
    }

    .empty-state::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .empty-icon {
      font-size: 80px;
      color: #e2e8f0;
      margin-bottom: 24px;
      opacity: 0.8;
    }

    .empty-title {
      font-size: 28px;
      font-weight: 700;
      color: #2d3748;
      margin: 0 0 16px 0;
      background: linear-gradient(135deg, #2d3748, #4a5568);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .empty-message {
      font-size: 16px;
      color: #718096;
      line-height: 1.6;
      margin: 0;
      max-width: 400px;
      margin-left: auto;
      margin-right: auto;
    }

    /* Estado de carga */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 40px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #e2e8f0;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading-text {
      font-size: 16px;
      color: #718096;
      font-weight: 500;
    }

    /* Professional Notification Cards */
    .notification-card {
      background: white;
      border-radius: 20px;
      margin-bottom: 24px;
      border: 1px solid rgba(0, 0, 0, 0.05);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
      transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
      animation: slideInFromBottom 0.6s ease-out calc(0.1s + var(--card-delay, 0s)) both;
    }

    .notification-card:nth-child(1) { --card-delay: 0s; }
    .notification-card:nth-child(2) { --card-delay: 0.1s; }
    .notification-card:nth-child(3) { --card-delay: 0.2s; }
    .notification-card:nth-child(4) { --card-delay: 0.3s; }
    .notification-card:nth-child(5) { --card-delay: 0.4s; }

    .notification-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 48px rgba(0, 0, 0, 0.12);
    }

    .notification-card.unread {
      border-left: 4px solid #667eea;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.02) 0%, rgba(118, 75, 162, 0.02) 100%);
    }

    .notification-card.unread::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    /* Notification Header */
    .notification-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 24px 16px;
    }

    .notification-meta {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .unread-indicator {
      width: 10px;
      height: 10px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 50%;
      box-shadow: 0 0 12px rgba(102, 126, 234, 0.5);
      animation: pulse-dot 2s infinite;
    }

    .type-icon {
      font-size: 24px;
      width: 48px;
      height: 48px;
      border-radius: 16px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .notification-card:hover .type-icon {
      transform: scale(1.1) rotate(5deg);
    }

    .type-chip {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.2);
    }

    .notification-time {
      font-size: 12px;
      color: #718096;
      font-weight: 600;
      background: rgba(113, 128, 150, 0.1);
      padding: 8px 16px;
      border-radius: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border: 1px solid rgba(113, 128, 150, 0.1);
    }

    /* Notification Body */
    .notification-body {
      padding: 0 24px 24px;
    }

    .notification-title {
      font-size: 20px;
      font-weight: 700;
      color: #2d3748;
      margin: 0 0 12px 0;
      line-height: 1.3;
      background: linear-gradient(135deg, #2d3748, #4a5568);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .notification-message {
      font-size: 16px;
      color: #4a5568;
      line-height: 1.6;
      margin: 0 0 20px 0;
    }

    /* Member Info Section */
    .member-info {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 20px;
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
      border-radius: 16px;
      margin-bottom: 20px;
      border: 1px solid rgba(102, 126, 234, 0.1);
      transition: all 0.3s ease;
      animation: slideInLeft 0.6s ease-out 0.6s both;
    }

    .member-info:hover {
      transform: translateX(8px);
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
    }

    .member-avatar {
      width: 48px;
      height: 48px;
      border-radius: 16px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 16px;
    }

    .member-details h5 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #2d3748;
    }

    .member-details p {
      margin: 0;
      font-size: 14px;
      color: #718096;
    }

    /* Metadatos de tarea */
    .task-metadata {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(147, 197, 253, 0.05) 100%);
      border-radius: 16px;
      padding: 20px;
      margin: 20px 0;
      border: 1px solid rgba(59, 130, 246, 0.2);
      transition: all 0.3s ease;
      animation: slideInUp 0.6s ease-out 0.7s both;
    }

    .task-metadata:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 24px rgba(59, 130, 246, 0.15);
    }

    .metadata-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid rgba(59, 130, 246, 0.1);
    }

    .metadata-item:last-child {
      border-bottom: none;
    }

    .metadata-label {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
    }

    .metadata-value {
      font-size: 14px;
      color: #6b7280;
    }

    /* Información adicional */
    .additional-info {
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid rgba(0, 0, 0, 0.1);
      animation: fadeIn 0.6s ease-out 0.8s both;
    }

    .info-section {
      margin-bottom: 16px;
    }

    .info-title {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(102, 126, 234, 0.1);
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .info-title.expandable:hover {
      background: rgba(102, 126, 234, 0.15);
      transform: translateX(4px);
    }

    .expand-icon {
      margin-left: auto;
      transition: transform 0.3s ease;
    }

    .expand-icon.expanded {
      transform: rotate(180deg);
    }

    .info-content {
      margin-top: 12px;
      animation: expandDown 0.4s ease-out;
    }

    .comment-item {
      background: rgba(249, 250, 251, 0.8);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 8px;
      border-left: 3px solid #e5e7eb;
      transition: all 0.3s ease;
      animation: slideInLeft 0.4s ease-out;
    }

    .comment-item:hover {
      background: rgba(243, 244, 246, 0.8);
      transform: translateX(8px);
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .comment-date {
      font-size: 11px;
      color: #9ca3af;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: rgba(249, 250, 251, 0.8);
      border-radius: 12px;
      margin-bottom: 8px;
      border: 1px solid #f3f4f6;
      transition: all 0.3s ease;
      animation: slideInRight 0.4s ease-out;
    }

    .file-item:hover {
      background: rgba(243, 244, 246, 0.8);
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .file-icon {
      font-size: 20px;
      color: #6b7280;
    }

    .file-info {
      flex: 1;
    }

    .file-name {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 2px;
    }

    .file-size {
      font-size: 12px;
      color: #9ca3af;
    }

    .file-action-btn {
      background: rgba(102, 126, 234, 0.1);
      color: #667eea;
      border: none;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .file-action-btn:hover {
      background: rgba(102, 126, 234, 0.2);
      transform: scale(1.1);
    }

    /* Acciones de notificación */
    .notification-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 0 24px 24px;
      animation: fadeIn 0.6s ease-out 0.9s both;
    }

    .notification-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .notification-btn.mark-read {
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
    }

    .notification-btn.view-task {
      background: linear-gradient(135deg, #2196F3, #1976D2);
      color: white;
    }

    .notification-btn.delete {
      background: linear-gradient(135deg, #f44336, #d32f2f);
      color: white;
    }

    .notification-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .notifications-header {
        flex-direction: column;
        gap: 16px;
        padding: 16px;
      }

      .header-right {
        width: 100%;
        justify-content: space-between;
      }

      .stats-section {
        grid-template-columns: 1fr;
        padding: 16px;
        gap: 16px;
      }

      .notifications-list {
        padding: 0 16px 32px;
      }

      .notification-card {
        margin-bottom: 16px;
      }

      .notification-header,
      .notification-body,
      .notification-actions {
        padding: 16px;
      }

      .header-actions {
        flex-direction: column;
        gap: 8px;
      }

      .action-btn {
        justify-content: center;
      }
    }

    @media (max-width: 480px) {
      .notifications-title {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .title-text {
        font-size: 20px;
      }

      .notifications-subtitle {
        margin-left: 0;
      }

      .user-info {
        flex-direction: column;
        text-align: center;
        gap: 8px;
      }

      .stat-number {
        font-size: 32px;
      }

      .notification-actions {
        flex-direction: column;
        gap: 8px;
      }

      .notification-btn {
        justify-content: center;
      }
    }

    /* Efectos adicionales */
    .loading-shimmer {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200px 100%;
      animation: shimmer 1.5s infinite;
    }
  `]
})
export class NotificationsListComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  isLoading = false;
  isConnected = true;
  currentUser: User | null = null;
  showComments: { [key: string]: boolean } = {};
  showFiles: { [key: string]: boolean } = {};
  private subscription = new Subscription();
  showDetails: { [key: string]: boolean } = {};

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router,
    private taskService: TaskService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadNotifications();
    this.subscribeToNotifications();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  private loadNotifications(): void {
    this.isLoading = true;
    this.subscription.add(
      this.notificationService.notifications$.subscribe({
        next: (notifications: Notification[]) => {
          this.notifications = notifications;
          this.updateUnreadCount();
          this.isLoading = false;
        },
        error: (error: any) => {
          console.error('Error loading notifications:', error);
          this.isLoading = false;
        }
      })
    );
  }

  private subscribeToNotifications(): void {
    this.subscription.add(
      this.notificationService.notifications$.subscribe({
        next: (notifications: Notification[]) => {
          this.notifications = notifications;
          this.updateUnreadCount();
        },
        error: (error: any) => {
          console.error('Error in notifications subscription:', error);
        }
      })
    );
  }

  private updateUnreadCount(): void {
    this.unreadCount = this.notifications.filter(n => !n.read).length;
  }

  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.updateUnreadCount();
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
    this.notifications.forEach(n => n.read = true);
    this.updateUnreadCount();
  }

  deleteNotification(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId);
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.updateUnreadCount();
  }

  clearAllNotifications(): void {
    this.notificationService.clearAllNotifications();
    this.notifications = [];
    this.updateUnreadCount();
  }

  viewTask(taskId: string): void {
    this.router.navigate(['/tasks', taskId]);
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }

  toggleComments(notificationId: string): void {
    this.showComments[notificationId] = !this.showComments[notificationId];
  }

  toggleFiles(notificationId: string): void {
    this.showFiles[notificationId] = !this.showFiles[notificationId];
  }

  canViewDetails(notification: Notification): boolean {
    return this.currentUser?.role === 'head_of_household' || 
           notification.userId === this.currentUser?.id?.toString();
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification.id;
  }

  getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'task_assigned': 'assignment',
      'task_completed': 'task_alt',
      'task_overdue': 'schedule',
      'comment_added': 'comment',
      'file_uploaded': 'attach_file',
      'system': 'info',
      'reminder': 'alarm'
    };
    return iconMap[type] || 'notifications';
  }

  getNotificationTypeClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'task_assigned': 'type-assigned',
      'task_completed': 'type-completed',
      'task_overdue': 'type-overdue',
      'comment_added': 'type-comment',
      'file_uploaded': 'type-file',
      'system': 'type-system',
      'reminder': 'type-reminder'
    };
    return classMap[type] || 'type-default';
  }

  getNotificationTypeLabel(type: string): string {
    const labelMap: { [key: string]: string } = {
      'task_assigned': 'Tarea Asignada',
      'task_completed': 'Tarea Completada',
      'task_overdue': 'Tarea Vencida',
      'comment_added': 'Comentario',
      'file_uploaded': 'Archivo',
      'system': 'Sistema',
      'reminder': 'Recordatorio'
    };
    return labelMap[type] || 'Notificación';
  }

  formatTime(timestamp: Date | string): string {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} minuto${diffInMinutes > 1 ? 's' : ''}`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hace ${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
    
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getMemberInitials(name: string): string {
    if (!name) return '??';
    const names = name.split(' ');
    return names.length >= 2 
      ? (names[0].charAt(0) + names[1].charAt(0)).toUpperCase()
      : name.substring(0, 2).toUpperCase();
  }

  getFileIcon(mimeType: string): string {
    if (!mimeType) return 'insert_drive_file';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video_file';
    if (mimeType.startsWith('audio/')) return 'audio_file';
    if (mimeType.includes('pdf')) return 'picture_as_pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table_chart';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'slideshow';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'archive';
    
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  openFile(fileUrl: string): void {
    window.open(fileUrl, '_blank');
  }

  toggleDetails(notificationId: string): void {
    this.showDetails[notificationId] = !this.showDetails[notificationId];
  }

  replyToNotification(notification: Notification): void {
    const taskId = notification?.metadata?.taskData?.taskId;
    if (!taskId) return;
    const reply = prompt('Responder al comentario:');
    if (reply && reply.trim()) {
      this.taskService.addComment(taskId, reply.trim()).subscribe({
        next: () => {
          this.snackBar.open('Respuesta publicada', 'Cerrar', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error al responder:', error);
          this.snackBar.open('Error al publicar respuesta', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }
}