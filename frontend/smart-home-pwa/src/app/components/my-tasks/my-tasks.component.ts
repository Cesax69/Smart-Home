import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="my-tasks-container">
      <div class="header">
        <h1>👤 Mis Tareas</h1>
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-number">{{ pendingTasks().length }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ inProgressTasks().length }}</span>
            <span class="stat-label">En Progreso</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ completedTasks().length }}</span>
            <span class="stat-label">Completadas</span>
          </div>
        </div>
      </div>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Cargando tus tareas...</p>
        </div>
      } @else {
        <mat-tab-group class="tasks-tabs" (selectedTabChange)="onTabChange($event)">
          <!-- Tareas Pendientes -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>schedule</mat-icon>
              Pendientes
              @if (pendingTasks().length > 0) {
                <span class="tab-badge">{{ pendingTasks().length }}</span>
              }
            </ng-template>
            
            <div class="tab-content">
              @if (pendingTasks().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon">check_circle_outline</mat-icon>
                  <h3>¡Genial!</h3>
                  <p>No tienes tareas pendientes por el momento.</p>
                </div>
              } @else {
                <div class="tasks-grid">
                  @for (task of pendingTasks(); track task.id) {
                    <mat-card class="task-card pending-card">
                      <mat-card-header>
                        <div class="task-header">
                          <h3>{{ task.title }}</h3>
                          <mat-chip [class]="'priority-' + task.priority">
                            {{ getPriorityLabel(task.priority) }}
                          </mat-chip>
                        </div>
                      </mat-card-header>

                      <mat-card-content>
                        @if (task.description) {
                          <p class="task-description">{{ task.description }}</p>
                        }

                        <div class="task-details">
                          @if (task.dueDate) {
                            <div class="detail-item" [class.overdue]="isOverdue(task)">
                              <mat-icon>schedule</mat-icon>
                              <span>Vence: {{ formatDate(task.dueDate) }}</span>
                              @if (isOverdue(task)) {
                                <mat-icon class="warning-icon">warning</mat-icon>
                              }
                            </div>
                          }
                          
                          <div class="detail-item">
                            <mat-icon>calendar_today</mat-icon>
                            <span>Creada: {{ formatDate(task.createdAt) }}</span>
                          </div>
                        </div>
                      </mat-card-content>

                      <mat-card-actions>
                        <button mat-raised-button color="primary" (click)="startTask(task)">
                          <mat-icon>play_arrow</mat-icon>
                          Comenzar
                        </button>
                        <button mat-button (click)="viewTaskDetails(task)">
                          <mat-icon>visibility</mat-icon>
                          Ver Detalles
                        </button>
                      </mat-card-actions>
                    </mat-card>
                  }
                </div>
              }
            </div>
          </mat-tab>

          <!-- Tareas En Progreso -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>hourglass_empty</mat-icon>
              En Progreso
              @if (inProgressTasks().length > 0) {
                <span class="tab-badge">{{ inProgressTasks().length }}</span>
              }
            </ng-template>
            
            <div class="tab-content">
              @if (inProgressTasks().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon">hourglass_empty</mat-icon>
                  <h3>Sin tareas en progreso</h3>
                  <p>Comienza una tarea pendiente para verla aquí.</p>
                </div>
              } @else {
                <div class="tasks-grid">
                  @for (task of inProgressTasks(); track task.id) {
                    <mat-card class="task-card progress-card">
                      <mat-card-header>
                        <div class="task-header">
                          <h3>{{ task.title }}</h3>
                          <div class="task-badges">
                            <mat-chip [class]="'priority-' + task.priority">
                              {{ getPriorityLabel(task.priority) }}
                            </mat-chip>
                            <mat-chip class="status-in-progress">
                              En Progreso
                            </mat-chip>
                          </div>
                        </div>
                      </mat-card-header>

                      <mat-card-content>
                        @if (task.description) {
                          <p class="task-description">{{ task.description }}</p>
                        }

                        <div class="task-details">
                          @if (task.dueDate) {
                            <div class="detail-item" [class.overdue]="isOverdue(task)">
                              <mat-icon>schedule</mat-icon>
                              <span>Vence: {{ formatDate(task.dueDate) }}</span>
                              @if (isOverdue(task)) {
                                <mat-icon class="warning-icon">warning</mat-icon>
                              }
                            </div>
                          }
                          
                          <div class="detail-item">
                            <mat-icon>play_arrow</mat-icon>
                            <span>Iniciada: {{ formatDate(task.updatedAt) }}</span>
                          </div>
                        </div>
                      </mat-card-content>

                      <mat-card-actions>
                        <button mat-raised-button color="accent" (click)="completeTask(task)">
                          <mat-icon>check_circle</mat-icon>
                          Completar
                        </button>
                        <button mat-button (click)="viewTaskDetails(task)">
                          <mat-icon>visibility</mat-icon>
                          Ver Detalles
                        </button>
                      </mat-card-actions>
                    </mat-card>
                  }
                </div>
              }
            </div>
          </mat-tab>

          <!-- Tareas Completadas -->
          <mat-tab>
            <ng-template mat-tab-label>
              <mat-icon>check_circle</mat-icon>
              Completadas
              @if (completedTasks().length > 0) {
                <span class="tab-badge">{{ completedTasks().length }}</span>
              }
            </ng-template>
            
            <div class="tab-content">
              @if (completedTasks().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon">assignment_turned_in</mat-icon>
                  <h3>Sin tareas completadas</h3>
                  <p>Las tareas que completes aparecerán aquí.</p>
                </div>
              } @else {
                <div class="tasks-grid">
                  @for (task of completedTasks(); track task.id) {
                    <mat-card class="task-card completed-card">
                      <mat-card-header>
                        <div class="task-header">
                          <h3>{{ task.title }}</h3>
                          <div class="task-badges">
                            <mat-chip [class]="'priority-' + task.priority">
                              {{ getPriorityLabel(task.priority) }}
                            </mat-chip>
                            <mat-chip class="status-completed">
                              <mat-icon>check</mat-icon>
                              Completada
                            </mat-chip>
                          </div>
                        </div>
                      </mat-card-header>

                      <mat-card-content>
                        @if (task.description) {
                          <p class="task-description">{{ task.description }}</p>
                        }

                        <div class="task-details">
                          <div class="detail-item success">
                            <mat-icon>check_circle</mat-icon>
                            <span>Completada: {{ formatDate(task.completedAt!) }}</span>
                          </div>
                          
                          @if (task.dueDate) {
                            <div class="detail-item">
                              <mat-icon>schedule</mat-icon>
                              <span>Fecha límite: {{ formatDate(task.dueDate) }}</span>
                            </div>
                          }
                        </div>
                      </mat-card-content>

                      <mat-card-actions>
                        <button mat-button (click)="viewTaskDetails(task)">
                          <mat-icon>visibility</mat-icon>
                          Ver Detalles
                        </button>
                      </mat-card-actions>
                    </mat-card>
                  }
                </div>
              }
            </div>
          </mat-tab>
        </mat-tab-group>
      }
    </div>
  `,
  styles: [`
    .my-tasks-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      color: #333;
    }

    .header-stats {
      display: flex;
      gap: 24px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-number {
      display: block;
      font-size: 24px;
      font-weight: 600;
      color: #2196f3;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      gap: 16px;
    }

    .tasks-tabs {
      margin-top: 24px;
    }

    .tab-badge {
      background: #f44336;
      color: white;
      border-radius: 10px;
      padding: 2px 6px;
      font-size: 11px;
      margin-left: 8px;
    }

    .tab-content {
      padding: 24px 0;
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .empty-state p {
      margin: 0;
      color: #666;
    }

    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 24px;
    }

    .task-card {
      transition: all 0.3s ease;
      border-left: 4px solid transparent;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }

    .pending-card {
      border-left-color: #2196f3;
    }

    .progress-card {
      border-left-color: #9c27b0;
    }

    .completed-card {
      border-left-color: #4caf50;
      opacity: 0.9;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      gap: 16px;
    }

    .task-header h3 {
      margin: 0;
      color: #333;
      font-size: 18px;
      flex: 1;
    }

    .task-badges {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-end;
    }

    .task-badges mat-chip {
      font-size: 11px;
      height: 20px;
      min-height: 20px;
    }

    .priority-high {
      background-color: #ffebee;
      color: #c62828;
    }

    .priority-medium {
      background-color: #fff3e0;
      color: #ef6c00;
    }

    .priority-low {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-in-progress {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .status-completed {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .task-description {
      margin: 16px 0;
      color: #666;
      line-height: 1.5;
    }

    .task-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
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

    .detail-item.overdue {
      color: #f44336;
    }

    .detail-item.success {
      color: #4caf50;
    }

    .warning-icon {
      color: #f44336;
      margin-left: auto;
    }

    mat-card-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .my-tasks-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .header-stats {
        justify-content: space-around;
      }

      .tasks-grid {
        grid-template-columns: 1fr;
      }

      .task-header {
        flex-direction: column;
        gap: 12px;
      }

      .task-badges {
        align-items: flex-start;
        flex-direction: row;
      }
    }
  `]
})
export class MyTasksComponent implements OnInit {
  tasks = signal<Task[]>([]);
  pendingTasks = signal<Task[]>([]);
  inProgressTasks = signal<Task[]>([]);
  completedTasks = signal<Task[]>([]);
  currentUser = signal<any>(null);
  isLoading = signal(true);

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser());
    this.loadMyTasks();
  }

  loadMyTasks(): void {
    this.taskService.getMyTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.categorizeTasksByStatus(tasks);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading my tasks:', error);
        this.isLoading.set(false);
        this.snackBar.open('Error al cargar tus tareas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  categorizeTasksByStatus(tasks: Task[]): void {
    this.pendingTasks.set(tasks.filter(task => task.status === 'pending'));
    this.inProgressTasks.set(tasks.filter(task => task.status === 'in_progress'));
    this.completedTasks.set(tasks.filter(task => task.status === 'completed'));
  }

  onTabChange(event: any): void {
    // Opcional: realizar acciones cuando cambie de tab
  }

  startTask(task: Task): void {
    this.taskService.updateTask(task.id, { status: 'in_progress' }).subscribe({
      next: () => {
        this.loadMyTasks();
        this.snackBar.open('¡Tarea iniciada!', 'Cerrar', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error starting task:', error);
        this.snackBar.open('Error al iniciar la tarea', 'Cerrar', { duration: 3000 });
      }
    });
  }

  completeTask(task: Task): void {
    this.taskService.completeTask(task.id).subscribe({
      next: () => {
        this.loadMyTasks();
        this.snackBar.open('¡Felicidades! Tarea completada 🎉', 'Cerrar', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('Error completing task:', error);
        this.snackBar.open('Error al completar la tarea', 'Cerrar', { duration: 3000 });
      }
    });
  }

  viewTaskDetails(task: Task): void {
    // En una implementación real, esto abriría un diálogo o navegaría a una página de detalles
    console.log('View task details:', task);
  }

  getPriorityLabel(priority: string): string {
    const labels = {
      'low': 'Baja',
      'medium': 'Media',
      'high': 'Alta'
    };
    return labels[priority as keyof typeof labels] || priority;
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && task.status !== 'completed';
  }

  formatDate(date: string | Date): string {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}