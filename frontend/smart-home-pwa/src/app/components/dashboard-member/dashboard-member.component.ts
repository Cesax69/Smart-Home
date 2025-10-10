import { Component, OnInit, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';

@Component({
  selector: 'app-dashboard-member',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule
  ],
  template: `
    <div class="dashboard-container">
      <!-- Header con indicador de rol -->
      <div class="role-header">
        <div class="role-indicator member-role">
          <mat-icon class="role-icon">👤</mat-icon>
          <div class="role-info">
            <h2>Miembro del Hogar</h2>
            <p>{{ currentUser()?.firstName }} {{ currentUser()?.lastName }}</p>
          </div>
        </div>
        <button mat-icon-button [matMenuTriggerFor]="userMenu" class="user-menu-btn">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="navigateTo('/profile')">
            <mat-icon>person</mat-icon>
            <span>Mi Perfil</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Cerrar Sesión</span>
          </button>
        </mat-menu>
      </div>

      <!-- Main Content -->
      <div class="dashboard-content">
        <div class="welcome-section">
          <h1>🏠 Mi Hogar Inteligente</h1>
          <p>Bienvenido a tu panel personal</p>
        </div>

        <!-- Member Features Grid -->
        <div class="features-grid">
          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">✅</mat-icon>
              <mat-card-title>Mis Tareas</mat-card-title>
              <mat-card-subtitle>Tareas asignadas a mí</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Ve y gestiona las tareas que te han sido asignadas.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/tasks/my-tasks')">
                Ver Mis Tareas
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">🏡</mat-icon>
              <mat-card-title>Control Básico</mat-card-title>
              <mat-card-subtitle>Dispositivos permitidos</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Controla los dispositivos que tienes permitido usar.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/my-devices')">
                Mis Dispositivos
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">👤</mat-icon>
              <mat-card-title>Mi Perfil</mat-card-title>
              <mat-card-subtitle>Información personal</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Actualiza tu información personal y preferencias.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/profile')">
                Ver Perfil
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">📊</mat-icon>
              <mat-card-title>Mi Actividad</mat-card-title>
              <mat-card-subtitle>Historial personal</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Revisa tu historial de tareas completadas y actividad.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/my-activity')">
                Ver Actividad
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background-color: #f5f5f5;
    }

    .dashboard-content {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      text-align: center;
      margin-bottom: 32px;
    }

    .welcome-section h1 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 32px;
    }

    .welcome-section p {
      margin: 0;
      color: #666;
      font-size: 16px;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 24px;
    }

    .feature-card {
      transition: all 0.3s ease;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .feature-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .feature-icon {
      font-size: 32px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #fce4ec;
      color: #c2185b;
    }

    mat-card-content {
      flex: 1;
    }

    mat-card-content p {
      color: #666;
      line-height: 1.5;
    }

    mat-card-actions {
      padding: 16px;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .features-grid {
        grid-template-columns: 1fr;
      }
      
      .dashboard-content {
        padding: 16px;
      }
      
      .user-info {
        display: none;
      }
    }
  `]
})
export class DashboardMemberComponent implements OnInit {
  currentUser = signal<User | null>(null);
  
  private authService = inject(AuthService);
  private router = inject(Router);

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}