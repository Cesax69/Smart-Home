import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../services/auth.service';
import { NotificationService, Notification } from '../../../services/notification.service';
import { NotificationBellComponent } from "../../notification-bell/notification-bell.component";

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    MatTooltipModule,
    NotificationBellComponent
],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent implements OnInit {
  currentUser = signal<any>(null);
  unreadNotifications = signal<number>(0);
  isConnected = signal<boolean>(false);

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());
    
    // Load unread notifications count only for household heads
    if (this.isHouseholdHead()) {
      this.loadUnreadNotificationsCount();
      this.subscribeToConnectionStatus();
    }
  }

  private subscribeToConnectionStatus(): void {
    this.notificationService.connectionStatus$.subscribe((connected: boolean) => {
      this.isConnected.set(connected);
      console.log('🔌 Connection status updated:', connected);
    });
  }

  hasUnreadNotifications(): boolean {
    return this.unreadNotifications() > 0;
  }

  unreadCount(): number {
    return this.unreadNotifications();
  }

  isHouseholdHead(): boolean {
    const user = this.authService.getCurrentUser();
    return user?.role === 'head_of_household';
  }

  getConnectionStatus(): string {
    return this.isConnected() ? 'conectado' : 'sin conexión';
  }

  private loadUnreadNotificationsCount(): void {
    this.notificationService.notifications$.subscribe({
      next: (notifications: Notification[]) => {
        const unreadCount = notifications.filter((n: Notification) => !n.read).length;
        this.unreadNotifications.set(unreadCount);
      },
      error: (error: any) => {
        console.error('Error loading notifications count:', error);
      }
    });
  }

  navigate(path: string): void {
    this.router.navigateByUrl(path);
  }

  goToDashboard(): void {
    const user = this.authService.getCurrentUser();
    if (user?.role === 'head_of_household') {
      this.router.navigate(['/dashboard/admin']);
    } else {
      this.router.navigate(['/dashboard/member']);
    }
  }
  
  // Alias para mantener compatibilidad con el código existente
  goHome = this.goToDashboard;

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}