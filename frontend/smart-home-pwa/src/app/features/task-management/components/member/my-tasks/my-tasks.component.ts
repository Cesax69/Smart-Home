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
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
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
    MatDialogModule,
    MatTooltipModule,
    DragDropModule
  ],
  styleUrls: ['./my-tasks-trello.styles.css'],
  template: `
    <div class="trello-board">
      <!-- Header con estadísticas -->
      <div class="board-header">
        <div class="header-content">
          <h1 class="board-title">
            <mat-icon class="title-icon">dashboard</mat-icon>
            Mi Tablero de Tareas
          </h1>
          <div class="board-stats">
            <div class="stat-card pending">
              <div class="stat-number">{{ filteredPendingTasks().length }}</div>
              <div class="stat-label">Por Hacer</div>
            </div>
            <div class="stat-card in-progress">
              <div class="stat-number">{{ filteredInProgressTasks().length }}</div>
              <div class="stat-label">En Progreso</div>
            </div>
            <div class="stat-card completed">
              <div class="stat-number">{{ filteredCompletedTasks().length }}</div>
              <div class="stat-label">Completadas</div>
            </div>
          </div>
          <button mat-fab color="primary" class="refresh-btn" (click)="reloadTasks()" [disabled]="isLoading()">
            <mat-icon>refresh</mat-icon>
          </button>
        </div>
      </div>

      <!-- Filtros modernos -->
      <div class="filters-section">
        <div class="search-container">
          <mat-form-field appearance="outline" class="search-field">
            <mat-label>Buscar tareas</mat-label>
            <input matInput [(ngModel)]="searchTerm" (input)="applyFilters()" placeholder="Buscar por título...">
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          
          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Prioridad</mat-label>
            <mat-select [(ngModel)]="priorityFilter" (selectionChange)="applyFilters()">
              <mat-option value="">Todas</mat-option>
              <mat-option value="low">🟢 Baja</mat-option>
              <mat-option value="medium">🟡 Media</mat-option>
              <mat-option value="high">🔴 Alta</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="filter-field">
            <mat-label>Vencimiento</mat-label>
            <mat-select [(ngModel)]="dueDateFilter" (selectionChange)="applyFilters()">
              <mat-option value="">Todas</mat-option>
              <mat-option value="overdue">⚠️ Vencidas</mat-option>
              <mat-option value="today">📅 Hoy</mat-option>
              <mat-option value="tomorrow">⏰ Mañana</mat-option>
              <mat-option value="week">📆 Esta semana</mat-option>
            </mat-select>
          </mat-form-field>

          <button mat-stroked-button (click)="clearFilters()" class="clear-filters-btn">
            <mat-icon>clear_all</mat-icon>
            Limpiar
          </button>
        </div>
      </div>

      <!-- Tablero estilo Trello -->
      <div class="kanban-board" cdkDropListGroup>
        <!-- Columna: Por Hacer -->
        <div class="kanban-column pending-column">
          <div class="column-header">
            <div class="column-title">
              <mat-icon class="column-icon">pending_actions</mat-icon>
              <span>Por Hacer</span>
              <span class="task-count">{{ filteredPendingTasks().length }}</span>
            </div>
          </div>
          
          <div class="column-content" 
               cdkDropList 
               [cdkDropListData]="filteredPendingTasks()"
               (cdkDropListDropped)="onTaskDrop($event, 'pending')">
            
            @if (filteredPendingTasks().length === 0) {
              <div class="empty-column">
                <mat-icon class="empty-icon">task_alt</mat-icon>
                <p>¡Genial! No hay tareas pendientes</p>
              </div>
            }
            
            @for (task of filteredPendingTasks(); track task.id) {
              <div class="task-card" 
                   cdkDrag
                   [class.overdue]="isOverdue(task)"
                   (click)="openTaskActions(task)">
                
                <div class="task-header">
                  <div class="task-priority" [class]="'priority-' + task.priority">
                    @switch (task.priority) {
                      @case ('high') { 🔴 }
                      @case ('medium') { 🟡 }
                      @case ('low') { 🟢 }
                    }
                  </div>
                  <div class="task-category">{{ getCategoryIcon(task.category) }}</div>
                </div>
                
                <h3 class="task-title">{{ task.title }}</h3>
                <p class="task-description">{{ task.description | slice:0:80 }}{{ task.description && task.description.length > 80 ? '...' : '' }}</p>
                
                <div class="task-footer">
                  @if (task.dueDate) {
                    <div class="due-date" [class.overdue]="isOverdue(task)">
                      <mat-icon>schedule</mat-icon>
                      {{ formatDueDate(task.dueDate) }}
                    </div>
                  }
                  
                  <div class="task-actions">
                    <button mat-icon-button (click)="$event.stopPropagation(); startTask(task)" 
                            matTooltip="Iniciar tarea">
                      <mat-icon>play_arrow</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Columna: En Progreso -->
        <div class="kanban-column in-progress-column">
          <div class="column-header">
            <div class="column-title">
              <mat-icon class="column-icon">hourglass_empty</mat-icon>
              <span>En Progreso</span>
              <span class="task-count">{{ filteredInProgressTasks().length }}</span>
            </div>
          </div>
          
          <div class="column-content" 
               cdkDropList 
               [cdkDropListData]="filteredInProgressTasks()"
               (cdkDropListDropped)="onTaskDrop($event, 'in_progress')">
            
            @if (filteredInProgressTasks().length === 0) {
              <div class="empty-column">
                <mat-icon class="empty-icon">work</mat-icon>
                <p>Arrastra tareas aquí para comenzar</p>
              </div>
            }
            
            @for (task of filteredInProgressTasks(); track task.id) {
              <div class="task-card working" 
                   cdkDrag
                   [class.overdue]="isOverdue(task)"
                   (click)="openTaskActions(task)">
                
                <div class="task-header">
                  <div class="task-priority" [class]="'priority-' + task.priority">
                    @switch (task.priority) {
                      @case ('high') { 🔴 }
                      @case ('medium') { 🟡 }
                      @case ('low') { 🟢 }
                    }
                  </div>
                  <div class="task-category">{{ getCategoryIcon(task.category) }}</div>
                  <div class="working-indicator">
                    <mat-icon class="pulse">work</mat-icon>
                  </div>
                </div>
                
                <h3 class="task-title">{{ task.title }}</h3>
                <p class="task-description">{{ task.description | slice:0:80 }}{{ task.description && task.description.length > 80 ? '...' : '' }}</p>
                
                @if (task.progress !== undefined) {
                  <div class="progress-section">
                    <div class="progress-label">Progreso: {{ task.progress }}%</div>
                    <mat-progress-bar [value]="task.progress" mode="determinate"></mat-progress-bar>
                    <div class="progress-controls">
                      <button mat-icon-button (click)="$event.stopPropagation(); updateProgress(task, -10)" 
                              [disabled]="task.progress <= 0"
                              matTooltip="Reducir progreso">
                        <mat-icon>remove</mat-icon>
                      </button>
                      <button mat-icon-button (click)="$event.stopPropagation(); updateProgress(task, 10)" 
                              [disabled]="task.progress >= 100"
                              matTooltip="Aumentar progreso">
                        <mat-icon>add</mat-icon>
                      </button>
                    </div>
                  </div>
                }
                
                <div class="task-footer">
                  @if (task.dueDate) {
                    <div class="due-date" [class.overdue]="isOverdue(task)">
                      <mat-icon>schedule</mat-icon>
                      {{ formatDueDate(task.dueDate) }}
                    </div>
                  }
                  
                  <div class="task-actions">
                    <button mat-icon-button 
                            (click)="$event.stopPropagation(); completeTask(task)" 
                            [disabled]="(task.progress || 0) < 100"
                            [matTooltip]="(task.progress || 0) < 100 ? 'Completa el progreso al 100% para activar' : 'Completar tarea'">
                      <mat-icon>check_circle</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Columna: Completadas -->
        <div class="kanban-column completed-column">
          <div class="column-header">
            <div class="column-title">
              <mat-icon class="column-icon">check_circle</mat-icon>
              <span>Completadas</span>
              <span class="task-count">{{ filteredCompletedTasks().length }}</span>
            </div>
          </div>
          
          <div class="column-content" 
               cdkDropList 
               [cdkDropListData]="filteredCompletedTasks()"
               (cdkDropListDropped)="onTaskDrop($event, 'completed')">
            
            @if (filteredCompletedTasks().length === 0) {
              <div class="empty-column">
                <mat-icon class="empty-icon">celebration</mat-icon>
                <p>Las tareas completadas aparecerán aquí</p>
              </div>
            }
            
            @for (task of filteredCompletedTasks(); track task.id) {
              <div class="task-card completed" 
                   cdkDrag
                   (click)="openTaskActions(task)">
                
                <div class="task-header">
                  <div class="task-priority" [class]="'priority-' + task.priority">
                    @switch (task.priority) {
                      @case ('high') { 🔴 }
                      @case ('medium') { 🟡 }
                      @case ('low') { 🟢 }
                    }
                  </div>
                  <div class="task-category">{{ getCategoryIcon(task.category) }}</div>
                  <div class="completed-indicator">
                    <mat-icon class="success">check_circle</mat-icon>
                  </div>
                </div>
                
                <h3 class="task-title">{{ task.title }}</h3>
                <p class="task-description">{{ task.description | slice:0:80 }}{{ task.description && task.description.length > 80 ? '...' : '' }}</p>
                
                <div class="task-footer">
                  @if (task.completedAt) {
                    <div class="completed-date">
                      <mat-icon>event_available</mat-icon>
                      Completada: {{ formatCompletedDate(task.completedAt) }}
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Loading overlay -->
      @if (isLoading()) {
        <div class="loading-overlay">
          <mat-progress-spinner diameter="50" mode="indeterminate"></mat-progress-spinner>
          <p>Cargando tareas...</p>
        </div>
      }
    </div>
  `,
  styles: [`
    /* Los estilos están en el archivo externo my-tasks-trello.styles.css */
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
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUser.set(currentUser);
      this.loadMyTasks();
    } else {
      console.warn('No hay usuario autenticado en my-tasks');
      this.isLoading.set(false);
    }
  }

  loadMyTasks(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser || !currentUser.id) {
      console.warn('No hay usuario autenticado para cargar mis tareas');
      this.tasks.set([]);
      this.categorizeTasksByStatus([]);
      this.applyFilters();
      this.isLoading.set(false);
      return;
    }

    console.log('Loading tasks for user:', currentUser.id);
    
    this.taskService.getMyTasks().subscribe({
      next: (tasks: any) => {
        console.log('Raw tasks from service:', tasks);
        
        // Filtro adicional por seguridad para asegurar que solo se muestren tareas del usuario actual
        const filteredTasks = tasks.filter((task: any) => 
          task.assignedUserId === currentUser.id || 
          (task.assignedUserIds && task.assignedUserIds.includes(currentUser.id))
        );
        
        console.log('Filtered tasks for user:', filteredTasks);
        
        this.tasks.set(filteredTasks);
        this.categorizeTasksByStatus(filteredTasks);
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
    console.log('🗂️ categorizeTasksByStatus called with tasks:', tasks.length);
    console.log('📋 All tasks statuses:', tasks.map(t => ({ id: t.id, status: t.status, title: t.title })));
    
    // Map backend status values to frontend expected values
    const pending = tasks.filter(task => task.status === 'pending' || task.status === 'pendiente');
    const inProgress = tasks.filter(task => task.status === 'in_progress' || task.status === 'en_proceso');
    const completed = tasks.filter(task => task.status === 'completed' || task.status === 'completada');
    
    console.log('📊 Categorization results:');
    console.log('  - Pending:', pending.length, pending.map(t => ({ id: t.id, title: t.title })));
    console.log('  - In Progress:', inProgress.length, inProgress.map(t => ({ id: t.id, title: t.title })));
    console.log('  - Completed:', completed.length, completed.map(t => ({ id: t.id, title: t.title })));
    
    this.pendingTasks.set(pending);
    this.inProgressTasks.set(inProgress);
    this.completedTasks.set(completed);
    
    console.log('✅ Tasks categorized and signals updated');
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
      case 'week':
        return dueDateOnly >= today && dueDateOnly <= nextWeek;
      default:
        return true;
    }
  }

  // Nuevos métodos para el diseño Trello

  onTaskDrop(event: CdkDragDrop<Task[]>, targetStatus: string): void {
    const task = event.item.data || event.previousContainer.data[event.previousIndex];
    
    if (event.previousContainer === event.container) {
      // Reordenar dentro de la misma columna
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      // Mover entre columnas
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      
      // Actualizar el estado de la tarea
      this.updateTaskStatus(task, targetStatus as 'pending' | 'in_progress' | 'completed');
    }
  }

  updateTaskStatus(task: Task, newStatus: 'pending' | 'in_progress' | 'completed'): void {
    console.log('🔄 updateTaskStatus called:', { taskId: task.id, currentStatus: task.status, newStatus });
    
    const updatedTask = { ...task, status: newStatus };
    
    if (newStatus === 'completed') {
      console.log('✅ Processing completion for task:', task.id);
      updatedTask.completedAt = new Date();
      updatedTask.progress = 100;
      
      // Para tareas completadas, usar el endpoint específico que envía notificaciones
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.id) {
        console.log('👤 Current user found:', currentUser.id);
        this.taskService.completeTaskWithUserId(task.id, currentUser.id).subscribe({
          next: (completedTask: Task) => {
            console.log('✅ Task completed successfully:', completedTask);
            console.log('📊 Task status after completion:', completedTask.status);
            
            // Actualizar la tarea específica en lugar de recargar todas
            const tasks = this.tasks();
            const index = tasks.findIndex(t => t.id === task.id);
            console.log('🔍 Task index in array:', index);
            if (index !== -1) {
              tasks[index] = completedTask;
              this.tasks.set([...tasks]);
              console.log('📝 Updated task in list:', tasks[index]);
              
              // Forzar recategorización
              this.categorizeTasksByStatus(tasks);
              this.applyFilters();
              
              console.log('📋 Completed tasks after update:', this.completedTasks().length);
              console.log('📋 All completed tasks:', this.completedTasks().map(t => ({ id: t.id, status: t.status })));
            }
            
            this.snackBar.open(`Tarea ${this.getStatusLabel(newStatus)}`, 'Cerrar', { 
              duration: 2000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error) => {
            console.error('❌ Error completing task:', error);
            this.snackBar.open('Error al completar la tarea', 'Cerrar', { duration: 3000 });
          }
        });
      } else {
        console.error('❌ No hay usuario autenticado para completar la tarea');
        this.snackBar.open('Error: No hay usuario autenticado', 'Cerrar', { duration: 3000 });
      }
    } else {
      console.log('🔄 Processing status change to:', newStatus);
      // Para otros estados, usar updateTask normal
      if (newStatus === 'in_progress' && !task.progress) {
        updatedTask.progress = 0; // Progreso inicial
        console.log('📈 Setting initial progress to 0%');
      }

      console.log('📤 Sending update request:', updatedTask);
      this.taskService.updateTask(task.id, updatedTask).subscribe({
        next: (updatedTaskResponse: Task) => {
          console.log('✅ Task updated successfully:', updatedTaskResponse);
          console.log('📊 Updated task status:', updatedTaskResponse.status);
          
          // Actualizar la tarea específica en lugar de recargar todas
          const tasks = this.tasks();
          const index = tasks.findIndex(t => t.id === task.id);
          console.log('🔍 Task index in array:', index);
          if (index !== -1) {
            tasks[index] = updatedTaskResponse;
            this.tasks.set([...tasks]);
            console.log('📝 Updated task in list:', tasks[index]);
            this.categorizeTasksByStatus(tasks);
            this.applyFilters();
            
            // Log the categorized tasks
            console.log('📋 Pending tasks:', this.pendingTasks().length);
            console.log('📋 In progress tasks:', this.inProgressTasks().length);
            console.log('📋 Completed tasks:', this.completedTasks().length);
          }
          
          this.snackBar.open(`Tarea ${this.getStatusLabel(newStatus)}`, 'Cerrar', { 
            duration: 2000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error) => {
          console.error('❌ Error updating task status:', error);
          this.snackBar.open('Error al actualizar la tarea', 'Cerrar', { duration: 3000 });
        }
      });
    }
  }

  startTask(task: Task): void {
    this.updateTaskStatus(task, 'in_progress');
  }

  completeTask(task: Task): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Completar Tarea',
        message: `¿Estás seguro de que quieres marcar como completada la tarea "${task.title}"?`,
        confirmText: 'Sí, Completar',
        cancelText: 'Cancelar',
        icon: 'check_circle',
        color: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateTaskStatus(task, 'completed');
      }
    });
  }

  getCategoryIcon(category: string | undefined): string {
    if (!category) return '📋';
    
    const icons: { [key: string]: string } = {
      'limpieza': '🧹',
      'cocina': '🍳',
      'lavanderia': '👕',
      'jardin': '🌱',
      'mantenimiento': '🔧',
      'organizacion': '📦',
      'mascotas': '🐕',
      'compras': '🛒',
      'otros': '📋'
    };
    return icons[category] || '📋';
  }

  formatDueDate(date: Date | string): string {
    const dueDate = new Date(date);
    const now = new Date();
    const diffTime = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return `Vencida hace ${Math.abs(diffDays)} días`;
    } else if (diffDays === 0) {
      return 'Vence hoy';
    } else if (diffDays === 1) {
      return 'Vence mañana';
    } else if (diffDays <= 7) {
      return `Vence en ${diffDays} días`;
    } else {
      return dueDate.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short' 
      });
    }
  }

  formatCompletedDate(date: Date | string): string {
    const completedDate = new Date(date);
    return completedDate.toLocaleDateString('es-ES', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isOverdue(task: Task): boolean {
    if (!task.dueDate || task.status === 'completed') return false;
    return new Date(task.dueDate) < new Date();
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'marcada como pendiente',
      'in_progress': 'iniciada',
      'completed': 'completada'
    };
    return labels[status] || status;
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.priorityFilter = '';
    this.dueDateFilter = '';
    this.applyFilters();
  }

  reloadTasks(): void {
    this.isLoading.set(true);
    this.loadMyTasks();
  }

  openTaskActions(task: Task): void {
    const dialogRef = this.dialog.open(TaskActionsDialogComponent, {
      width: '800px',
      maxWidth: '95vw',
      data: { task },
      panelClass: 'task-actions-dialog'
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'updated') {
        this.loadMyTasks();
      }
    });
  }

  updateProgress(task: Task, increment: number): void {
    const newProgress = Math.max(0, Math.min(100, (task.progress || 0) + increment));
    
    // Crear la tarea actualizada
    const updatedTask = { ...task, progress: newProgress };
    
    // Si el progreso llega a 100%, marcar como completada
    if (newProgress === 100) {
      updatedTask.status = 'completed';
      updatedTask.completedAt = new Date();
    }
    
    // Actualizar inmediatamente en las listas locales
    this.updateTaskInLists(updatedTask);
    
    this.taskService.updateTask(task.id, { progress: newProgress }).subscribe({
      next: (serverUpdatedTask: Task) => {
        // Actualizar con la respuesta del servidor para sincronizar
        this.updateTaskInLists(serverUpdatedTask);
        
        this.snackBar.open(
          `Progreso actualizado a ${newProgress}%`, 
          'Cerrar', 
          { duration: 2000 }
        );
      },
      error: (error: any) => {
        console.error('Error updating progress:', error);
        this.snackBar.open('Error al actualizar el progreso', 'Cerrar', { duration: 3000 });
        // En caso de error, recargar para sincronizar
        this.loadMyTasks();
      }
    });
  }

  private updateTaskInLists(updatedTask: Task): void {
    // Actualizar en todas las listas
    const updateInList = (list: Task[]) => {
      const index = list.findIndex(t => t.id === updatedTask.id);
      if (index !== -1) {
        list[index] = updatedTask;
      }
    };

    const allTasks = this.tasks();
    updateInList(allTasks);
    this.tasks.set([...allTasks]);

    const pendingTasks = this.pendingTasks();
    updateInList(pendingTasks);
    this.pendingTasks.set([...pendingTasks]);

    const inProgressTasks = this.inProgressTasks();
    updateInList(inProgressTasks);
    this.inProgressTasks.set([...inProgressTasks]);

    const completedTasks = this.completedTasks();
    updateInList(completedTasks);
    this.completedTasks.set([...completedTasks]);

    // Aplicar filtros para actualizar las listas filtradas
    this.applyFilters();
  }
}