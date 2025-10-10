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
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
// MatSnackBar removido: usamos AlertCenter
import { AlertService } from '../../../../../services/alert.service';
import { MatDividerModule } from '@angular/material/divider';

// Imports actualizados para la nueva estructura
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task } from '../../../models/task.model';
import { User } from '../../../../../models/user.model';
import { ConfirmDialogComponent } from '../../../../../components/confirm-dialog/confirm-dialog.component';
import { TaskCreateComponent } from '../../admin/task-create/task-create.component';
import { AdminTaskEditComponent } from '../../admin/task-edit/task-edit.component';

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
    MatDividerModule
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

  constructor(
    private taskService: TaskService,
    private authService: AuthService,
    private router: Router,
    private dialog: MatDialog,
    private alerts: AlertService
  ) {}
  // Uso de inyección por constructor para mantener consistencia

  ngOnInit(): void {
    // Auto-login para pruebas si no hay usuario
    if (!this.authService.getCurrentUser()) {
      // Para pruebas, alternar entre jefe del hogar y miembro de la familia
      const loginRole = Math.random() > 0.5 ? 'head_of_household' : 'family_member';
      this.authService.loginByRole(loginRole).subscribe({
        next: (user) => {
          this.currentUser.set(user);
          this.loadTasks();
          this.loadFamilyMembers();
        },
        error: (error) => {
          console.error('Error en auto-login:', error);
        }
      });
    } else {
      this.currentUser.set(this.authService.getCurrentUser());
      this.loadTasks();
      this.loadFamilyMembers();
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
        const roleLabel = newRole === 'head_of_household' ? 'Jefe del Hogar' : 'Miembro de la Familia';
        this.alerts.success('Rol cambiado', `Cambiado a: ${roleLabel}`, { duration: 2000, dismissible: true });
      },
      error: (error) => {
        console.error('Error al cambiar rol:', error);
      }
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
        this.alerts.error('Error al cargar tareas', 'No se pudieron cargar las tareas.', { duration: 3000, dismissible: true });
        this.isLoading.set(false);
      }
    });
  }

  applyFilters(): void {
    let filtered = this.tasks();

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(task => 
        (task.title || '').toLowerCase().includes(term) || 
        ((task.description || '').toLowerCase().includes(term))
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
      filtered = filtered.filter(task => {
        const single = task.assignedTo === assignedUserId;
        const multiple = Array.isArray(task.assignedUserIds) && task.assignedUserIds.includes(assignedUserId);
        return single || multiple;
      });
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
    this.alerts.info('Tareas recargadas', 'Se actualizó la lista de tareas.', { duration: 2500, dismissible: true });
  }

  canManageTask(task: Task): boolean {
    const user = this.currentUser();
    return !!user && (user.role === 'head_of_household' || this.isAssignedToMe(task));
  }

  private isAssignedToMe(task: Task): boolean {
    const user = this.currentUser();
    if (!user) return false;
    const myId = user.id;
    return task.assignedTo === myId || (Array.isArray(task.assignedUserIds) && task.assignedUserIds.includes(myId));
  }

  openEditTask(task: Task): void {
    const dialogRef = this.dialog.open(AdminTaskEditComponent, {
      width: '760px',
      maxWidth: '95vw',
      disableClose: true,
      data: { taskId: task.id }
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
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
    this.taskService.updateTask(task.id, { status: 'in_progress' }).subscribe({
      next: (updatedTask: any) => {
        const tasks = this.tasks();
        const index = tasks.findIndex(t => t.id === task.id);
        if (index !== -1) {
          tasks[index] = updatedTask;
          this.tasks.set([...tasks]);
          this.applyFilters();
        }
        this.alerts.success('Tarea iniciada', 'La tarea está en progreso.', { duration: 2500, dismissible: true });
      },
      error: (error: any) => {
        console.error('Error starting task:', error);
        this.alerts.error('Error al iniciar', 'No se pudo iniciar la tarea.', { duration: 4000, dismissible: true });
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
        this.alerts.success('Tarea completada', 'Se marcó como completada.', { duration: 2500, dismissible: true });
      },
      error: (error: any) => {
        console.error('Error completing task:', error);
        this.alerts.error('Error al completar', 'No se pudo completar la tarea.', { duration: 4000, dismissible: true });
      }
    });
  }

  editTask(task: Task): void {
    // Abrir edición como modal (AdminTaskEdit)
    this.openEditTask(task);
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
        const alertId = this.alerts.info('Eliminando archivos...', 'Estamos eliminando la tarea y sus archivos asociados.', { loading: true, dismissible: true });
        this.taskService.deleteTask(task.id).subscribe({
          next: () => {
            const tasks = this.tasks();
            const updatedTasks = tasks.filter(t => t.id !== task.id);
            this.tasks.set(updatedTasks);
            this.applyFilters();
            this.alerts.update(alertId, { type: 'success', title: 'Tarea eliminada correctamente', message: 'La tarea y sus archivos fueron eliminados.', loading: false, duration: 4000 });
          },
          error: (error: any) => {
            console.error('Error deleting task:', error);
            this.alerts.update(alertId, { type: 'error', title: 'Error al eliminar la tarea', message: 'Inténtalo de nuevo o verifica tu conexión.', loading: false, dismissible: true, duration: 6000 });
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
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Si se creó una tarea, recargar la lista (sin alerta para evitar duplicados)
        this.loadTasks();
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
    this.alerts.info('Detalles de la tarea', `Ver: ${task.title}`, { duration: 3000, dismissible: true });
    // TODO: Implementar modal de detalles completos
  }

  addComment(task: Task): void {
    const comment = prompt('Agregar comentario:');
    if (comment && comment.trim()) {
      this.taskService.addComment(task.id, comment.trim()).subscribe({
        next: () => {
          this.alerts.success('Comentario agregado', 'Se agregó correctamente.', { duration: 2500, dismissible: true });
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          this.alerts.error('Error al comentar', 'No se pudo agregar el comentario.', { duration: 4000, dismissible: true });
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
            this.alerts.success('Archivo subido', `"${file.name}" se subió correctamente.`, { duration: 2500, dismissible: true });
          },
          error: (error) => {
            console.error('Error uploading file:', error);
            this.alerts.error('Error al subir archivo', 'No se pudo subir el archivo.', { duration: 4000, dismissible: true });
          }
        });
      }
    };
    
    input.click();
  }
}