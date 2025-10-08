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
import { TaskService } from '../../../services/task.service';
import { FileUploadService } from '../../../../../services/file-upload.service';
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
    MatChipsModule
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
            <div class="tab-content">
              <!-- Lista de comentarios existentes -->
              <div class="comments-list" *ngIf="comments().length > 0">
                <h3>Comentarios anteriores</h3>
                <mat-list>
                  <mat-list-item *ngFor="let comment of comments()">
                    <div class="comment-item">
                      <div class="comment-header">
                        <span class="comment-author">{{ comment.createdByName || 'Usuario' }}</span>
                        <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                      </div>
                      <div class="comment-text">{{ comment.comment }}</div>
                    </div>
                  </mat-list-item>
                </mat-list>
              </div>

              <!-- Formulario para nuevo comentario -->
              <form [formGroup]="commentForm" (ngSubmit)="addComment()" class="comment-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Agregar comentario</mat-label>
                  <textarea 
                    matInput 
                    formControlName="comment" 
                    rows="3" 
                    placeholder="Escribe tu comentario aquí...">
                  </textarea>
                  <mat-error *ngIf="commentForm.get('comment')?.hasError('required')">
                    El comentario es requerido
                  </mat-error>
                </mat-form-field>
                
                <button 
                  mat-raised-button 
                  color="primary" 
                  type="submit" 
                  [disabled]="commentForm.invalid || isAddingComment()"
                  class="add-comment-btn">
                  <mat-icon *ngIf="!isAddingComment()">comment</mat-icon>
                  <mat-spinner *ngIf="isAddingComment()" diameter="20"></mat-spinner>
                  {{ isAddingComment() ? 'Agregando...' : 'Agregar Comentario' }}
                </button>
              </form>
            </div>
          </mat-tab>

          <!-- Tab de Archivos -->
          <mat-tab label="Archivos">
            <div class="tab-content">
              <!-- Lista de archivos existentes -->
              <div class="files-list" *ngIf="files().length > 0">
                <h3>Archivos adjuntos</h3>
                <mat-list>
                  <mat-list-item *ngFor="let file of files()">
                    <div class="file-item">
                      <mat-icon class="file-icon">{{ getFileIcon(file.mimeType) }}</mat-icon>
                      <div class="file-info">
                        <div class="file-name">{{ file.fileName }}</div>
                        <div class="file-details">
                          <span class="file-size">{{ formatFileSize(file.fileSize) }}</span>
                          <span class="file-date">{{ formatDate(file.uploadedAt) }}</span>
                          <span class="file-uploader">por {{ file.uploadedByName || 'Usuario' }}</span>
                        </div>
                      </div>
                      <button mat-icon-button (click)="downloadFile(file)" matTooltip="Descargar">
                        <mat-icon>download</mat-icon>
                      </button>
                    </div>
                  </mat-list-item>
                </mat-list>
              </div>

              <!-- Formulario para subir archivo -->
              <div class="file-upload-form">
                <h3>Subir nuevo archivo</h3>
                
                <div class="file-input-container">
                  <input 
                    #fileInput 
                    type="file" 
                    (change)="onFileSelected($event)" 
                    accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp"
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
                  <mat-chip-listbox>
                    <mat-chip-option selected>
                      <mat-icon matChipAvatar>{{ getFileIcon(selectedFile()!.type) }}</mat-icon>
                      {{ selectedFile()!.name }}
                      <button matChipRemove (click)="removeSelectedFile()">
                        <mat-icon>cancel</mat-icon>
                      </button>
                    </mat-chip-option>
                  </mat-chip-listbox>
                  
                  <div class="file-size">{{ formatFileSize(selectedFile()!.size) }}</div>
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

    .comment-form {
      margin-top: 20px;
    }

    .full-width {
      width: 100%;
    }

    .add-comment-btn {
      margin-top: 10px;
    }

    .comments-list {
      margin-bottom: 20px;
    }

    .comment-item {
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .comment-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 0.875rem;
    }

    .comment-author {
      font-weight: 500;
      color: #1976d2;
    }

    .comment-date {
      color: #666;
    }

    .comment-text {
      color: #333;
      line-height: 1.4;
    }

    .files-list {
      margin-bottom: 20px;
    }

    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .file-icon {
      color: #666;
    }

    .file-info {
      flex: 1;
    }

    .file-name {
      font-weight: 500;
      margin-bottom: 4px;
    }

    .file-details {
      font-size: 0.875rem;
      color: #666;
      display: flex;
      gap: 12px;
    }

    .file-upload-form h3 {
      margin-bottom: 16px;
    }

    .file-input-container {
      margin-bottom: 16px;
    }

    .file-select-btn {
      width: 100%;
    }

    .selected-file {
      margin: 16px 0;
    }

    .file-size {
      margin-top: 8px;
      font-size: 0.875rem;
      color: #666;
    }

    .upload-btn {
      width: 100%;
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

  constructor(
    public dialogRef: MatDialogRef<TaskActionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TaskActionsDialogData,
    private fb: FormBuilder,
    private taskService: TaskService,
    private fileUploadService: FileUploadService,
    private snackBar: MatSnackBar
  ) {
    this.commentForm = this.fb.group({
      comment: ['', [Validators.required, Validators.minLength(3)]]
    });
  }

  ngOnInit(): void {
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

  uploadFile(): void {
    const file = this.selectedFile();
    if (!file) return;

    this.isUploading.set(true);

    this.fileUploadService.uploadFile(file).subscribe({
      next: (response) => {
        // Agregar el archivo a la tarea
        const fileInfo = {
          fileName: response.fileInfo.originalName,
          fileUrl: response.fileUrl,
          fileSize: response.fileInfo.size,
          mimeType: response.fileInfo.mimetype
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
    window.open(file.fileUrl, '_blank');
  }

  getFileIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'picture_as_pdf';
    if (mimeType.includes('word')) return 'description';
    if (mimeType === 'text/plain') return 'text_snippet';
    return 'insert_drive_file';
  }

  formatFileSize(bytes: number): string {
    return this.fileUploadService.formatFileSize(bytes);
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
}