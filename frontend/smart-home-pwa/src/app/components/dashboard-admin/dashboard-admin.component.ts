import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/user.model';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatDividerModule
],
  template: `
    <div class="dashboard-container">
      <!-- Main Content -->
      <div class="dashboard-content">
        <div class="welcome-section">
          <h1>🏠 Smart Home - Panel de Control</h1>
          <p>Administra tu hogar inteligente desde aquí</p>
        </div>

        <!-- Admin Features Grid -->
        <div class="features-grid">
          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">👥</mat-icon>
              <mat-card-title>Gestión de Usuarios</mat-card-title>
              <mat-card-subtitle>Administrar miembros del hogar</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Controla quién tiene acceso al sistema y gestiona los permisos de cada miembro de la familia.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/users')">
                Gestionar Usuarios
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">📋</mat-icon>
              <mat-card-title>Gestión de Tareas</mat-card-title>
              <mat-card-subtitle>Crear y asignar tareas</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Crea tareas para los miembros del hogar y supervisa su progreso.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/tasks')">
                Ver Tareas
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">🏡</mat-icon>
              <mat-card-title>Control del Hogar</mat-card-title>
              <mat-card-subtitle>Dispositivos inteligentes</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Controla luces, temperatura, seguridad y otros dispositivos conectados.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/devices')">
                Ver Dispositivos
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">📊</mat-icon>
              <mat-card-title>Reportes</mat-card-title>
              <mat-card-subtitle>Estadísticas del hogar</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Visualiza estadísticas de uso, consumo energético y actividad del hogar.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/reports')">
                Ver Reportes
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">⚙️</mat-icon>
              <mat-card-title>Configuración</mat-card-title>
              <mat-card-subtitle>Ajustes del sistema</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Configura las preferencias del sistema y ajustes avanzados.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/settings')">
                Configurar
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">📱</mat-icon>
              <mat-card-title>Centro de Notificaciones</mat-card-title>
              <mat-card-subtitle>Todas las notificaciones</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Revisa todas las notificaciones del sistema, tareas completadas y alertas importantes.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/notifications')">
                Ver Notificaciones
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">🔒</mat-icon>
              <mat-card-title>Seguridad</mat-card-title>
              <mat-card-subtitle>Monitoreo y alertas</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Supervisa la seguridad del hogar y configura alertas automáticas.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="primary" (click)="navigateTo('/security')">
                Ver Seguridad
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
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    /* Mantener estilos de contenido; se elimina la toolbar local */
    .dashboard-content {
      padding: 32px 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      text-align: center;
      margin-bottom: 40px;
      padding: 40px 20px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .welcome-section h1 {
      margin: 0 0 12px 0;
      color: #333;
      font-size: 36px;
      font-weight: 700;
    }

    .welcome-section p {
      margin: 0;
      color: #666;
      font-size: 18px;
      font-weight: 400;
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
      border-radius: 16px;
      overflow: hidden;
      background: white;
      border-left: 4px solid transparent;
    }

    .feature-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
      border-left-color: #667eea;
    }

    .feature-icon {
      font-size: 32px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 50%;
    }

    mat-card-header {
      padding: 24px 24px 16px 24px;
    }

    mat-card-title {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }

    mat-card-subtitle {
      font-size: 14px;
      color: #666;
      font-weight: 500;
    }

    mat-card-content {
      flex: 1;
      padding: 0 24px 16px 24px;
    }

    mat-card-content p {
      color: #666;
      line-height: 1.6;
      font-size: 15px;
      margin: 0;
    }

    mat-card-actions {
      padding: 16px 24px 24px 24px;
      justify-content: flex-end;
    }

    mat-card-actions button {
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      font-weight: 500;
      border-radius: 25px;
      padding: 0 24px;
      transition: all 0.3s ease;
    }

    mat-card-actions button:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    @media (max-width: 768px) {
      .dashboard-content {
        padding: 24px 16px;
      }

      .welcome-section {
        padding: 24px 16px;
        margin-bottom: 24px;
      }

      .welcome-section h1 {
        font-size: 28px;
      }

      .welcome-section p {
        font-size: 16px;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardAdminComponent implements OnInit {
  currentUser = signal<User | null>(null);

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  navigateTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}