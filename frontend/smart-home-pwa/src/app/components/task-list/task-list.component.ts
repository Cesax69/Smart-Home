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
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TaskService } from '../../services/task.service';
import { AuthService } from '../../services/auth.service';
import { Task } from '../../models/task.model';
import { User } from '../../models/user.model';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
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
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="task-list-container">
      <div class="header">
        <h1>📋 Gestión de Tareas</h1>
        <button mat-raised-button color="primary" (click)="goToCreateTask()" 
                *ngIf="currentUser()?.role === 'head_of_household'">
          <mat-icon>add</mat-icon>
          Nueva Tarea
        </button>
      </div>

      <!-- Filtros -->
      <mat-card class="filters-card">
        <mat-card-content>
          <div class="filters-row">
            <mat-form-field appearance="outline">
              <mat-label>Buscar tareas</mat-label>
              <input matInput [(ngModel)]="searchTerm" (input)="applyFilters()" placeholder="Título o descripción...">
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Estado</mat-label>
              <mat-select [(ngModel)]="statusFilter" (selectionChange)="applyFilters()">
                <mat-option value="">Todos</mat-option>
                <mat-option value="pending">Pendiente</mat-option>
                <mat-option value="in_progress">En Progreso</mat-option>
                <mat-option value="completed">Completada</mat-option>
              </mat-select>
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

            <button mat-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Limpiar
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Lista de Tareas -->
      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Cargando tareas...</p>
        </div>
      } @else if (filteredTasks().length === 0) {
        <mat-card class="empty-state">
          <mat-card-content>
            <mat-icon class="empty-icon">assignment</mat-icon>
            <h3>No hay tareas</h3>
            <p>{{ tasks().length === 0 ? 'Aún no se han creado tareas.' : 'No se encontraron tareas con los filtros aplicados.' }}</p>
            @if (currentUser()?.role === 'head_of_household' && tasks().length === 0) {
              <button mat-raised-button color="primary" (click)="goToCreateTask()">
                Crear Primera Tarea
              </button>
            }
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="tasks-grid">
          @for (task of filteredTasks(); track task.id) {
            <mat-card class="task-card" [class]="getTaskCardClass(task)">
              <mat-card-header>
                <div class="task-header">
                  <div class="task-title-section">
                    <h3>{{ task.title }}</h3>
                    <div class="task-badges">
                      <mat-chip [class]="'priority-' + task.priority">
                        {{ getPriorityLabel(task.priority) }}
                      </mat-chip>
                      <mat-chip [class]="'status-' + task.status">
                        {{ getStatusLabel(task.status) }}
                      </mat-chip>
                    </div>
                  </div>
                  
                  @if (canManageTask(task)) {
                    <button mat-icon-button [matMenuTriggerFor]="taskMenu">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    
                    <mat-menu #taskMenu="matMenu">
                      @if (task.status !== 'completed') {
                        <button mat-menu-item (click)="editTask(task)">
                          <mat-icon>edit</mat-icon>
                          <span>Editar</span>
                        </button>
                        
                        @if (task.assignedTo === currentUser()?.id) {
                          <button mat-menu-item (click)="completeTask(task)">
                            <mat-icon>check_circle</mat-icon>
                            <span>Marcar Completada</span>
                          </button>
                        }
                        
                        @if (currentUser()?.role === 'head_of_household') {
                          <button mat-menu-item (click)="reassignTask(task)">
                            <mat-icon>person_add</mat-icon>
                            <span>Reasignar</span>
                          </button>
                        }
                      }
                      
                      @if (currentUser()?.role === 'head_of_household') {
                        <button mat-menu-item (click)="deleteTask(task)" class="delete-option">
                          <mat-icon>delete</mat-icon>
                          <span>Eliminar</span>
                        </button>
                      }
                    </mat-menu>
                  }
                </div>
              </mat-card-header>

              <mat-card-content>
                @if (task.description) {
                  <p class="task-description">{{ task.description }}</p>
                }

                <div class="task-details">
                  <div class="detail-item">
                    <mat-icon>person</mat-icon>
                    <span>Asignada a: {{ getAssignedUserName(task) }}</span>
                  </div>
                  
                  @if (task.dueDate) {
                    <div class="detail-item" [class.overdue]="isOverdue(task)">
                      <mat-icon>schedule</mat-icon>
                      <span>Vence: {{ formatDate(task.dueDate) }}</span>
                    </div>
                  }
                  
                  <div class="detail-item">
                    <mat-icon>calendar_today</mat-icon>
                    <span>Creada: {{ formatDate(task.createdAt) }}</span>
                  </div>
                  
                  @if (task.completedAt) {
                    <div class="detail-item">
                      <mat-icon>check</mat-icon>
                      <span>Completada: {{ formatDate(task.completedAt) }}</span>
                    </div>
                  }
                </div>
              </mat-card-content>

              @if (task.assignedTo === currentUser()?.id && task.status !== 'completed') {
                <mat-card-actions>
                  @if (task.status === 'pending') {
                    <button mat-button color="primary" (click)="startTask(task)">
                      <mat-icon>play_arrow</mat-icon>
                      Comenzar
                    </button>
                  }
                  
                  <button mat-raised-button color="accent" (click)="completeTask(task)">
                    <mat-icon>check_circle</mat-icon>
                    Completar
                  </button>
                </mat-card-actions>
              }
            </mat-card>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .task-list-container {
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

    .filters-card {
      margin-bottom: 24px;
    }

    .filters-row {
      display: flex;
      gap: 16px;
      align-items: center;
      flex-wrap: wrap;
    }

    .filters-row mat-form-field {
      min-width: 200px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      gap: 16px;
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

    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
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

    .task-card.priority-high {
      border-left-color: #f44336;
    }

    .task-card.priority-medium {
      border-left-color: #ff9800;
    }

    .task-card.priority-low {
      border-left-color: #4caf50;
    }

    .task-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }

    .task-title-section {
      flex: 1;
    }

    .task-title-section h3 {
      margin: 0 0 8px 0;
      color: #333;
      font-size: 18px;
    }

    .task-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .task-badges mat-chip {
      font-size: 12px;
      height: 24px;
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

    .status-pending {
      background-color: #e3f2fd;
      color: #1565c0;
    }

    .status-in_progress {
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

    .delete-option {
      color: #f44336;
    }

    mat-card-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    @media (max-width: 768px) {
      .task-list-container {
        padding: 16px;
      }

      .header {
        flex-direction: column;
        gap: 16px;
        align-items: stretch;
      }

      .filters-row {
        flex-direction: column;
      }

      .filters-row mat-form-field {
        min-width: unset;
        width: 100%;
      }

      .tasks-grid {
        grid-template-columns: 1fr;
      }

      .task-header {
        flex-direction: column;
        gap: 12px;
      }
    }
  `]
})
export class TaskListComponent implements OnInit {
  tasks = signal<Task[]>([]);
  filteredTasks = signal<Task[]>([]);
  currentUser = signal<any>(null);
  isLoading = signal(true);

  searchTerm = '';
  statusFilter = '';
  priorityFilter = '';

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser());
    this.loadTasks();
  }

  loadTasks(): void {
    this.taskService.getTasks().subscribe({
      next: (response) => {
        this.tasks.set(response.tasks);
        this.filteredTasks.set(response.tasks);
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading tasks:', error);
        this.isLoading.set(false);
        this.snackBar.open('Error al cargar las tareas', 'Cerrar', { duration: 3000 });
      }
    });
  }

  applyFilters(): void {
    let filtered = this.tasks();

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(term) || 
        task.description?.toLowerCase().includes(term)
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(task => task.status === this.statusFilter);
    }

    if (this.priorityFilter) {
      filtered = filtered.filter(task => task.priority === this.priorityFilter);
    }

    this.filteredTasks.set(filtered);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.filteredTasks.set(this.tasks());
  }

  canManageTask(task: Task): boolean {
    const user = this.currentUser();
    return user?.role === 'head_of_household' || task.assignedTo === user?.id;
  }

  getTaskCardClass(task: Task): string {
    return `priority-${task.priority}`;
  }

  getPriorityLabel(priority: string): string {
    const labels = {
      'low': 'Baja',
      'medium': 'Media',
      'high': 'Alta'
    };
    return labels[priority as keyof typeof labels] || priority;
  }

  getStatusLabel(status: string): string {
    const labels = {
      'pending': 'Pendiente',
      'in_progress': 'En Progreso',
      'completed': 'Completada'
    };
    return labels[status as keyof typeof labels] || status;
  }

  getAssignedUserName(task: Task): string {
    // En una implementación real, esto vendría de un servicio de usuarios
    return `Usuario ${task.assignedTo}`;
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

  startTask(task: Task): void {
    this.taskService.updateTask(task.id, { status: 'in_progress' }).subscribe({
      next: () => {
        this.loadTasks();
        this.snackBar.open('Tarea iniciada', 'Cerrar', { duration: 2000 });
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
        this.loadTasks();
        this.snackBar.open('¡Tarea completada!', 'Cerrar', { duration: 2000 });
      },
      error: (error) => {
        console.error('Error completing task:', error);
        this.snackBar.open('Error al completar la tarea', 'Cerrar', { duration: 3000 });
      }
    });
  }

  editTask(task: Task): void {
    this.router.navigate(['/tasks/edit', task.id]);
  }

  reassignTask(task: Task): void {
    // Implementar diálogo de reasignación
    console.log('Reassign task:', task);
  }

  deleteTask(task: Task): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: '🗑️ Eliminar Tarea',
        message: `¿Estás seguro de que quieres eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`,
        confirmText: 'Sí, eliminar',
        cancelText: 'Cancelar',
        icon: 'delete_forever',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskService.deleteTask(task.id).subscribe({
          next: () => {
            this.loadTasks();
            this.snackBar.open('🎉 Tarea eliminada exitosamente', 'Cerrar', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error) => {
            console.error('Error deleting task:', error);
            this.snackBar.open('❌ Error al eliminar la tarea', 'Cerrar', { 
              duration: 4000,
              panelClass: ['error-snackbar']
            });
          }
        });
      }
    });
  }

  goToCreateTask(): void {
    this.router.navigate(['/tasks/create']);
  }
}