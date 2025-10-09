import { Component, OnInit, signal, inject } from '@angular/core';
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
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task } from '../../../models/task.model';
import { ConfirmDialogComponent } from '../../../../../components/confirm-dialog/confirm-dialog.component';
import { TaskActionsDialogComponent } from './task-actions-dialog.component';

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
    MatProgressBarModule,
    MatTabsModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="my-tasks-container">
      <div class="header">
        <h1>👤 Mis Tareas</h1>
        <div class="header-stats">
          <div class="stat-item">
            <span class="stat-number">{{ filteredPendingTasks().length }}</span>
            <span class="stat-label">Pendientes</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ filteredInProgressTasks().length }}</span>
            <span class="stat-label">En Progreso</span>
          </div>
          <div class="stat-item">
            <span class="stat-number">{{ filteredCompletedTasks().length }}</span>
            <span class="stat-label">Completadas</span>
          </div>
        </div>
        <div class="header-actions">
          <button mat-stroked-button color="primary" (click)="reloadTasks()" [disabled]="isLoading()">
            <mat-icon>refresh</mat-icon>
            Recargar
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <mat-card class="filters-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>filter_list</mat-icon>
            Filtros
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="filters-container">
            <mat-form-field appearance="outline">
              <mat-label>Buscar tareas</mat-label>
              <input matInput [(ngModel)]="searchTerm" (input)="applyFilters()" placeholder="Buscar por título o descripción">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Prioridad</mat-label>
              <mat-select [(ngModel)]="priorityFilter" (selectionChange)="applyFilters()">
                <mat-option value="">Todas</mat-option>
                <mat-option value="low">Baja</mat-option>
                <mat-option value="medium">Media</mat-option>
                <mat-option value="high">Alta</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Fecha de Vencimiento</mat-label>
              <mat-select [(ngModel)]="dueDateFilter" (selectionChange)="applyFilters()">
                <mat-option value="">Todas</mat-option>
                <mat-option value="overdue">Vencidas</mat-option>
                <mat-option value="today">Hoy</mat-option>
                <mat-option value="tomorrow">Mañana</mat-option>
                <mat-option value="this_week">Esta Semana</mat-option>
                <mat-option value="no_date">Sin Fecha</mat-option>
              </mat-select>
            </mat-form-field>

            <button mat-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Limpiar
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Cargando tus tareas...</p>
        </div>
      } @else {
        <mat-tab-group (selectedTabChange)="onTabChange($event)">
          <!-- Tab Pendientes -->
          <mat-tab label="Pendientes">
            @if (filteredPendingTasks().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">pending_actions</mat-icon>
                @if (pendingTasks().length === 0) {
                  <h3>¡Genial! No tienes tareas pendientes</h3>
                  <p>Todas tus tareas están en progreso o completadas.</p>
                } @else {
                  <h3>No hay tareas pendientes con los filtros aplicados</h3>
                  <p>Intenta cambiar los filtros para ver más tareas.</p>
                }
              </div>
            } @else {
              <div class="tasks-grid">
                @for (task of filteredPendingTasks(); track task.id) {
                  <mat-card class="task-card pending-card">
                    <mat-card-header>
                      <div class="task-header">
                        <h3>{{ task.title }}</h3>
                        <div class="task-badges">
                          <mat-chip [class]="'priority-' + task.priority">
                            {{ getPriorityLabel(task.priority) }}
                          </mat-chip>
                          <mat-chip class="status-pending">
                            <mat-icon>schedule</mat-icon>
                            Pendiente
                          </mat-chip>
                          @if (isOverdue(task)) {
                            <mat-icon class="warning-icon" matTooltip="Tarea vencida">warning</mat-icon>
                          }
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
                          </div>
                        }
                        @if (task.estimatedTime) {
                          <div class="detail-item">
                            <mat-icon>timer</mat-icon>
                            <span>Tiempo estimado: {{ task.estimatedTime }}</span>
                          </div>
                        }
                        @if (task.reward) {
                          <div class="detail-item">
                            <mat-icon>star</mat-icon>
                            <span>Recompensa: {{ task.reward }}</span>
                          </div>
                        }
                      </div>
                    </mat-card-content>

                    <mat-card-actions>
                      <button mat-raised-button color="primary" (click)="startTask(task)">
                        <mat-icon>play_arrow</mat-icon>
                        Iniciar
                      </button>
                      <button mat-button (click)="openTaskActions(task)">
                        <mat-icon>more_vert</mat-icon>
                        Más
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }
          </mat-tab>

          <!-- Tab En Progreso -->
          <mat-tab label="En Progreso">
            @if (filteredInProgressTasks().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">hourglass_empty</mat-icon>
                @if (inProgressTasks().length === 0) {
                  <h3>No tienes tareas en progreso</h3>
                  <p>Inicia una tarea pendiente para comenzar a trabajar.</p>
                } @else {
                  <h3>No hay tareas en progreso con los filtros aplicados</h3>
                  <p>Intenta cambiar los filtros para ver más tareas.</p>
                }
              </div>
            } @else {
              <div class="tasks-grid">
                @for (task of filteredInProgressTasks(); track task.id) {
                  <mat-card class="task-card in-progress-card">
                    <mat-card-header>
                      <div class="task-header">
                        <h3>{{ task.title }}</h3>
                        <div class="task-badges">
                          <mat-chip [class]="'priority-' + task.priority">
                            {{ getPriorityLabel(task.priority) }}
                          </mat-chip>
                          <mat-chip class="status-in-progress">
                            <mat-icon>hourglass_empty</mat-icon>
                            En Progreso
                          </mat-chip>
                          @if (isOverdue(task)) {
                            <mat-icon class="warning-icon" matTooltip="Tarea vencida">warning</mat-icon>
                          }
                        </div>
                      </div>
                    </mat-card-header>

                    <mat-card-content>
                      @if (task.description) {
                        <p class="task-description">{{ task.description }}</p>
                      }

                      <!-- Barra de progreso para tareas en proceso -->
                      <div class="progress-section">
                        <div class="progress-header">
                          <span class="progress-label">Progreso</span>
                          <span class="progress-percentage">{{ task.progress || 0 }}%</span>
                        </div>
                        <mat-progress-bar 
                          mode="determinate" 
                          [value]="task.progress || 0"
                          class="task-progress-bar">
                        </mat-progress-bar>
                        <div class="progress-controls">
                          <button mat-icon-button (click)="updateProgress(task, -10)" [disabled]="(task.progress || 0) <= 0">
                            <mat-icon>remove</mat-icon>
                          </button>
                          <span class="progress-text">Actualizar progreso</span>
                          <button mat-icon-button (click)="updateProgress(task, 10)" [disabled]="(task.progress || 0) >= 100">
                            <mat-icon>add</mat-icon>
                          </button>
                        </div>
                      </div>

                      <div class="task-details">
                        @if (task.dueDate) {
                          <div class="detail-item" [class.overdue]="isOverdue(task)">
                            <mat-icon>schedule</mat-icon>
                            <span>Vence: {{ formatDate(task.dueDate) }}</span>
                          </div>
                        }
                        @if (task.estimatedTime) {
                          <div class="detail-item">
                            <mat-icon>timer</mat-icon>
                            <span>Tiempo estimado: {{ task.estimatedTime }}</span>
                          </div>
                        }
                        @if (task.reward) {
                          <div class="detail-item">
                            <mat-icon>star</mat-icon>
                            <span>Recompensa: {{ task.reward }}</span>
                          </div>
                        }
                      </div>
                    </mat-card-content>

                    <mat-card-actions>
                      <button mat-raised-button color="accent" (click)="completeTask(task)" [disabled]="(task.progress || 0) < 100">
                        <mat-icon>check</mat-icon>
                        Completar
                      </button>
                      <button mat-button (click)="openTaskActions(task)">
                        <mat-icon>more_vert</mat-icon>
                        Más
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }
          </mat-tab>

          <!-- Tab Completadas -->
          <mat-tab label="Completadas">
            @if (filteredCompletedTasks().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon">check_circle</mat-icon>
                @if (completedTasks().length === 0) {
                  <h3>Sin tareas completadas</h3>
                  <p>Las tareas que completes aparecerán aquí.</p>
                } @else {
                  <h3>No hay tareas completadas con los filtros aplicados</h3>
                  <p>Intenta cambiar los filtros para ver más tareas.</p>
                }
              </div>
            } @else {
              <div class="tasks-grid">
                @for (task of filteredCompletedTasks(); track task.id) {
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
                          <span>Completada el {{ formatDate(task.completedAt || task.updatedAt) }}</span>
                        </div>
                        @if (task.reward) {
                          <div class="detail-item">
                            <mat-icon>star</mat-icon>
                            <span>Recompensa: {{ task.reward }}</span>
                          </div>
                        }
                      </div>
                    </mat-card-content>

                    <mat-card-actions>
                      <button mat-button (click)="openTaskActions(task)">
                        <mat-icon>visibility</mat-icon>
                        Ver Detalles
                      </button>
                    </mat-card-actions>
                  </mat-card>
                }
              </div>
            }
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
      flex-wrap: wrap;
      gap: 16px;
    }

    .header h1 {
      margin: 0;
      color: #333;
      font-size: 2rem;
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
      font-size: 2rem;
      font-weight: bold;
      color: #1976d2;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
    }

    .header-actions {
      display: flex;
      gap: 12px;
    }

    .filters-card {
      margin-bottom: 24px;
    }

    .filters-container {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      align-items: center;
    }

    .filters-container mat-form-field {
      min-width: 200px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
    }

    .loading-container mat-spinner {
      margin-bottom: 16px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px;
      text-align: center;
      color: #666;
    }

    .empty-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      margin-bottom: 16px;
      color: #ccc;
    }

    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .task-card {
      transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    }

    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .pending-card {
      border-left: 4px solid #ff9800;
    }

    .in-progress-card {
      border-left: 4px solid #2196f3;
    }

    .completed-card {
      border-left: 4px solid #4caf50;
      opacity: 0.8;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      gap: 12px;
    }

    .task-header h3 {
      margin: 0;
      flex: 1;
      font-size: 1.1rem;
      line-height: 1.3;
    }

    .task-badges {
      display: flex;
      flex-direction: column;
      gap: 4px;
      align-items: flex-end;
    }

    .task-badges mat-chip {
      font-size: 0.75rem;
      min-height: 24px;
    }

    .priority-low {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .priority-medium {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .priority-high {
      background-color: #ffebee;
      color: #d32f2f;
    }

    .status-pending {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .status-in-progress {
      background-color: #e3f2fd;
      color: #1976d2;
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

    .progress-section {
      margin: 16px 0;
      padding: 16px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }

    .progress-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .progress-label {
      font-weight: 500;
      color: #495057;
    }

    .progress-percentage {
      font-weight: 600;
      color: #2196f3;
      font-size: 14px;
    }

    .task-progress-bar {
      height: 8px;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .progress-controls {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }

    .progress-text {
      font-size: 12px;
      color: #6c757d;
    }

    .progress-controls button {
      width: 32px;
      height: 32px;
      min-width: 32px;
    }

    .progress-controls button mat-icon {
      font-size: 18px;
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

      .filters-container {
        flex-direction: column;
        align-items: stretch;
      }

      .filters-container mat-form-field {
        min-width: auto;
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
  
  // Tareas filtradas
  filteredPendingTasks = signal<Task[]>([]);
  filteredInProgressTasks = signal<Task[]>([]);
  filteredCompletedTasks = signal<Task[]>([]);
  
  currentUser = signal<any>(null);
  isLoading = signal(true);

  // Filtros
  searchTerm = '';
  priorityFilter = '';
  dueDateFilter = '';

  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser());
    this.loadMyTasks();
  }

  loadMyTasks(): void {
    this.taskService.getMyTasks().subscribe({
      next: (tasks: any) => {
        this.tasks.set(tasks);
        this.categorizeTasksByStatus(tasks);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error: any) => {
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

  applyFilters(): void {
    this.filteredPendingTasks.set(this.filterTasks(this.pendingTasks()));
    this.filteredInProgressTasks.set(this.filterTasks(this.inProgressTasks()));
    this.filteredCompletedTasks.set(this.filterTasks(this.completedTasks()));
  }

  private filterTasks(tasks: Task[]): Task[] {
    return tasks.filter(task => {
      // Filtro de búsqueda
      const matchesSearch = !this.searchTerm || 
        task.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(this.searchTerm.toLowerCase()));

      // Filtro de prioridad
      const matchesPriority = !this.priorityFilter || task.priority === this.priorityFilter;

      // Filtro de fecha de vencimiento
      const matchesDueDate = this.matchesDueDateFilter(task);

      return matchesSearch && matchesPriority && matchesDueDate;
    });
  }

  private matchesDueDateFilter(task: Task): boolean {
    if (!this.dueDateFilter) return true;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (!task.dueDate) {
      return this.dueDateFilter === 'no_date';
    }

    const dueDate = new Date(task.dueDate);
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    switch (this.dueDateFilter) {
      case 'overdue':
        return dueDateOnly < today && task.status !== 'completed';
      case 'today':
        return dueDateOnly.getTime() === today.getTime();
      case 'tomorrow':
        return dueDateOnly.getTime() === tomorrow.getTime();
      case 'this_week':
        return dueDateOnly >= today && dueDateOnly <= nextWeek;
      case 'no_date':
        return false; // Ya se maneja arriba
      default:
        return true;
    }
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.priorityFilter = '';
    this.dueDateFilter = '';
    this.applyFilters();
  }

  onTabChange(event: any): void {
    // Opcional: realizar acciones cuando cambie de tab
  }

  startTask(task: Task): void {
    // Validar que la tarea esté en estado pendiente
    if (task.status !== 'pending') {
      this.snackBar.open('⚠️ Solo se pueden iniciar tareas que estén pendientes', 'Cerrar', { 
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    // Confirmación antes de iniciar la tarea
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Iniciar Tarea',
        message: `¿Estás listo para comenzar con "${task.title}"? La tarea se moverá a la sección "En Progreso".`,
        confirmText: 'Sí, Iniciar',
        cancelText: 'Cancelar',
        icon: 'play_arrow',
        color: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskService.startTask(task.id).subscribe({
          next: (updatedTask) => {
            // Actualizar la tarea localmente para una respuesta más rápida
            const updatedTasks = this.tasks().map(t => 
              t.id === task.id ? { ...t, status: 'in_progress' as const, progress: 0, updatedAt: new Date() } : t
            );
            this.tasks.set(updatedTasks);
            this.categorizeTasksByStatus(updatedTasks);
            this.applyFilters();
            
            this.snackBar.open('🚀 ¡Tarea iniciada! Ahora está en progreso', 'Cerrar', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error: any) => {
            console.error('Error starting task:', error);
            this.snackBar.open('❌ Error al iniciar la tarea. Inténtalo de nuevo.', 'Cerrar', { 
              duration: 4000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  updateProgress(task: Task, increment: number): void {
    const currentProgress = task.progress || 0;
    const newProgress = Math.max(0, Math.min(100, currentProgress + increment));
    
    this.taskService.updateTask(task.id, { progress: newProgress }).subscribe({
      next: () => {
        // Actualizar la tarea local
        const updatedTasks = this.tasks().map(t => 
          t.id === task.id ? { ...t, progress: newProgress } : t
        );
        this.tasks.set(updatedTasks);
        this.categorizeTasksByStatus(updatedTasks);
        this.applyFilters();
        
        this.snackBar.open(`Progreso actualizado a ${newProgress}%`, 'Cerrar', { 
          duration: 2000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error: any) => {
        console.error('Error updating progress:', error);
        this.snackBar.open('Error al actualizar el progreso', 'Cerrar', { duration: 3000 });
      }
    });
  }

  completeTask(task: Task): void {
    // Validar que la tarea esté en progreso
    if (task.status !== 'in_progress') {
      this.snackBar.open('⚠️ Solo se pueden completar tareas que estén en progreso', 'Cerrar', { 
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    // Confirmación antes de completar la tarea
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Completar Tarea',
        message: `¿Has terminado completamente "${task.title}"? Esta acción marcará la tarea como finalizada y se moverá a la sección "Completadas".`,
        confirmText: 'Sí, Completar',
        cancelText: 'Cancelar',
        icon: 'check_circle',
        color: 'accent'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskService.completeTask(task.id).subscribe({
          next: (completedTask) => {
            // Actualizar la tarea localmente para una respuesta más rápida
            const updatedTasks = this.tasks().map(t => 
              t.id === task.id ? { 
                ...t, 
                status: 'completed' as const, 
                progress: 100, 
                completedAt: new Date(),
                updatedAt: new Date() 
              } : t
            );
            this.tasks.set(updatedTasks);
            this.categorizeTasksByStatus(updatedTasks);
            this.applyFilters();
            
            this.snackBar.open('🎉 ¡Felicidades! Tarea completada exitosamente', 'Cerrar', { 
              duration: 4000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error: any) => {
            console.error('Error completing task:', error);
            this.snackBar.open('❌ Error al completar la tarea. Inténtalo de nuevo.', 'Cerrar', { 
              duration: 4000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  openTaskActions(task: Task): void {
    const dialogRef = this.dialog.open(TaskActionsDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: { task }
    });

    dialogRef.afterClosed().subscribe(result => {
      // Opcional: recargar datos si se hicieron cambios
      if (result) {
        this.loadMyTasks();
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

  reloadTasks(): void {
    if (this.isLoading()) return;
    this.isLoading.set(true);
    this.loadMyTasks();
    this.snackBar.open('Tareas recargadas', 'Cerrar', { duration: 2000 });
  }
}