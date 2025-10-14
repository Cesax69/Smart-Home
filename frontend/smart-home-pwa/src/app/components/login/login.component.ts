import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { AlertService } from '../../services/alert.service';
import { AuthService } from '../../services/auth.service';
import { LoginRequest } from '../../models/user.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal('');
  hidePassword = signal(true);

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private alerts: AlertService
  ) {
    this.loginForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(3)]],
      rememberMe: [false]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.performLogin();
    } else {
      this.markFormGroupTouched();
    }
  }

  // Eliminado: accesos rápidos mock

  private performLogin(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const credentials: LoginRequest = {
      username: this.loginForm.get('username')?.value,
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        
        // Mostrar mensaje de bienvenida diferenciado por rol
        this.showWelcomeMessage(response.user);
        
        // Navegar según el rol del usuario después de un breve delay
        setTimeout(() => {
          if (response.user.role === 'head_of_household') {
            this.router.navigate(['/dashboard/admin']);
          } else {
            this.router.navigate(['/dashboard/member']);
          }
        }, 1500);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Error en el inicio de sesión');
        
        // Limpiar contraseña en caso de error
        // this.loginForm.patchValue({ password: '' });
      }
    });
  }

  private showWelcomeMessage(user: any): void {
    let message = '';
    let icon = '';
    
    if (user.role === 'head_of_household') {
      message = `¡Bienvenido, ${user.firstName}! 👑 Entrando como Jefe del Hogar`;
      icon = '👑';
    } else {
      message = `¡Hola, ${user.firstName}! 👤 Entrando como Miembro del Hogar`;
      icon = '👤';
    }

    this.alerts.success(message);
  }

  togglePasswordVisibility(): void {
    this.hidePassword.set(!this.hidePassword());
  }

  getErrorMessage(field: string): string {
    const control = this.loginForm.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(field)} es requerido`;
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength']?.requiredLength;
      return `${this.getFieldDisplayName(field)} debe tener al menos ${requiredLength} caracteres`;
    }
    return '';
  }

  private getFieldDisplayName(field: string): string {
    const fieldNames: { [key: string]: string } = {
      'username': 'El usuario',
      'password': 'La contraseña'
    };
    return fieldNames[field] || field;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(key => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }
}