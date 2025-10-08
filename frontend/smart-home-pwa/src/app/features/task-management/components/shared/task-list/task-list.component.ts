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

// Imports actualizados para la nueva estructura
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task } from '../../../models/task.model';
import { User } from '../../../../../models/user.model';
import { ConfirmDialogComponent } from '../../../../../components/confirm-dialog/confirm-dialog.component';
import { TaskCreateComponent } from '../../admin/task-create/task-create.component';
import { TaskEditComponent } from '../task-edit/task-edit.component';

@Component({
  selector: 'app-task-list',
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
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss'
})
export class TaskListComponent implements OnInit {
  tasks = signal<Task[]>([]);
  filteredTasks = signal<Task[]>([]);
  currentUser = signal<any>(null);
  isLoading = signal(true);
  private memberNameMap = new Map<number, string>();

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
    this.loadTasks();
    this.currentUser.set(this.authService.getCurrentUser());
    // Cargar miembros para mostrar nombres
    this.authService.getFamilyMembers().subscribe({
      next: (members: User[]) => {
        members.forEach(m => this.memberNameMap.set(m.id, `${m.firstName ?? ''} ${m.lastName ?? ''}`.trim() || m.username || `Usuario ${m.id}`));
      },
      error: () => {}
    });
  }

  loadTasks(): void {
    this.isLoading.set(true);
    this.taskService.getTasks().subscribe({
      next: (response: any) => {
        this.tasks.set(response.tasks);
        this.applyFilters();
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading tasks:', error);
        this.snackBar.open('Error al cargar las tareas', 'Cerrar', { duration: 3000 });
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.tasks();

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        task.title.toLowerCase().includes(term) || 
        task.description.toLowerCase().includes(term)
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
    this.applyFilters();
  }

  reloadTasks(): void {
    this.loadTasks();
    this.snackBar.open('Tareas recargadas', 'Cerrar', { duration: 2000 });
  }

  canManageTask(task: Task): boolean {
    const user = this.currentUser();
    return !!user && (user.role === 'head_of_household' || this.isAssignedToMe(task));
  }

  openEditTask(task: Task): void {
    const dialogRef = this.dialog.open(TaskEditComponent, {
      width: '760px',
      maxWidth: '95vw',
      data: { taskId: task.id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Tarea actualizada', 'Cerrar', { duration: 2000 });
        this.reloadTasks();
      }
    });
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

  getAssignedUsers(task: Task): number[] {
    return task.assignedUserIds ?? (task.assignedTo ? [task.assignedTo] : []);
  }

  getUserName(userId: number): string {
    return this.memberNameMap.get(userId) || `Usuario ${userId}`;
  }

  isAssignedToMe(task: Task): boolean {
    const me = this.currentUser();
    if (!me) return false;
    const ids = this.getAssignedUsers(task);
    return ids.includes(me.id);
  }

  isOverdue(task: Task): boolean {
    return task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== 'completed' : false;
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
      next: (updatedTask: any) => {
        const tasks = this.tasks();
        const index = tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          tasks[index] = updatedTask;
          this.tasks.set([...tasks]);
          this.applyFilters();
        }
        this.snackBar.open('Tarea iniciada', 'Cerrar', { duration: 2000 });
      },
      error: (error: any) => {
        console.error('Error starting task:', error);
        this.snackBar.open('Error al iniciar la tarea', 'Cerrar', { duration: 3000 });
      }
    });
  }

  completeTask(task: Task): void {
    this.taskService.completeTask(task.id).subscribe({
      next: (updatedTask: any) => {
        const tasks = this.tasks();
        const index = tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          tasks[index] = updatedTask;
          this.tasks.set([...tasks]);
          this.applyFilters();
        }
        this.snackBar.open('Tarea completada', 'Cerrar', { duration: 2000 });
      },
      error: (error: any) => {
        console.error('Error completing task:', error);
        this.snackBar.open('Error al completar la tarea', 'Cerrar', { duration: 3000 });
      }
    });
  }

  editTask(task: Task): void {
    this.router.navigate(['/tasks/edit', task.id]);
  }

  reassignTask(task: Task): void {
    // Implementar lógica de reasignación
    console.log('Reassign task:', task);
  }

  deleteTask(task: Task): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Confirmar eliminación',
        message: `¿Estás seguro de que deseas eliminar la tarea "${task.title}"?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskService.deleteTask(task.id).subscribe({
          next: () => {
            const tasks = this.tasks();
            const updatedTasks = tasks.filter(t => t.id !== task.id);
            this.tasks.set(updatedTasks);
            this.applyFilters();
            this.snackBar.open('Tarea eliminada exitosamente', 'Cerrar', { duration: 3000 });
          },
          error: (error: any) => {
            console.error('Error deleting task:', error);
            this.snackBar.open('Error al eliminar la tarea', 'Cerrar', { duration: 3000 });
          }
        });
      }
    });
  }

  goToCreateTask(): void {
    const dialogRef = this.dialog.open(TaskCreateComponent, {
      width: '800px',
      maxWidth: '90vw',
      maxHeight: '90vh',
      disableClose: false,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Si se creó una tarea, recargar la lista
        this.loadTasks();
        this.snackBar.open('Tarea creada exitosamente', 'Cerrar', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }
}