import { Component, OnInit, signal } from '@angular/core';
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
  selector: 'app-dashboard-admin',
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
      background-color: #e3f2fd;
      color: #1976d2;
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
    this.router.navigate([route]);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}