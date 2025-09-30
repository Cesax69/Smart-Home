import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>🏠 Smart Home</mat-card-title>
          <mat-card-subtitle>Selecciona tu rol para acceder</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          @if (errorMessage()) {
            <div class="error-message">
              <mat-icon>error</mat-icon>
              {{ errorMessage() }}
            </div>
          }

          <div class="role-buttons">
            <button mat-raised-button 
                    color="primary" 
                    class="role-button"
                    [disabled]="isLoading()"
                    (click)="loginAsRole('head_of_household')">
              @if (isLoading() && selectedRole() === 'head_of_household') {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <div class="button-content">
                  <mat-icon class="role-icon">👑</mat-icon>
                  <span class="role-title">Jefe del Hogar</span>
                  <span class="role-subtitle">Administrador del sistema</span>
                </div>
              }
            </button>

            <button mat-raised-button 
                    color="accent" 
                    class="role-button"
                    [disabled]="isLoading()"
                    (click)="loginAsRole('family_member')">
              @if (isLoading() && selectedRole() === 'family_member') {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <div class="button-content">
                  <mat-icon class="role-icon">👨‍👩‍👧‍👦</mat-icon>
                  <span class="role-title">Miembro</span>
                  <span class="role-subtitle">Usuario del hogar</span>
                </div>
              }
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      width: 100%;
      max-width: 450px;
      padding: 30px;
    }

    .role-buttons {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-top: 20px;
    }

    .role-button {
      height: 120px;
      width: 100%;
      font-size: 16px;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .role-button:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .button-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .role-icon {
      font-size: 32px;
      height: 32px;
      width: 32px;
    }

    .role-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }

    .role-subtitle {
      font-size: 14px;
      opacity: 0.8;
      margin: 0;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      margin-bottom: 16px;
      font-size: 14px;
      padding: 12px;
      background-color: rgba(244, 67, 54, 0.1);
      border-radius: 8px;
      border-left: 4px solid #f44336;
    }

    mat-card-header {
      text-align: center;
      margin-bottom: 20px;
    }

    mat-card-title {
      font-size: 28px;
      font-weight: 600;
      color: #333;
    }

    mat-card-subtitle {
      font-size: 16px;
      color: #666;
      margin-top: 8px;
    }

    mat-spinner {
      margin: 0 auto;
    }

    .role-button:disabled {
      opacity: 0.7;
    }
  `]
})
export class LoginComponent {
  isLoading = signal(false);
  errorMessage = signal('');
  selectedRole = signal<string>('');

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  loginAsRole(role: 'head_of_household' | 'family_member'): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.loginByRole(role).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        
        // Navegar al dashboard correspondiente
        if (role === 'head_of_household') {
          this.router.navigate(['/dashboard/admin']);
        } else {
          this.router.navigate(['/dashboard/member']);
        }
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Error en el inicio de sesión');
      }
    });
  }
}