import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlertService } from '../../../../../services/alert.service';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskService } from '../../../services/task.service';
import { FileUploadService } from '../../../../../services/file-upload.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task, TaskFile } from '../../../models/task.model';

export interface TaskActionsDialogData {
  task: Task;
}

// Tipado para comentarios de tareas para evitar 'any'
interface TaskComment {
  id?: number;
  taskId?: number;
  comment: string;
  createdBy?: number;
  createdByName?: string;
  createdAt?: Date | string;
}

@Component({
  selector: 'app-task-actions-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatChipsModule,
    MatTooltipModule
  ],
  templateUrl: './task-actions-dialog.component.html',
  styleUrls: ['./task-actions-dialog.component.scss']
})
export class TaskActionsDialogComponent implements OnInit {
  commentForm: FormGroup;
  comments = signal<TaskComment[]>([]);
  files = signal<TaskFile[]>([]);
  selectedFile = signal<File | null>(null);
  isAddingComment = signal(false);
  isUploading = signal(false);
  currentUserId = signal<number | null>(null);

  constructor(
    public dialogRef: MatDialogRef<TaskActionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskActionsDialogData,
    private fb: FormBuilder,
    private taskService: TaskService,
    private fileUploadService: FileUploadService,
    private authService: AuthService,
    private alerts: AlertService
  ) {
    this.commentForm = this.fb.group({
      comment: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
    // Obtener el usuario actual
    const currentUser = this.authService.getCurrentUser();
    this.currentUserId.set(currentUser?.id || null);
    
    this.loadComments();
    this.loadFiles();
  }

  loadComments(): void {
    this.taskService.getTaskComments(this.data.task.id).subscribe({
      next: (comments) => {
        this.comments.set(comments as TaskComment[]);
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  loadFiles(): void {
    this.taskService.getTaskFiles(this.data.task.id).subscribe({
      next: (files) => {
        this.files.set(files as TaskFile[]);
      },
      error: (error) => {
        console.error('Error loading files:', error);
      }
    });
  }

  addComment(): void {
    if (this.commentForm.valid) {
      this.isAddingComment.set(true);
      const comment = this.commentForm.get('comment')?.value;

      this.taskService.addComment(this.data.task.id, comment).subscribe({
        next: () => {
          this.alerts.success('Comentario agregado exitosamente');
          this.commentForm.reset();
          this.loadComments();
          this.isAddingComment.set(false);
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          this.alerts.error('Error al agregar comentario');
          this.isAddingComment.set(false);
        }
      });
    }
  }

  // Métodos auxiliares para la UI mejorada
  trackByCommentId(index: number, comment: TaskComment): number {
    return (comment.id ?? index) as number;
  }

  isOwnComment(comment: TaskComment): boolean {
    return comment.createdBy === this.currentUserId();
  }

  formatRelativeTime(date: string | Date): string {
    const now = new Date();
    const commentDate = new Date(date);
    const diffInMinutes = Math.floor((now.getTime() - commentDate.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    
    return commentDate.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit',
      year: '2-digit'
    });
  }

  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (this.commentForm.valid && !this.isAddingComment()) {
        this.addComment();
      }
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const validation = this.fileUploadService.validateFile(file);
      if (validation.valid) {
        this.selectedFile.set(file);
      } else {
        this.alerts.error(validation.error!);
        event.target.value = '';
      }
    }
  }

  removeSelectedFile(): void {
    this.selectedFile.set(null);
  }

  formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);
    const taskTitle = this.data.task.title;

    this.fileUploadService.uploadFile(file, { taskTitle }).subscribe({
      next: (response) => {
        if (!response || !response.fileInfo || !response.fileUrl) {
          this.alerts.error('No se pudo procesar la subida del archivo');
          this.isUploading.set(false);
          return;
        }

        const fileInfo = {
          filename: response.fileInfo.filename,
          originalName: response.fileInfo.originalName,
          fileUrl: response.fileUrl,
          size: response.fileInfo.size,
          mimetype: response.fileInfo.mimetype
        };

        this.taskService.addTaskFile(this.data.task.id, fileInfo).subscribe({
          next: () => {
            this.alerts.success('Archivo subido exitosamente');
            this.selectedFile.set(null);
            this.loadFiles();
            this.isUploading.set(false);
          },
          error: (error) => {
            console.error('Error adding file to task:', error);
            this.alerts.error('Error al asociar archivo con la tarea');
            this.isUploading.set(false);
          }
        });
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.alerts.error('Error al subir archivo');
        this.isUploading.set(false);
      }
    });
  }

  downloadFile(file: any): void {
    // En un entorno real, esto abriría el archivo o iniciaría la descarga
    const url = file.fileUrl ?? file.file_url;
    if (url) window.open(url, '_blank');
  }

  canPreviewFile(mimeType: string): boolean {
    if (!mimeType) return false;
    
    const previewableTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'application/pdf',
      'text/plain', 'text/html', 'text/css', 'text/javascript',
      'application/json'
    ];
    return previewableTypes.includes(mimeType);
  }

  getFileIcon(mimeType: string): string {
    if (!mimeType) return 'insert_drive_file';
    
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.includes('word')) return 'description';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table_chart';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'slideshow';
    if (mimeType === 'text/plain') return 'text_snippet';
    if (mimeType.includes('video/')) return 'video_file';
    if (mimeType.includes('audio/')) return 'audio_file';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('compressed')) return 'folder_zip';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    return this.fileUploadService.formatFileSize(bytes);
  }

  // Helpers to handle backend snake_case vs frontend camelCase safely
  mime(file: TaskFile): string {
    return file.mimeType ?? (file as any).mime_type ?? '';
  }

  displayFileName(file: TaskFile): string {
    return file.fileName ?? (file as any).file_name ?? '';
  }

  getFileSize(file: TaskFile): number {
    return file.fileSize ?? (file as any).file_size ?? 0;
  }

  getCreatedAt(file: TaskFile): Date | string {
    return file.createdAt ?? (file as any).created_at ?? '';
  }

  getUploadedByName(file: TaskFile): string {
    return (file as any).uploaded_by_name ?? '';
  }

  getFolderId(file: TaskFile): string | undefined {
    return file.folderId ?? (file as any).folder_id ?? undefined;
  }
}