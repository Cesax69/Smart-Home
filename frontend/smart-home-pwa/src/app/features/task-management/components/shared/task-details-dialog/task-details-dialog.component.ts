import { Component, OnInit, Inject, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatCardModule } from '@angular/material/card';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';

import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task, TaskComment, TaskFile } from '../../../models/task.model';

@Component({
  selector: 'app-task-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatCardModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatChipsModule
  ],
  templateUrl: './task-details-dialog.component.html',
  styleUrl: './task-details-dialog.component.scss'
})
export class TaskDetailsDialogComponent implements OnInit {
  task: Task;
  comments = signal<TaskComment[]>([]);
  files = signal<TaskFile[]>([]);
  familyMembers = signal<any[]>([]);
  commentText = '';
  isAddingComment = signal(false);
  isHouseholdHead = false;
  canComment = true;

  private taskService = inject(TaskService);
  private authService = inject(AuthService);

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { task: Task },
    private dialogRef: MatDialogRef<TaskDetailsDialogComponent>
  ) {
    this.task = data.task;
  }

  ngOnInit(): void {
    this.loadComments();
    this.loadFiles();
    this.loadFamilyMembers();
    this.isHouseholdHead = this.authService.isHeadOfHousehold();
    this.canComment = !this.isHouseholdHead;
  }

  loadComments(): void {
    this.taskService.getTaskComments(this.task.id).subscribe({
      next: (comments) => this.comments.set(comments || []),
      error: (err) => console.error('Error loading comments:', err)
    });
  }

  loadFiles(): void {
    this.taskService.getTaskFiles(this.task.id).subscribe({
      next: (files) => this.files.set(files || []),
      error: (err) => console.error('Error loading files:', err)
    });
  }

  loadFamilyMembers(): void {
    this.authService.getFamilyMembers().subscribe({
      next: (members) => this.familyMembers.set(members || []),
      error: (err) => console.error('Error loading family members:', err)
    });
  }

  addComment(): void {
    const text = this.commentText?.trim();
    if (!text) return;
    if (!this.canComment) return;
    this.isAddingComment.set(true);
    this.taskService.addComment(this.task.id, text).subscribe({
      next: () => {
        this.commentText = '';
        this.loadComments();
        this.isAddingComment.set(false);
      },
      error: (error) => {
        console.error('Error adding comment:', error);
        this.isAddingComment.set(false);
      }
    });
  }

  // Helpers para archivos con compatibilidad snake_case
  getFileUrl(f: TaskFile | any): string {
    return (f?.fileUrl ?? f?.file_url ?? f?.url ?? '') as string;
  }

  getFileName(f: TaskFile | any): string {
    return (f?.fileName ?? f?.file_name ?? 'Archivo') as string;
  }

  getFileMime(f: TaskFile | any): string {
    return (f?.mimeType ?? f?.mime_type ?? 'archivo') as string;
  }

  getFileSize(f: TaskFile | any): number {
    return (f?.fileSize ?? f?.file_size ?? 0) as number;
  }

  getUserName(userId: number): string {
    const user = this.familyMembers().find(u => u.id === userId);
    return user ? `${user.firstName} ${user.lastName}` : `Usuario ${userId}`;
  }

  statusLabel(status: string): string {
    const map: any = {
      pending: 'Pendiente',
      in_progress: 'En Progreso',
      completed: 'Completada',
      archived: 'Archivada'
    };
    return map[status] || status;
  }

  priorityLabel(priority: string): string {
    const map: any = {
      baja: 'Baja',
      media: 'Media',
      alta: 'Alta',
      urgente: 'Urgente'
    };
    const p = String(priority).toLowerCase();
    return map[p] || priority;
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('es-ES', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  close(): void {
    this.dialogRef.close();
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
  
  getAssignedUserNames(task: Task): string {
    const users = this.getAssignedUsers(task);
    return users.map(uid => this.getUserName(uid)).join(', ');
  }

}