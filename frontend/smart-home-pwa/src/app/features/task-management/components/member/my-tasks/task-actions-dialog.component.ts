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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TaskService } from '../../../services/task.service';
import { FileUploadService } from '../../../../../services/file-upload.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task } from '../../../models/task.model';

export interface TaskActionsDialogData {
  task: Task;
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
    MatSnackBarModule,
    MatListModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <div class="task-actions-dialog">
      <div mat-dialog-title class="dialog-header">
        <mat-icon>assignment</mat-icon>
        <h2>{{ data.task.title }}</h2>
        <button mat-icon-button mat-dialog-close>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div mat-dialog-content class="dialog-content">
        <mat-tab-group>
          <!-- Tab de Comentarios -->
          <mat-tab label="Comentarios">
            <div class="tab-content comments-tab">
              <!-- Lista de comentarios existentes -->
              <div class="comments-container" *ngIf="comments().length > 0; else noComments">
                <div class="comments-header">
                  <mat-icon class="comments-icon">forum</mat-icon>
                  <h3>Conversación ({{ comments().length }})</h3>
                </div>
                
                <div class="comments-timeline">
                  <div *ngFor="let comment of comments(); trackBy: trackByCommentId" 
                       class="comment-bubble"
                       [class.own-comment]="isOwnComment(comment)">
                    <div class="comment-avatar">
                      <mat-icon>account_circle</mat-icon>
                    </div>
                    <div class="comment-content">
                      <div class="comment-header">
                        <span class="comment-author">{{ comment.createdByName || 'Usuario' }}</span>
                        <span class="comment-timestamp">{{ formatRelativeTime(comment.createdAt) }}</span>
                      </div>
                      <div class="comment-message">{{ comment.comment }}</div>
                    </div>
                  </div>
                </div>
              </div>

              <ng-template #noComments>
                <div class="empty-comments">
                  <mat-icon class="empty-icon">chat_bubble_outline</mat-icon>
                  <h3>Sin comentarios aún</h3>
                  <p>Sé el primero en comentar sobre esta tarea</p>
                </div>
              </ng-template>

              <!-- Formulario para nuevo comentario -->
              <div class="comment-input-section">
                <form [formGroup]="commentForm" (ngSubmit)="addComment()" class="comment-form">
                  <div class="input-container">
                    <div class="user-avatar">
                      <mat-icon>account_circle</mat-icon>
                    </div>
                    <mat-form-field appearance="outline" class="comment-input">
                      <mat-label>Escribe un comentario...</mat-label>
                      <textarea 
                        matInput 
                        formControlName="comment" 
                        rows="2" 
                        placeholder="Comparte tu progreso, dudas o actualizaciones..."
                        (keydown)="onEnterKey($event)">
                      </textarea>
                      <mat-error *ngIf="commentForm.get('comment')?.hasError('required')">
                        El comentario es requerido
                      </mat-error>
                      <mat-error *ngIf="commentForm.get('comment')?.hasError('minlength')">
                        Mínimo 3 caracteres
                      </mat-error>
                    </mat-form-field>
                  </div>
                  
                  <div class="form-actions">
                    <button 
                      mat-button 
                      type="button"
                      (click)="commentForm.reset()"
                      [disabled]="isAddingComment()">
                      Cancelar
                    </button>
                    <button 
                      mat-raised-button 
                      color="primary" 
                      type="submit" 
                      [disabled]="commentForm.invalid || isAddingComment()"
                      class="send-btn">
                      <mat-icon *ngIf="!isAddingComment()">send</mat-icon>
                      <mat-spinner *ngIf="isAddingComment()" diameter="16"></mat-spinner>
                      {{ isAddingComment() ? 'Enviando...' : 'Enviar' }}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </mat-tab>

          <!-- Tab de Archivos -->
          <mat-tab label="Archivos">
            <div class="tab-content">
              <!-- Lista de archivos existentes -->
              <div class="files-section" *ngIf="files().length > 0; else noFiles">
                <div class="files-header">
                  <mat-icon class="files-icon">attach_file</mat-icon>
                  <h3>Archivos adjuntos ({{ files().length }})</h3>
                </div>
                
                <div class="files-list">
                  <div *ngFor="let file of files()" class="file-item">
                    <mat-icon class="file-icon">{{ getFileIcon(file.mime_type) }}</mat-icon>
                    <div class="file-info">
                      <div class="file-name">{{ file.file_name }}</div>
                      <div class="file-details">
                        <span class="file-size">{{ formatFileSize(file.file_size) }}</span>
                        <span class="file-date">{{ formatDate(file.created_at) }}</span>
                        <span class="file-uploader">por {{ file.uploaded_by_name || 'Usuario' }}</span>
                        <span class="file-type">{{ file.mime_type }}</span>
                      </div>
                    </div>
                    <div class="file-actions">
                      <button mat-icon-button 
                              (click)="previewFile(file)" 
                              [matTooltip]="canPreviewFile(file.mime_type) ? 'Vista previa' : 'Descargar'"
                              color="primary">
                        <mat-icon>{{ canPreviewFile(file.mime_type) ? 'visibility' : 'download' }}</mat-icon>
                      </button>
                      <button mat-icon-button 
                              (click)="downloadFile(file)" 
                              matTooltip="Descargar"
                              color="accent">
                        <mat-icon>file_download</mat-icon>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <ng-template #noFiles>
                <div class="empty-files">
                  <mat-icon class="empty-icon">folder_open</mat-icon>
                  <h3>No hay archivos adjuntos</h3>
                  <p>Sube archivos para compartir con el equipo</p>
                </div>
              </ng-template>

              <!-- Formulario para subir archivo -->
              <div class="file-upload-section">
                <div class="upload-header">
                  <mat-icon>cloud_upload</mat-icon>
                  <h3>Subir nuevo archivo</h3>
                </div>
                
                <div class="file-upload-form">
                  <div class="file-input-container">
                    <input 
                      #fileInput 
                      type="file" 
                      (change)="onFileSelected($event)" 
                      accept="*/*"
                      style="display: none;">
                    
                    <button 
                      mat-stroked-button 
                      (click)="fileInput.click()" 
                      [disabled]="isUploading()"
                      class="file-select-btn">
                      <mat-icon>attach_file</mat-icon>
                      Seleccionar archivo
                    </button>
                  </div>

                  <div *ngIf="selectedFile()" class="selected-file">
                    <div class="selected-file-info">
                      <mat-icon>{{ getFileIcon(selectedFile()!.type) }}</mat-icon>
                      <div class="file-details">
                        <div class="file-name">{{ selectedFile()!.name }}</div>
                        <div class="file-size">{{ formatFileSize(selectedFile()!.size) }}</div>
                      </div>
                      <button mat-icon-button (click)="selectedFile.set(null)" color="warn">
                        <mat-icon>close</mat-icon>
                      </button>
                    </div>
                  </div>

                  <button 
                    mat-raised-button 
                    color="accent" 
                    (click)="uploadFile()" 
                    [disabled]="!selectedFile() || isUploading()"
                    class="upload-btn"
                    *ngIf="selectedFile()">
                    <mat-icon *ngIf="!isUploading()">cloud_upload</mat-icon>
                    <mat-spinner *ngIf="isUploading()" diameter="20"></mat-spinner>
                    {{ isUploading() ? 'Subiendo...' : 'Subir Archivo' }}
                  </button>
                </div>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>

      <div mat-dialog-actions class="dialog-actions">
        <button mat-button mat-dialog-close>Cerrar</button>
      </div>
    </div>
  `,
  styles: [`
    .task-actions-dialog {
      width: 600px;
      max-width: 90vw;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 0;
    }

    .dialog-header h2 {
      flex: 1;
      margin: 0;
      font-size: 1.25rem;
    }

    .dialog-content {
      padding: 0;
      max-height: 70vh;
      overflow-y: auto;
    }

    .tab-content {
      padding: 20px;
    }

    /* Estilos mejorados para comentarios */
    .comments-tab {
      padding: 0 !important;
      height: 500px;
      display: flex;
      flex-direction: column;
    }

    .comments-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px 12px;
      border-bottom: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .comments-icon {
      color: #1976d2;
    }

    .comments-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
      color: #333;
    }

    .comments-container {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .comments-timeline {
      flex: 1;
      padding: 16px 20px;
      overflow-y: auto;
      background: #f8f9fa;
    }

    .comment-bubble {
      display: flex;
      gap: 12px;
      margin-bottom: 16px;
      animation: slideIn 0.3s ease-out;
    }

    .comment-bubble.own-comment {
      flex-direction: row-reverse;
    }

    .comment-bubble.own-comment .comment-content {
      background: #1976d2;
      color: white;
    }

    .comment-bubble.own-comment .comment-author {
      color: rgba(255, 255, 255, 0.9);
    }

    .comment-bubble.own-comment .comment-timestamp {
      color: rgba(255, 255, 255, 0.7);
    }

    .comment-avatar {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e3f2fd;
      border-radius: 50%;
      color: #1976d2;
    }

    .comment-bubble.own-comment .comment-avatar {
      background: #1976d2;
      color: white;
    }

    .comment-content {
      max-width: 70%;
      background: white;
      border-radius: 16px;
      padding: 12px 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      position: relative;
    }

    .comment-content::before {
      content: '';
      position: absolute;
      top: 12px;
      left: -8px;
      width: 0;
      height: 0;
      border-top: 8px solid transparent;
      border-bottom: 8px solid transparent;
      border-right: 8px solid white;
    }

    .comment-bubble.own-comment .comment-content::before {
      left: auto;
      right: -8px;
      border-right: none;
      border-left: 8px solid #1976d2;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .comment-author {
      font-weight: 600;
      font-size: 0.875rem;
      color: #1976d2;
    }

    .comment-timestamp {
      font-size: 0.75rem;
      color: #666;
    }

    .comment-message {
      font-size: 0.875rem;
      line-height: 1.4;
      color: #333;
      word-wrap: break-word;
    }

    .empty-comments {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #666;
    }

    .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .empty-comments h3 {
      margin: 0 0 8px;
      font-size: 1.1rem;
      font-weight: 500;
    }

    .empty-comments p {
      margin: 0;
      font-size: 0.875rem;
      opacity: 0.8;
    }

    .comment-input-section {
      border-top: 1px solid #e0e0e0;
      background: white;
      padding: 16px 20px;
    }

    .comment-form {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .input-container {
      display: flex;
      gap: 12px;
      align-items: flex-start;
    }

    .user-avatar {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e3f2fd;
      border-radius: 50%;
      color: #1976d2;
      margin-top: 8px;
    }

    .comment-input {
      flex: 1;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 8px;
    }

    .send-btn {
      min-width: 100px;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Estilos mejorados para archivos */
    .files-section {
      margin-bottom: 24px;
    }

    .files-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px 12px;
      border-bottom: 1px solid #e0e0e0;
      background: #fafafa;
    }

    .files-icon {
      color: #1976d2;
    }

    .files-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
      color: #333;
    }

    .files-list {
      padding: 16px 20px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s ease;
    }

    .file-item:hover {
      background-color: #f8f9fa;
      border-radius: 8px;
      margin: 0 -8px;
      padding: 12px 8px;
    }

    .file-item:last-child {
      border-bottom: none;
    }

    .file-icon {
      color: #666;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .file-info {
      flex: 1;
    }

    .file-name {
      font-weight: 500;
      margin-bottom: 4px;
      color: #333;
    }

    .file-details {
      font-size: 0.875rem;
      color: #666;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .file-type {
      background: #e3f2fd;
      color: #1976d2;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .file-actions {
      display: flex;
      gap: 4px;
    }

    .empty-files {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 20px;
      text-align: center;
      color: #666;
    }

    .empty-files .empty-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #ccc;
    }

    .empty-files h3 {
      margin: 0 0 8px;
      font-size: 1.1rem;
      font-weight: 500;
    }

    .empty-files p {
      margin: 0;
      font-size: 0.875rem;
      opacity: 0.8;
    }

    .file-upload-section {
      border-top: 1px solid #e0e0e0;
      background: white;
    }

    .upload-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 16px 20px 12px;
      background: #f8f9fa;
    }

    .upload-header mat-icon {
      color: #1976d2;
    }

    .upload-header h3 {
      margin: 0;
      font-size: 1rem;
      font-weight: 500;
      color: #333;
    }

    .file-upload-form {
      padding: 20px;
    }

    .file-input-container {
      margin-bottom: 16px;
    }

    .file-select-btn {
      width: 100%;
      height: 48px;
      border: 2px dashed #ddd;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .file-select-btn:hover {
      border-color: #1976d2;
      background-color: #f8f9fa;
    }

    .selected-file {
      margin: 16px 0;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e0e0e0;
    }

    .selected-file-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .selected-file-info mat-icon {
      color: #1976d2;
    }

    .selected-file-info .file-details {
      flex: 1;
    }

    .selected-file-info .file-name {
      font-weight: 500;
      color: #333;
      margin-bottom: 2px;
    }

    .selected-file-info .file-size {
      font-size: 0.875rem;
      color: #666;
    }

    .upload-btn {
      width: 100%;
      height: 48px;
      font-weight: 500;
    }

    .dialog-actions {
      padding: 16px 24px;
      justify-content: flex-end;
    }

    mat-tab-group {
      height: 100%;
    }

    ::ng-deep .mat-mdc-tab-body-wrapper {
      flex-grow: 1;
    }
  `]
})
export class TaskActionsDialogComponent implements OnInit {
  commentForm: FormGroup;
  comments = signal<any[]>([]);
  files = signal<any[]>([]);
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
    private snackBar: MatSnackBar
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
        this.comments.set(comments);
      },
      error: (error) => {
        console.error('Error loading comments:', error);
      }
    });
  }

  loadFiles(): void {
    this.taskService.getTaskFiles(this.data.task.id).subscribe({
      next: (files) => {
        this.files.set(files);
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
          this.snackBar.open('Comentario agregado exitosamente', 'Cerrar', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.commentForm.reset();
          this.loadComments();
          this.isAddingComment.set(false);
        },
        error: (error) => {
          console.error('Error adding comment:', error);
          this.snackBar.open('Error al agregar comentario', 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isAddingComment.set(false);
        }
      });
    }
  }

  // Métodos auxiliares para la UI mejorada
  trackByCommentId(index: number, comment: any): number {
    return comment.id || index;
  }

  isOwnComment(comment: any): boolean {
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
        this.snackBar.open(validation.error!, 'Cerrar', {
          duration: 4000,
          panelClass: ['error-snackbar']
        });
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
    // Intentar reutilizar el folder existente donde están los archivos de la tarea
    const existingFolderId = this.files().length > 0 ? (this.files()[0].folder_id || this.files()[0].folderId) : undefined;
    const taskTitle = this.data.task.title;

    this.fileUploadService.uploadFile(file, { taskTitle, folderId: existingFolderId, subfolder: 'progreso' }).subscribe({
      next: (response) => {
        // El servicio de subida devuelve { uploaded: [], failed: [], folder }
        const uploaded = Array.isArray(response?.uploaded) ? response.uploaded : [];
        const first = uploaded[0];
        if (!first) {
          this.snackBar.open('No se pudo procesar la subida del archivo', 'Cerrar', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
          this.isUploading.set(false);
          return;
        }

        const fileInfo = {
          filename: first.originalName || first.fileName || file.name,
          originalName: first.originalName || file.name,
          fileUrl: first.fileUrl || first.webViewLink || first.webContentLink,
          size: first.size || file.size,
          mimetype: first.mimetype || file.type,
          folderId: response?.folder?.id || first.folderId,
          folderName: response?.folder?.name || first.folderName
        };

        this.taskService.addTaskFile(this.data.task.id, fileInfo).subscribe({
          next: () => {
            this.snackBar.open('Archivo subido exitosamente', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            this.selectedFile.set(null);
            this.loadFiles();
            this.isUploading.set(false);
          },
          error: (error) => {
            console.error('Error adding file to task:', error);
            this.snackBar.open('Error al asociar archivo con la tarea', 'Cerrar', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
            this.isUploading.set(false);
          }
        });
      },
      error: (error) => {
        console.error('Error uploading file:', error);
        this.snackBar.open('Error al subir archivo', 'Cerrar', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isUploading.set(false);
      }
    });
  }

  downloadFile(file: any): void {
    // En un entorno real, esto abriría el archivo o iniciaría la descarga
    window.open(file.file_url, '_blank');
  }

  previewFile(file: any): void {
    if (this.canPreviewFile(file.mime_type)) {
      // Para imágenes, PDFs y archivos de texto, abrir en nueva ventana
      window.open(file.file_url, '_blank');
    } else {
      // Para otros tipos de archivo, descargar
      this.downloadFile(file);
    }
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
}