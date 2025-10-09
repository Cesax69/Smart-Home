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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task, CreateTaskRequest, UpdateTaskRequest, TaskFile } from '../../../models/task.model';
import { User } from '../../../../../models/user.model';
import { FormValidators } from '../../../../../shared/validators/form-validators';

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
    MatSnackBarModule,
    MatButtonToggleModule,
    MatCheckboxModule
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
                  <div class="actions" style="justify-content:flex-start; margin-bottom:8px;">
                    <button mat-stroked-button color="primary" type="button" (click)="toggleAttachments()">
                      <mat-icon>{{ showAttachments ? 'close' : 'add' }}</mat-icon>
                      {{ showAttachments ? 'Cancelar' : 'Agregar archivos' }}
                    </button>
                  </div>
                  <label class="file-label" *ngIf="showAttachments">Archivos de la tarea</label>
                  <input *ngIf="showAttachments" type="file" multiple (change)="onFilesSelected($event)" />
                  <div class="file-previews" *ngIf="showAttachments && filePreviews().length > 0">
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

                  <!-- Archivos existentes registrados -->
                  <div class="existing-files" *ngIf="existingFiles.length">
                    <h4>Archivos existentes</h4>
                    <div class="file-list">
                      <div class="file-item" *ngFor="let f of existingFiles">
                        <mat-icon *ngIf="!f.isImage">insert_drive_file</mat-icon>
                        <a [href]="f.fileUrl" target="_blank">{{ f.fileName }}</a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Rango de fechas -->
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Rango de fechas</mat-label>
                  <mat-date-range-input [formGroup]="editForm" [rangePicker]="rangePicker">
                    <input matStartDate formControlName="startDate" placeholder="Inicio" readonly (focus)="rangePicker.open()" (click)="rangePicker.open()">
                    <input matEndDate formControlName="dueDate" placeholder="Límite" readonly (focus)="rangePicker.open()" (click)="rangePicker.open()">
                  </mat-date-range-input>
                  <mat-datepicker-toggle matIconSuffix [for]="rangePicker"></mat-datepicker-toggle>
                  <mat-date-range-picker #rangePicker></mat-date-range-picker>
                </mat-form-field>
              </div>

              <!-- Tiempo estimado -->
              <div class="form-row">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Tiempo estimado (HH:MM)</mat-label>
                  <input matInput type="text" inputmode="numeric" formControlName="estimatedTimeDuration" placeholder="HH:MM" (input)="onDurationChange()">
                  <mat-hint>Formato 24h, ej: 01:30</mat-hint>
                  <mat-icon matSuffix>schedule</mat-icon>
                </mat-form-field>
                <div class="time-presets" style="margin-bottom:8px;">
                  <span class="presets-label">Rápido:</span>
                  <mat-button-toggle-group (change)="setPresetDuration($event.value)">
                    <mat-button-toggle [value]="15">15m</mat-button-toggle>
                    <mat-button-toggle [value]="30">30m</mat-button-toggle>
                    <mat-button-toggle [value]="45">45m</mat-button-toggle>
                    <mat-button-toggle [value]="60">1h</mat-button-toggle>
                    <mat-button-toggle [value]="90">1h 30</mat-button-toggle>
                    <mat-button-toggle [value]="120">2h</mat-button-toggle>
                  </mat-button-toggle-group>
                </div>
              </div>

              <!-- Recurrencia -->
              <div class="recurrence-section">
                <mat-checkbox formControlName="isRecurring" class="recurrence-checkbox">
                  Tarea recurrente
                </mat-checkbox>
                @if (editForm.get('isRecurring')?.value) {
                  <mat-form-field appearance="outline" class="recurrence-field">
                    <mat-label>Repetir cada</mat-label>
                    <mat-select formControlName="recurrenceInterval">
                      <mat-option value="daily">Diariamente</mat-option>
                      <mat-option value="weekly">Semanalmente</mat-option>
                      <mat-option value="monthly">Mensualmente</mat-option>
                      <mat-option value="yearly">Anualmente</mat-option>
                    </mat-select>
                  </mat-form-field>
                }
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
                  <mat-select formControlName="status">
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

    .recurrence-section { display: flex; flex-direction: column; gap: 12px; }
    .recurrence-checkbox { margin-bottom: 8px; }
    .recurrence-field { max-width: 300px; }

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
  filePreviews = signal<{ file: File; name: string; size: number; type: string }[]>([]);
  showAttachments: boolean = false;
  existingFiles: TaskFile[] = [];

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
      priority: ['medium', [Validators.required, FormValidators.priorityValidator()]],
      status: ['pending', Validators.required],
      assignedTo: [[], Validators.required],
      startDate: [null, [FormValidators.futureDateValidator()]],
      dueDate: [null, [FormValidators.futureDateValidator()]],
      estimatedTime: ['', [Validators.min(1), Validators.max(480)]], // minutos
      estimatedTimeDuration: [''], // HH:MM
      isRecurring: [false],
      recurrenceInterval: ['']
    }, {
      validators: [
        FormValidators.dateRangeValidator('startDate', 'dueDate'),
        FormValidators.conditionalRequired('isRecurring', 'recurrenceInterval')
      ]
    });
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      const routeId = params['id'] ? +params['id'] : null;
      const modalId = this.data?.taskId ? Number(this.data.taskId) : null;
      this.taskId = routeId || modalId;
      if (this.taskId) {
        this.loadTask();
        this.loadFamilyMembers();
        this.loadExistingFiles();
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
    const minutes = task.estimatedTime ?? null;
    this.editForm.patchValue({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      assignedTo: assignedIds,
      startDate: task.startDate ? new Date(task.startDate as any) : null,
      dueDate: task.dueDate ? new Date(task.dueDate as any) : null,
      estimatedTime: minutes || '',
      estimatedTimeDuration: minutes != null ? this.formatMinutesToHHMM(minutes) : '',
      isRecurring: !!task.isRecurring,
      recurrenceInterval: task.recurrenceInterval || ''
    });
  }

  private loadExistingFiles(): void {
    if (!this.taskId) return;
    this.taskService.getTaskFiles(this.taskId!).subscribe({
      next: (files: TaskFile[]) => {
        this.existingFiles = files || [];
        const folderId = this.existingFiles[0]?.folderId;
        if (folderId) {
          this.loadDriveFilesFromFolder(folderId);
        }
      },
      error: () => {}
    });
  }

  private loadDriveFilesFromFolder(folderId: string): void {
    const url = `${environment.services.fileUpload}/files/drive/folders/${folderId}/files?pageSize=50`;
    this.http.get<any>(url).subscribe({
      next: (resp) => {
        const driveFiles: any[] = Array.isArray(resp?.files) ? resp.files : [];
        if (!driveFiles.length) return;

        const byId = new Map<string, TaskFile>();
        this.existingFiles.forEach(f => {
          if (f.googleDriveId) byId.set(f.googleDriveId, f);
        });

        const merged: TaskFile[] = driveFiles.map(df => {
          const id: string = df.id;
          const matched = byId.get(id) || this.existingFiles.find(f => f.fileName === df.name) || null;
          const directUrl = `https://drive.google.com/uc?id=${id}`;
          return {
            id: matched?.id || 0,
            taskId: matched?.taskId || this.taskId!,
            fileName: df.name,
            mimeType: df.mimeType || matched?.mimeType || 'application/octet-stream',
            fileSize: Number(df.size || matched?.fileSize || 0),
            fileUrl: directUrl,
            storageType: 'google_drive',
            googleDriveId: id,
            folderId: folderId,
            folderName: matched?.folderName || undefined
          } as TaskFile;
        });

        const extras = this.existingFiles.filter(f => !merged.find(m => m.googleDriveId === f.googleDriveId || m.fileName === f.fileName));
        this.existingFiles = [...merged, ...extras];
      },
      error: () => {}
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

  toggleAttachments(): void {
    this.showAttachments = !this.showAttachments;
  }

  private parseDurationToMinutes(hhmm: string): number | null {
    if (!hhmm) return null;
    const parts = hhmm.split(':');
    if (parts.length !== 2) return null;
    const hh = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    if (isNaN(hh) || isNaN(mm)) return null;
    return hh * 60 + mm;
  }

  private formatMinutesToHHMM(minutes: number): string {
    const hh = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mm = (minutes % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  onDurationChange(): void {
    const val = (this.editForm.get('estimatedTimeDuration')?.value || '').toString();
    const minutes = this.parseDurationToMinutes(val);
    if (minutes != null) {
      this.editForm.get('estimatedTime')?.setValue(minutes);
    }
  }

  setPresetDuration(minutes: number): void {
    this.editForm.get('estimatedTime')?.setValue(minutes);
    const hhmm = this.formatMinutesToHHMM(minutes);
    this.editForm.get('estimatedTimeDuration')?.setValue(hhmm);
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
    if (title) {
      // Incluimos ambos campos por compatibilidad con el backend
      formData.append('taskTitle', title);
      formData.append('title', title);
    }
    const folderId = this.existingFiles[0]?.folderId;
    if (folderId) formData.append('folderId', folderId);
    const uploadUrl = `${environment.services.fileUpload}/files/upload`;
    return this.http.post<any>(uploadUrl, formData);
  }

  onSubmit() {
    if (this.editForm.valid && this.taskId) {
      this.isSubmitting.set(true);

      const formValue = this.editForm.value;
      const selectedIds: number[] = Array.isArray(formValue.assignedTo) ? formValue.assignedTo : (formValue.assignedTo ? [formValue.assignedTo] : []);
      const estimatedMinutes = this.parseDurationToMinutes((formValue.estimatedTimeDuration || '').toString());
      const baseUpdate: UpdateTaskRequest = {
        title: formValue.title,
        description: formValue.description || undefined,
        priority: formValue.priority,
        status: formValue.status,
        assignedUserIds: selectedIds.length > 0 ? selectedIds : undefined,
        assignedTo: selectedIds.length === 1 ? selectedIds[0] : undefined,
        startDate: formValue.startDate ? formValue.startDate.toISOString() as any : undefined,
        dueDate: formValue.dueDate ? formValue.dueDate.toISOString() as any : undefined,
        estimatedTime: estimatedMinutes || undefined,
        isRecurring: formValue.isRecurring || undefined,
        recurrenceInterval: formValue.recurrenceInterval || undefined
      } as any;

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
                const uploaded = Array.isArray(res?.uploaded) ? res.uploaded : [];
                const firstUrl = res?.fileUrl || (uploaded[0]?.fileUrl ?? null);
                if (uploaded.length) {
                  this.taskService.registerTaskFiles(this.taskId!, uploaded).subscribe({
                    next: () => {
                      this.loadExistingFiles();
                      proceedUpdate(firstUrl || undefined);
                    },
                    error: () => {
                      // Aún actualizamos la tarea aunque falle el registro; informamos el error
                      this.snackBar.open('Archivos subidos, pero no registrados en BD', 'Cerrar', { duration: 3000, panelClass: ['error-snackbar'] });
                      proceedUpdate(firstUrl || undefined);
                    }
                  });
                } else {
                  proceedUpdate(firstUrl || undefined);
                }
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
                const uploaded = Array.isArray(res?.uploaded) ? res.uploaded : [];
                const firstUrl = res?.fileUrl || (uploaded[0]?.fileUrl ?? null);
                if (uploaded.length) {
                  this.taskService.registerTaskFiles(this.taskId!, uploaded).subscribe({
                    next: () => {
                      this.loadExistingFiles();
                      proceedUpdate(firstUrl || undefined);
                    },
                    error: () => {
                      this.snackBar.open('Archivos subidos, pero no registrados en BD', 'Cerrar', { duration: 3000, panelClass: ['error-snackbar'] });
                      proceedUpdate(firstUrl || undefined);
                    }
                  });
                } else {
                  proceedUpdate(firstUrl || undefined);
                }
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