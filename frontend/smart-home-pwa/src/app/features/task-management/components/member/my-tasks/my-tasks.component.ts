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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CdkDragDrop, DragDropModule, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { AlertService } from '../../../../../services/alert.service';
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
    MatDialogModule,
    MatTooltipModule,
    DragDropModule
  ],
  styleUrls: ['./my-tasks.component.scss'],
  templateUrl: './my-tasks.component.html'
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
  private alerts = inject(AlertService);
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
        this.alerts.error('Error al cargar tus tareas');
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
            
            this.alerts.success(`Tarea ${this.getStatusLabel(newStatus)}`);
          },
          error: (error) => {
            console.error('❌ Error completing task:', error);
            this.alerts.error('Error al completar la tarea');
          }
        });
      } else {
        console.error('❌ No hay usuario autenticado para completar la tarea');
        this.alerts.error('Error: No hay usuario autenticado');
      }
    } else {
      console.log('🔄 Processing status change to:', newStatus);
      // Para otros estados, usar updateTask normal
      if (newStatus === 'in_progress' && !task.progress) {
        updatedTask.progress = 0; // Progreso inicial
        console.log('📈 Setting initial progress to 0%');
      }

      // Si movemos a pendiente, reiniciar progreso y limpiar fecha de completado
      if (newStatus === 'pending') {
        updatedTask.progress = 0;
        (updatedTask as any).completedAt = null;
        console.log('↩️ Resetting progress to 0% and clearing completedAt for pending');
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
          
          this.alerts.success(`Tarea ${this.getStatusLabel(newStatus)}`);
        },
        error: (error) => {
          console.error('❌ Error updating task status:', error);
          this.alerts.error('Error al actualizar la tarea');
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
        
        this.alerts.success(`Progreso actualizado a ${newProgress}%`);
      },
      error: (error: any) => {
        console.error('Error updating progress:', error);
        this.alerts.error('Error al actualizar el progreso');
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