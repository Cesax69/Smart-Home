import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { CreateTaskRequest } from '../../models/task.model';

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="task-create-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>📝 Crear Nueva Tarea</h1>
      </div>

      <mat-card class="create-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>add_task</mat-icon>
            ¡Vamos a crear una nueva tarea! 🚀
          </mat-card-title>
          <mat-card-subtitle>
            Llena los detalles y asigna la tarea a un miembro de la familia
          </mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="taskForm" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Título de la tarea</mat-label>
              <input matInput formControlName="title" placeholder="Ej: Limpiar la cocina">
              <mat-icon matSuffix>title</mat-icon>
              @if (taskForm.get('title')?.hasError('required') && taskForm.get('title')?.touched) {
                <mat-error>El título es requerido</mat-error>
              }
              @if (taskForm.get('title')?.hasError('minlength') && taskForm.get('title')?.touched) {
                <mat-error>El título debe tener al menos 3 caracteres</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Descripción (opcional)</mat-label>
              <textarea matInput 
                        formControlName="description" 
                        rows="3"
                        placeholder="Describe los detalles de la tarea..."></textarea>
              <mat-icon matSuffix>description</mat-icon>
            </mat-form-field>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Prioridad</mat-label>
                <mat-select formControlName="priority">
                  <mat-option value="low">
                    <div class="priority-option low">
                      <mat-icon>🟢</mat-icon>
                      <span>🟢 Baja - Sin prisa</span>
                    </div>
                  </mat-option>
                  <mat-option value="medium">
                    <div class="priority-option medium">
                      <mat-icon>🟡</mat-icon>
                      <span>🟡 Media - Importante</span>
                    </div>
                  </mat-option>
                  <mat-option value="high">
                    <div class="priority-option high">
                      <mat-icon>🔴</mat-icon>
                      <span>🔴 Alta - ¡Urgente!</span>
                    </div>
                  </mat-option>
                </mat-select>
                @if (taskForm.get('priority')?.hasError('required') && taskForm.get('priority')?.touched) {
                  <mat-error>Selecciona una prioridad</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Asignar a</mat-label>
                <mat-select formControlName="assignedTo">
                  <mat-option value="">Seleccionar miembro</mat-option>
                  @for (user of familyMembers(); track user.id) {
                    <mat-option [value]="user.id">
                      <div class="user-option">
                        @if (user.role === 'head_of_household') {
                          <mat-icon>star</mat-icon>
                        } @else {
                          <mat-icon>person</mat-icon>
                        }
                        <span>{{ user.firstName }} {{ user.lastName }}</span>
                      </div>
                    </mat-option>
                  }
                </mat-select>
                @if (taskForm.get('assignedTo')?.hasError('required') && taskForm.get('assignedTo')?.touched) {
                  <mat-error>Asigna la tarea a alguien</mat-error>
                }
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Fecha de vencimiento (opcional)</mat-label>
              <input matInput 
                     [matDatepicker]="picker" 
                     formControlName="dueDate"
                     placeholder="Selecciona una fecha">
              <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
              <mat-datepicker #picker></mat-datepicker>
              @if (taskForm.get('dueDate')?.hasError('futureDate') && taskForm.get('dueDate')?.touched) {
                <mat-error>La fecha debe ser futura</mat-error>
              }
            </mat-form-field>

            @if (errorMessage()) {
              <div class="error-message">
                <mat-icon>error</mat-icon>
                {{ errorMessage() }}
              </div>
            }

            <div class="button-container">
              <button mat-button type="button" (click)="goBack()">
                Cancelar
              </button>
              
              <button mat-raised-button 
                      color="primary" 
                      type="submit" 
                      [disabled]="taskForm.invalid || isLoading()">
                @if (isLoading()) {
                  <mat-spinner diameter="20"></mat-spinner>
                } @else {
                  <ng-container>
                    <mat-icon>add</mat-icon>
                    Crear Tarea
                  </ng-container>
                }
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Vista previa de la tarea -->
      @if (taskForm.valid) {
        <mat-card class="preview-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>visibility</mat-icon>
              Vista Previa
            </mat-card-title>
          </mat-card-header>
          
          <mat-card-content>
            <div class="task-preview">
              <h3>{{ taskForm.get('title')?.value }}</h3>
              
              @if (taskForm.get('description')?.value) {
                <p class="description">{{ taskForm.get('description')?.value }}</p>
              }
              
              <div class="preview-details">
                <div class="detail-item">
                  <mat-icon>flag</mat-icon>
                  <span>Prioridad: {{ getPriorityLabel(taskForm.get('priority')?.value) }}</span>
                </div>
                
                <div class="detail-item">
                  <mat-icon>person</mat-icon>
                  <span>Asignada a: {{ getAssignedUserName(taskForm.get('assignedTo')?.value) }}</span>
                </div>
                
                @if (taskForm.get('dueDate')?.value) {
                  <div class="detail-item">
                    <mat-icon>schedule</mat-icon>
                    <span>Vence: {{ formatDate(taskForm.get('dueDate')?.value) }}</span>
                  </div>
                }
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .task-create-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      color: #333;
    }

    .create-card {
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      margin-bottom: 16px;
    }

    .half-width {
      flex: 1;
    }

    .priority-option, .user-option {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .priority-option.low mat-icon {
      color: #4caf50;
    }

    .priority-option.medium mat-icon {
      color: #ff9800;
    }

    .priority-option.high mat-icon {
      color: #f44336;
    }

    .user-option mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .button-container {
      display: flex;
      gap: 16px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    mat-spinner {
      margin-right: 8px;
    }

    .preview-card {
      border: 2px dashed #e0e0e0;
      background-color: #fafafa;
    }

    .task-preview h3 {
      margin: 0 0 12px 0;
      color: #333;
    }

    .description {
      margin: 0 0 16px 0;
      color: #666;
      line-height: 1.5;
    }

    .preview-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      color: #666;
    }

    .detail-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    @media (max-width: 768px) {
      .task-create-container {
        padding: 16px;
      }

      .form-row {
        flex-direction: column;
      }

      .half-width {
        width: 100%;
      }

      .button-container {
        flex-direction: column-reverse;
      }

      .button-container button {
        width: 100%;
      }
    }
  `]
})
export class TaskCreateComponent implements OnInit {
  taskForm: FormGroup;
  familyMembers = signal<any[]>([]);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['medium', [Validators.required]],
      assignedTo: ['', [Validators.required]],
      dueDate: ['', [this.futureDateValidator]]
    });
  }

  ngOnInit(): void {
    this.loadFamilyMembers();
  }

  futureDateValidator(control: any) {
    if (!control.value) return null;
    
    const selectedDate = new Date(control.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      return { futureDate: true };
    }
    
    return null;
  }

  loadFamilyMembers(): void {
    // En una implementación real, esto vendría de un servicio de usuarios
    // Por ahora, simulamos algunos usuarios
    const currentUser = this.authService.currentUser();
    this.familyMembers.set([
      {
        id: currentUser?.id || '1',
        firstName: currentUser?.firstName || 'Usuario',
        lastName: currentUser?.lastName || 'Actual',
        role: currentUser?.role || 'head_of_household'
      },
      {
        id: '2',
        firstName: 'María',
        lastName: 'García',
        role: 'family_member'
      },
      {
        id: '3',
        firstName: 'Juan',
        lastName: 'García',
        role: 'family_member'
      }
    ]);
  }

  onSubmit(): void {
    if (this.taskForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const taskData: CreateTaskRequest = {
        title: this.taskForm.get('title')?.value,
        description: this.taskForm.get('description')?.value || undefined,
        priority: this.taskForm.get('priority')?.value,
        assignedTo: this.taskForm.get('assignedTo')?.value,
        dueDate: this.taskForm.get('dueDate')?.value || undefined
      };

      this.taskService.createTask(taskData).subscribe({
        next: (task) => {
          this.isLoading.set(false);
          this.snackBar.open('🎉 ¡Tarea creada con éxito! Ya está lista para ser completada', 'Cerrar', { 
            duration: 4000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/tasks']);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.errorMessage.set(
            error.error?.message || '😅 Ups, algo salió mal al crear la tarea. ¡Inténtalo de nuevo!'
          );
          this.snackBar.open('❌ Error al crear la tarea', 'Cerrar', { 
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  getPriorityLabel(priority: string): string {
    const labels = {
      'low': 'Baja',
      'medium': 'Media',
      'high': 'Alta'
    };
    return labels[priority as keyof typeof labels] || priority;
  }

  getAssignedUserName(userId: string): string {
    const user = this.familyMembers().find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : 'Usuario no encontrado';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  goBack(): void {
    this.router.navigate(['/tasks']);
  }
}