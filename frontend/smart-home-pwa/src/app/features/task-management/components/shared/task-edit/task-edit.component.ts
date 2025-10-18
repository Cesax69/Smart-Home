import { Component, OnInit, signal, Inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task, CreateTaskRequest, UpdateTaskRequest } from '../../../models/task.model';
import { User } from '../../../../../models/user.model';

@Component({
  selector: 'app-task-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="edit-task-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>✏️ Editando Tarea</h1>
      </div>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner></mat-spinner>
          <p>Cargando tarea...</p>
        </div>
      } @else if (task()) {
        <mat-card class="edit-form-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>edit_note</mat-icon>
              Actualizar "{{ task()?.title }}"
            </mat-card-title>
            <mat-card-subtitle>
              Modifica los detalles de la tarea como necesites 🎯
            </mat-card-subtitle>
          </mat-card-header>

          <mat-card-content>
            <form [formGroup]="editForm" (ngSubmit)="onSubmit()" class="edit-form">
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Título de la tarea</mat-label>
                  <input matInput formControlName="title" placeholder="¿Qué hay que hacer?">
                  <mat-icon matSuffix>title</mat-icon>
                  @if (editForm.get('title')?.hasError('required') && editForm.get('title')?.touched) {
                    <mat-error>El título es obligatorio</mat-error>
                  }
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Descripción</mat-label>
                  <textarea matInput formControlName="description" rows="4" 
                           placeholder="Cuéntanos más detalles sobre esta tarea..."></textarea>
                  <mat-icon matSuffix>description</mat-icon>
                </mat-form-field>
              </div>

              <div class="form-row">
                <div class="full-width file-upload-row">
                  <label class="file-label">Archivos de la tarea</label>
                  <input type="file" multiple (change)="onFilesSelected($event)" />
                  <div class="file-previews" *ngIf="filePreviews().length > 0">
                    @for (preview of filePreviews(); track preview.name) {
                      <div class="file-item">
                        <mat-icon>attach_file</mat-icon>
                        <span>{{ preview.name }}</span>
                      </div>
                    }
                  </div>
                  @if (task()?.fileUrl) {
                    <div class="current-file">
                      <mat-icon>link</mat-icon>
                      <a [href]="task()?.fileUrl" target="_blank">Archivo actual</a>
                    </div>
                  }
                </div>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Prioridad</mat-label>
                  <mat-select formControlName="priority">
                    <mat-option value="low">🟢 Baja - Sin prisa</mat-option>
                    <mat-option value="medium">🟡 Media - Importante</mat-option>
                    <mat-option value="high">🔴 Alta - ¡Urgente!</mat-option>
                  </mat-select>
                  <mat-icon matSuffix>priority_high</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                   <mat-label>Estado</mat-label>
                   <mat-select formControlName="status" [disabled]="isAdmin">
                     <mat-option value="pending">📋 Pendiente</mat-option>
                     <mat-option value="in_progress">⚡ En Progreso</mat-option>
                     <mat-option value="completed">✅ Completada</mat-option>
                   </mat-select>
                   <mat-icon matSuffix>assignment</mat-icon>
                 </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Asignar a</mat-label>
                  <mat-select formControlName="assignedTo" multiple>
                    @for (user of familyMembers(); track user.id) {
                      <mat-option [value]="user.id">
                        {{ user.firstName }} {{ user.lastName }} ({{ getRoleLabel(user.role) }})
                      </mat-option>
                    }
                  </mat-select>
                  <mat-icon matSuffix>person</mat-icon>
                  @if (editForm.get('assignedTo')?.hasError('required') && editForm.get('assignedTo')?.touched) {
                    <mat-error>Debes asignar la tarea a alguien</mat-error>
                  }
                  <mat-chip-set aria-label="Usuarios asignados" class="assigned-chip-list">
                    @for (member of getSelectedMembers(); track member.id) {
                      <mat-chip>{{ member.name }}</mat-chip>
                    }
                  </mat-chip-set>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Fecha límite</mat-label>
                  <input matInput [matDatepicker]="picker" formControlName="dueDate" 
                         placeholder="¿Cuándo debe estar lista?">
                  <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
                  <mat-datepicker #picker></mat-datepicker>
                </mat-form-field>
              </div>
            </form>
          </mat-card-content>

          <mat-card-actions class="form-actions">
            <button mat-button type="button" (click)="goBack()" [disabled]="isSubmitting()">
              <mat-icon>cancel</mat-icon>
              Cancelar
            </button>
            
            <button mat-raised-button color="primary" (click)="onSubmit()" 
                    [disabled]="editForm.invalid || isSubmitting()">
              @if (isSubmitting()) {
                <mat-spinner diameter="20"></mat-spinner>
              } @else {
                <mat-icon>save</mat-icon>
              }
              {{ isSubmitting() ? 'Guardando...' : 'Guardar Cambios' }}
            </button>
          </mat-card-actions>
        </mat-card>
      } @else {
        <mat-card class="error-card">
          <mat-card-content>
            <div class="error-content">
              <mat-icon class="error-icon">error_outline</mat-icon>
              <h3>¡Oops! Tarea no encontrada</h3>
              <p>No pudimos encontrar la tarea que intentas editar 😅</p>
              <button mat-raised-button color="primary" (click)="goBack()">
                <mat-icon>arrow_back</mat-icon>
                Volver a la lista
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .edit-task-container {
      padding: 24px;
      max-width: 800px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
    }

    .header h1 {
      margin: 0;
      color: #333;
      font-size: 28px;
    }

    .back-button {
      background-color: #f5f5f5;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 300px;
      gap: 16px;
    }

    .edit-form-card {
      margin-bottom: 24px;
    }

    .edit-form-card mat-card-header {
      margin-bottom: 24px;
    }

    .edit-form-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 20px;
    }

    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      padding: 16px 24px;
      background-color: #fafafa;
      margin: 0 -24px -24px -24px;
    }

    .file-upload-row {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .file-label { font-weight: 600; color: #444; }
    .file-previews { display: flex; flex-wrap: wrap; gap: 8px; }
    .file-item { display: flex; gap: 6px; align-items: center; padding: 4px 8px; background: #f7f7f7; border-radius: 6px; }
    .current-file { display: flex; gap: 6px; align-items: center; color: #555; }

    .error-card {
      text-align: center;
    }

    .error-content {
      padding: 48px 24px;
    }

    .error-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ff5722;
      margin-bottom: 16px;
    }

    .error-content h3 {
      color: #333;
      margin-bottom: 8px;
    }

    .error-content p {
      color: #666;
      margin-bottom: 24px;
    }

    @media (max-width: 768px) {
      .edit-task-container {
        padding: 16px;
      }

      .form-row {
        flex-direction: column;
        gap: 8px;
      }

      .form-actions {
        flex-direction: column;
      }

      .form-actions button {
        width: 100%;
      }
    }
  `]
})
export class TaskEditComponent implements OnInit {
  editForm: FormGroup;
  task = signal<Task | null>(null);
  familyMembers = signal<User[]>([]);
  isLoading = signal(true);
  isSubmitting = signal(false);
  taskId: number | null = null;
  isAdmin: boolean = false;
  filePreviews = signal<{ file: File; name: string; size: number; type: string }[]>([]);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private taskService: TaskService,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private dialogRef?: MatDialogRef<TaskEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data?: any
  ) {
    this.editForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['medium', Validators.required],
      status: ['pending', Validators.required],
      assignedTo: [[], Validators.required],
      dueDate: ['']
    });
  }

  ngOnInit() {
    const user = this.authService.getCurrentUser();
    this.isAdmin = !!user && user.role === 'head_of_household';
    this.route.params.subscribe(params => {
       const routeId = params['id'] ? +params['id'] : null;
       const modalId = this.data?.taskId ? Number(this.data.taskId) : null;
       this.taskId = routeId || modalId;
       if (this.taskId) {
         this.loadTask();
         this.loadFamilyMembers();
       }
     });
   }

  loadTask() {
    if (!this.taskId) return;

    this.isLoading.set(true);
    this.taskService.getTaskById(this.taskId).subscribe({
      next: (task: any) => {
        this.task.set(task);
        this.populateForm(task);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading task:', error);
        this.snackBar.open('Error al cargar la tarea 😞', 'Cerrar', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
        this.isLoading.set(false);
      }
    });
  }

  loadFamilyMembers() {
    this.authService.getFamilyMembers().subscribe({
      next: (members: User[]) => {
        this.familyMembers.set(members);
      },
      error: (error: any) => {
        console.error('Error loading family members:', error);
      }
    });
  }

  populateForm(task: Task) {
    const assignedIds = Array.isArray(task.assignedUserIds) && task.assignedUserIds.length > 0
      ? task.assignedUserIds
      : (task.assignedTo ? [task.assignedTo] : []);
    this.editForm.patchValue({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assignedTo: assignedIds,
      dueDate: task.dueDate ? new Date(task.dueDate) : null
    });
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    const previews = files.map(f => ({ file: f, name: f.name, size: f.size, type: f.type }));
    this.filePreviews.set(previews);
  }

  private extractDriveFileId(url: string | undefined): string | null {
    if (!url) return null;
    try {
      // Patterns comunes: https://drive.google.com/file/d/{id}/view
      const fileMatch = url.match(/\/file\/d\/([^/]+)/);
      if (fileMatch && fileMatch[1]) return fileMatch[1];
      // Otro: https://drive.google.com/uc?id={id}&export=download
      const urlObj = new URL(url);
      const idParam = urlObj.searchParams.get('id');
      if (idParam) return idParam;
    } catch {}
    return null;
  }

  private deleteExistingFileIfAny(url: string | undefined) {
    const fileId = this.extractDriveFileId(url);
    if (!fileId) return null;
    const deleteUrl = `${environment.services.fileUpload}/files/drive/files/${fileId}`;
    return this.http.delete<any>(deleteUrl);
  }

  private uploadSelectedFiles(title: string) {
    const previews = this.filePreviews();
    if (!previews.length) return null;
    const formData = new FormData();
    previews.forEach(p => formData.append('file', p.file));
    if (title) formData.append('taskTitle', title);
    const uploadUrl = `${environment.services.fileUpload}/files/upload`;
    return this.http.post<any>(uploadUrl, formData);
  }

  onSubmit() {
    if (this.editForm.valid && this.taskId) {
      this.isSubmitting.set(true);

      const formValue = this.editForm.value;
      const selectedIds: number[] = Array.isArray(formValue.assignedTo) ? formValue.assignedTo : (formValue.assignedTo ? [formValue.assignedTo] : []);
      const baseUpdate: UpdateTaskRequest = {
        title: formValue.title,
        description: formValue.description || undefined,
        priority: formValue.priority,
        status: formValue.status,
        assignedUserIds: selectedIds.length > 0 ? selectedIds : undefined,
        assignedTo: selectedIds.length === 1 ? selectedIds[0] : undefined,
        dueDate: formValue.dueDate ? formValue.dueDate.toISOString() as any : undefined
      } as any;

      // Si el estado se establece en pendiente, reiniciar progreso
      if (baseUpdate.status === 'pending') {
        (baseUpdate as any).progress = 0;
      }

      // Si es admin, no permitir cambios de estado ni progreso
      if (this.isAdmin) {
        delete (baseUpdate as any).status;
        delete (baseUpdate as any).progress;
      }

      const currentFileUrl = this.task()?.fileUrl;
      const hasNewFiles = (this.filePreviews()?.length || 0) > 0;

      // Flujo: si hay nuevos archivos -> borrar antiguo (si existe) y subir nuevos
      let delete$ = hasNewFiles ? this.deleteExistingFileIfAny(currentFileUrl) : null;
      let upload$ = hasNewFiles ? this.uploadSelectedFiles(baseUpdate.title || '') : null;

      const proceedUpdate = (fileUrl?: string) => {
        const updateRequest: UpdateTaskRequest = { ...baseUpdate };
        if (fileUrl) {
          (updateRequest as any).fileUrl = fileUrl;
        }
        this.taskService.updateTask(this.taskId!, updateRequest).subscribe({
          next: (updatedTask: any) => {
            this.snackBar.open('Tarea actualizada exitosamente 🎉', 'Cerrar', {
              duration: 3000,
              panelClass: ['success-snackbar']
            });
            // Si está en modal, cerrar. Si no, navegar atrás
            if (this.dialogRef) {
              this.dialogRef.close(updatedTask);
            } else {
              this.router.navigate(['/tasks']);
            }
          },
          error: (error: any) => {
            console.error('Error updating task:', error);
            this.snackBar.open('Error al actualizar la tarea 😞', 'Cerrar', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
            this.isSubmitting.set(false);
          }
        });
      };

      if (hasNewFiles) {
        // Encadenar: borrar -> subir -> actualizar
        (delete$ || of(null)).subscribe({
          next: () => {
            upload$!.subscribe({
              next: (res: any) => {
                const url = res?.fileUrl || (Array.isArray(res?.uploaded) ? res.uploaded[0]?.fileUrl : null);
                proceedUpdate(url || undefined);
              },
              error: (err: any) => {
                console.error('Error subiendo archivo nuevo:', err);
                this.snackBar.open('No se pudo subir el nuevo archivo', 'Cerrar', { duration: 3000, panelClass: ['error-snackbar'] });
                this.isSubmitting.set(false);
              }
            });
          },
          error: (err: any) => {
            console.warn('No se pudo borrar el archivo anterior (continuo):', err);
            // Aun si falla el borrado, intento subir y actualizar
            upload$!.subscribe({
              next: (res: any) => {
                const url = res?.fileUrl || (Array.isArray(res?.uploaded) ? res.uploaded[0]?.fileUrl : null);
                proceedUpdate(url || undefined);
              },
              error: (err2: any) => {
                console.error('Error subiendo archivo nuevo:', err2);
                this.snackBar.open('No se pudo subir el nuevo archivo', 'Cerrar', { duration: 3000, panelClass: ['error-snackbar'] });
                this.isSubmitting.set(false);
              }
            });
          }
        });
      } else {
        proceedUpdate();
      }
    }
  }

  getRoleLabel(role: string): string {
    const roleLabels: { [key: string]: string } = {
      'head_of_household': '👑 Jefe de familia',
      'adult': '👨‍👩‍👧‍👦 Adulto',
      'teenager': '🧑‍🎓 Adolescente',
      'child': '👶 Niño'
    };
    return roleLabels[role] || role;
  }

  goBack() {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/tasks']);
    }
  }

  getSelectedMembers(): { id: number; name: string }[] {
    const selectedIds: number[] = this.editForm.value.assignedTo || [];
    const membersMap = new Map<number, string>();
    this.familyMembers().forEach(m => {
      const name = [m.firstName, m.lastName].filter(Boolean).join(' ').trim() || (m as any).username || m.email;
      if (m.id != null) membersMap.set(m.id, name);
    });
    return (selectedIds || [])
      .map((id: number) => ({ id, name: membersMap.get(id) || `Usuario ${id}` }))
      .filter(item => !!item.name);
  }
}