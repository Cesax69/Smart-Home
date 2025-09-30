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
      <!-- Header -->
      <mat-toolbar color="accent" class="dashboard-header">
        <span class="header-title">
          <mat-icon>👨‍👩‍👧‍👦</mat-icon>
          Panel de Miembro
        </span>
        <span class="spacer"></span>
        <span class="user-info">Hola, {{ currentUser()?.firstName || 'Usuario' }}</span>
        <button mat-icon-button [matMenuTriggerFor]="userMenu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu">
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            Cerrar Sesión
          </button>
        </mat-menu>
      </mat-toolbar>

      <!-- Main Content -->
      <div class="dashboard-content">
        <div class="welcome-section">
          <h1>🏠 Mi Hogar Inteligente</h1>
          <p>Accede a las funciones disponibles para ti</p>
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
              <p>Ve las tareas que te han sido asignadas y actualiza su estado.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="accent" (click)="navigateTo('/my-tasks')">
                Ver Mis Tareas
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">💡</mat-icon>
              <mat-card-title>Control Básico</mat-card-title>
              <mat-card-subtitle>Dispositivos permitidos</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Controla luces, temperatura y otros dispositivos que tienes permitido usar.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="accent" (click)="navigateTo('/my-devices')">
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
              <button mat-raised-button color="accent" (click)="navigateTo('/profile')">
                Ver Perfil
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">📱</mat-icon>
              <mat-card-title>Notificaciones</mat-card-title>
              <mat-card-subtitle>Mensajes y alertas</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Revisa las notificaciones y mensajes del sistema.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="accent" (click)="navigateTo('/notifications')">
                Ver Notificaciones
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
              <p>Ve tu historial de tareas completadas y uso de dispositivos.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="accent" (click)="navigateTo('/my-activity')">
                Ver Actividad
              </button>
            </mat-card-actions>
          </mat-card>

          <mat-card class="feature-card">
            <mat-card-header>
              <mat-icon mat-card-avatar class="feature-icon">❓</mat-icon>
              <mat-card-title>Ayuda</mat-card-title>
              <mat-card-subtitle>Soporte y guías</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <p>Encuentra ayuda sobre cómo usar las funciones del sistema.</p>
            </mat-card-content>
            <mat-card-actions>
              <button mat-raised-button color="accent" (click)="navigateTo('/help')">
                Ver Ayuda
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

    .dashboard-header {
      position: sticky;
      top: 0;
      z-index: 100;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .user-info {
      margin-right: 16px;
      font-size: 14px;
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

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.getCurrentUser());
  }

  navigateTo(route: string): void {
    // Por ahora solo mostramos un mensaje, en el futuro se implementarán las rutas
    console.log(`Navegando a: ${route}`);
    alert(`Funcionalidad "${route}" será implementada en el futuro`);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}