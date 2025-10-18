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
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';

// Imports actualizados para la nueva estructura
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { NotificationService } from '../../../../../services/notification.service';
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
    MatProgressBarModule,
    MatMenuModule,
    MatDialogModule,
    MatSnackBarModule,
    MatDividerModule,
    MatTooltipModule
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
  dueDateFilter = '';
  assignedUserFilter = '';
  
  // Lista de usuarios para el filtro
  familyMembers = signal<User[]>([]);

  // Inyección de dependencias usando inject()
  private taskService = inject(TaskService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private notificationService = inject(NotificationService);

  ngOnInit(): void {
    // Verificar si hay usuario autenticado
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.currentUser.set(currentUser);
      this.loadTasks();
      this.loadFamilyMembers();
    } else {
      console.warn('No hay usuario autenticado en task-list');
      this.isLoading.set(false);
    }
  }

  // Método para cambiar entre roles para pruebas
  switchUserRole(): void {
    const currentRole = this.currentUser()?.role;
    const newRole = currentRole === 'head_of_household' ? 'family_member' : 'head_of_household';
    
    this.authService.loginByRole(newRole).subscribe({
      next: (user) => {
        this.currentUser.set(user);
        this.loadTasks();
        this.snackBar.open(`Cambiado a: ${newRole === 'head_of_household' ? 'Jefe del Hogar' : 'Miembro de la Familia'}`, 'Cerrar', { duration: 2000 });
      },
      error: (error) => {
        console.error('Error al cambiar rol:', error);
      }
    });
  }

  loadTasks(): void {
    this.isLoading.set(true);
    
    // Obtener el usuario actual
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser || !currentUser.id) {
      console.warn('No hay usuario autenticado para cargar tareas');
      this.tasks.set([]);
      this.applyFilters();
      this.isLoading.set(false);
      return;
    }
    
    // Si es jefe del hogar (admin), cargar todas las tareas. Si no, solo las suyas
    const isAdmin = currentUser.role === 'head_of_household';
    const tasks$ = isAdmin 
      ? this.taskService.getTasks()
      : this.taskService.getTasks({ userId: currentUser.id });

    tasks$.subscribe({
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

    if (this.dueDateFilter) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      filtered = filtered.filter(task => {
        if (!task.dueDate) return this.dueDateFilter === 'no_date';
        
        const dueDate = new Date(task.dueDate);
        
        switch (this.dueDateFilter) {
          case 'overdue':
            return dueDate < today && task.status !== 'completed';
          case 'today':
            return dueDate.toDateString() === today.toDateString();
          case 'tomorrow':
            return dueDate.toDateString() === tomorrow.toDateString();
          case 'this_week':
            return dueDate >= today && dueDate <= nextWeek;
          case 'no_date':
            return false; // Ya se maneja arriba
          default:
            return true;
        }
      });
    }

    if (this.assignedUserFilter) {
      const assignedUserId = parseInt(this.assignedUserFilter);
      filtered = filtered.filter(task => task.assignedTo === assignedUserId);
    }

    this.filteredTasks.set(filtered);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.priorityFilter = '';
    this.dueDateFilter = '';
    this.assignedUserFilter = '';
    this.applyFilters();
  }

  reloadTasks(): void {
    this.loadTasks();
    this.snackBar.open('Tareas recargadas', 'Cerrar', { duration: 2000 });
  }

  canManageTask(task: Task): boolean {
    const user = this.currentUser();
    if (!user) return false;
    
    const canManage = user.role === 'head_of_household' || task.assignedTo === user.id;
    return canManage;
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
    const user = this.familyMembers().find(u => u.id === task.assignedTo);
    return user ? `${user.firstName} ${user.lastName}` : `Usuario ${task.assignedTo}`;
  }

  // Método para obtener los usuarios asignados a una tarea
  getAssignedUsers(task: Task): number[] {
    // Si la tarea tiene assignedUserIds (múltiples usuarios), usar esos
    if (task.assignedUserIds && Array.isArray(task.assignedUserIds) && task.assignedUserIds.length > 0) {
      return task.assignedUserIds;
    }
    // Si no, usar assignedTo (usuario único)
    if (task.assignedTo) {
      return [task.assignedTo];
    }
    // Si no hay ninguno, devolver array vacío
    return [];
  }

  // Método para obtener el nombre de un usuario por ID
  getUserName(userId: number): string {
    const user = this.familyMembers().find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `Usuario ${userId}`;
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
    if (!this.canChangeStatus(task)) {
      this.snackBar.open('No puedes cambiar el estado de esta tarea', 'Cerrar', { duration: 2500 });
      return;
    }
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
    if (!this.canChangeStatus(task)) {
      this.snackBar.open('No puedes cambiar el estado de esta tarea', 'Cerrar', { duration: 2500 });
      return;
    }
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
        const currentUser = this.currentUser();
        if (!currentUser || !currentUser.id) {
          this.snackBar.open('Error: Usuario no autenticado', 'Cerrar', { duration: 3000 });
          return;
        }

        this.taskService.completeTaskWithUserId(task.id, currentUser.id).subscribe({
          next: (updatedTask: Task) => {
            console.log('Task completed successfully:', updatedTask);
            const tasks = this.tasks();
            const index = tasks.findIndex(t => t.id === task.id);
            if (index !== -1) {
              tasks[index] = updatedTask;
              this.tasks.set([...tasks]);
              this.applyFilters();
            }
            this.snackBar.open('¡Felicidades! Tarea completada 🎉', 'Cerrar', { 
              duration: 3000,
              panelClass: ['success-snackbar']
            });
          },
          error: (error: any) => {
            console.error('Error completing task:', error);
            this.snackBar.open('Error al completar la tarea', 'Cerrar', { duration: 3000 });
          }
        });
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

  loadFamilyMembers(): void {
    this.authService.getFamilyMembers().subscribe({
      next: (members) => {
        this.familyMembers.set(members);
      },
      error: (error) => {
        console.error('Error loading family members:', error);
      }
    });
  }

  // Nuevos métodos para las funcionalidades agregadas
  viewTaskDetails(task: Task): void {
    this.snackBar.open(`Ver detalles de: ${task.title}`, 'Cerrar', {
      duration: 3000
    });
    // TODO: Implementar modal de detalles completos
  }

  addComment(task: Task): void {
    const comment = prompt('Agregar comentario:');
    if (comment && comment.trim()) {
      this.taskService.addComment(task.id, comment.trim()).subscribe({
        next: () => {
          this.snackBar.open('Comentario agregado exitosamente', 'Cerrar', {
            duration: 3000
          });

          const currentUser = this.authService.getCurrentUser();
          
          if (currentUser?.role === 'head_of_household') {
            const assignedTarget = task.assignedTo ?? task.assignedUserId ?? (task.assignedUserIds?.[0] ?? 0);
            if (assignedTarget) {
              this.notificationService.createNotification({
                userId: assignedTarget,
                title: 'Nuevo comentario en tarea',
                message: `${currentUser?.firstName || 'Usuario'} ${currentUser?.lastName || ''} comentó en "${task.title}": ${comment.trim()}`,
                metadata: { taskData: { taskId: task.id, taskTitle: task.title } },
                type: 'comment_added'
              });
            }
          } else {
            // Notificar a los jefes del hogar cuando un miembro agrega un comentario
            this.authService.getFamilyMembers().subscribe({
              next: (members) => {
                const heads = (members || []).filter(m => m.role === 'head_of_household');
                if (heads.length === 0) {
                  console.warn('No se encontraron jefes del hogar para notificar');
                }
                heads.forEach(head => {
                  this.notificationService.createNotification({
                    userId: head.id,
                    title: 'Nuevo comentario en tarea',
                    message: `${currentUser?.firstName || 'Usuario'} ${currentUser?.lastName || ''} comentó en "${task.title}": ${comment.trim()}`,
                    metadata: { taskData: { taskId: task.id, taskTitle: task.title } },
                    type: 'comment_added'
                  });
                });
              },
              error: (err) => {
                console.error('Error obteniendo miembros de familia para notificar:', err);
              }
            });
          }
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          this.snackBar.open('Error al agregar comentario', 'Cerrar', {
            duration: 3000
          });
        }
      });
    }
  }

  uploadDocument(task: Task): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.jpg,.jpeg,.png,.txt';
    
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        // Simular subida de archivo
        const fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
          uploadedAt: new Date()
        };
        
        this.taskService.addTaskFile(task.id, fileInfo).subscribe({
          next: () => {
            this.snackBar.open(`Archivo "${file.name}" subido exitosamente`, 'Cerrar', {
              duration: 3000
            });
          },
          error: (error) => {
            console.error('Error uploading file:', error);
            this.snackBar.open('Error al subir archivo', 'Cerrar', {
              duration: 3000
            });
          }
        });
      }
    };
    
    input.click();
  }

  // Método para actualizar el progreso de una tarea
  updateProgress(task: Task, increment: number): void {
    if (!this.canChangeStatus(task)) {
      this.snackBar.open('No puedes actualizar el progreso de esta tarea', 'Cerrar', { duration: 2500 });
      return;
    }
    const currentProgress = task.progress ?? 0; // Usar 0 si progress es undefined
    const newProgress = Math.max(0, Math.min(100, currentProgress + increment));
    
    const updatedTask = { ...task, progress: newProgress };
    
    // Si el progreso llega a 100%, marcar como completada
    if (newProgress === 100) {
      updatedTask.status = 'completed';
      updatedTask.completedAt = new Date();
    }

    // Actualizar inmediatamente la tarea en el signal local
    const currentTasks = this.tasks();
    const updatedTasks = currentTasks.map(t => 
      t.id === task.id ? { ...t, progress: newProgress, status: updatedTask.status, completedAt: updatedTask.completedAt } : t
    );
    this.tasks.set(updatedTasks);
    this.applyFilters(); // Aplicar filtros para actualizar filteredTasks

    this.taskService.updateTask(task.id, updatedTask).subscribe({
      next: () => {
        this.snackBar.open(`Progreso actualizado a ${newProgress}%`, 'Cerrar', {
          duration: 2000
        });
        // No necesitamos recargar todas las tareas ya que actualizamos localmente
      },
      error: (error) => {
        console.error('Error updating progress:', error);
        this.snackBar.open('Error al actualizar el progreso', 'Cerrar', {
          duration: 3000
        });
        // En caso de error, recargar para sincronizar
        this.loadTasks();
      }
    });
  }
  // Permisos: admin puede editar pero no cambiar estado
  isAdmin(): boolean {
    const user = this.currentUser();
    return !!user && user.role === 'head_of_household';
  }

  canEditTask(task: Task): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return user.role === 'head_of_household' || task.assignedTo === user.id;
  }

  canChangeStatus(task: Task): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return task.assignedTo === user.id && user.role !== 'head_of_household';
  }
}