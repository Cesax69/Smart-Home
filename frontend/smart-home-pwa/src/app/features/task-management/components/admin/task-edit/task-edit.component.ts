import { Component, Inject, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule, MatAccordion } from '@angular/material/expansion';
// MatSnackBar removido: usamos AlertCenter
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task, UpdateTaskRequest, TaskFile } from '../../../models/task.model';
import { User } from '../../../../../models/user.model';
import { FormValidators } from '../../../../../shared/validators/form-validators';
import { AlertService } from '../../../../../services/alert.service';

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'document';
  name: string;
  size: string;
}

@Component({
  selector: 'app-admin-task-edit',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatExpansionModule,
    MatCheckboxModule,
    MatButtonToggleModule,
    MatChipsModule
  ],
  templateUrl: './task-edit.component.html',
  styleUrl: './task-edit.component.scss'
})
export class AdminTaskEditComponent implements OnInit {
  taskForm: FormGroup;
  submitting = false;
  taskId: number | null = null;
  task: Task | null = null;
  familyMembers: User[] = [];
  existingFiles: TaskFile[] = [];
  filePreviews: FilePreview[] = [];
  showDropZone = false;
  @ViewChild(MatAccordion) accordion?: MatAccordion;

  private readonly maxFiles = 5;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private authService: AuthService,
    private http: HttpClient,
    private dialogRef: MatDialogRef<AdminTaskEditComponent>,
    private alertService: AlertService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      priority: ['media', [Validators.required, FormValidators.priorityValidator()]],
      startDate: [null, [FormValidators.futureDateValidator()]],
      dueDate: [null, [FormValidators.futureDateValidator()]],
      assignedUserIds: [[], Validators.required],
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

  ngOnInit(): void {
    // Bloquear cierre por clic fuera del modal
    this.dialogRef.disableClose = true;
    this.taskId = this.data?.taskId ? Number(this.data.taskId) : null;
    if (!this.taskId || this.taskId <= 0) {
      this.alertService.error('Tarea inválida', 'No se puede editar esta tarea.', { duration: 4000, dismissible: true });
      this.close();
      return;
    }
    this.loadTask();
    this.loadFamilyMembers();
    this.loadExistingFiles();
  }

  getErrorMessage(controlName: string): string {
    const control = this.taskForm.get(controlName);
    if (!control) return '';
    if (control.hasError('required')) return 'Campo obligatorio';
    const minlength = (control.errors?.['minlength']?.requiredLength as number) || null;
    if (minlength) return `Mínimo ${minlength} caracteres`;
    return 'Campo inválido';
  }

  private loadTask(): void {
    this.taskService.getTaskById(this.taskId!).subscribe({
      next: (t: Task) => {
        this.task = t;
        this.taskForm.patchValue({
          title: t.title,
          description: t.description || '',
          // Mapear prioridad del modelo (en) a valor español del selector
          priority: (t.priority === 'low' ? 'baja' : t.priority === 'medium' ? 'media' : 'alta'),
          startDate: t.startDate ? new Date(t.startDate) : null,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          assignedUserIds: Array.isArray(t.assignedUserIds) && t.assignedUserIds.length > 0
            ? t.assignedUserIds
            : (t.assignedTo ? [t.assignedTo] : []),
          estimatedTime: t.estimatedTime || '',
          estimatedTimeDuration: this.formatMinutesToHHMM(t.estimatedTime || 0),
          isRecurring: !!t.isRecurring,
          recurrenceInterval: t.recurrenceInterval || ''
        });
      },
      error: () => {
        this.alertService.error('Error cargando tarea', 'No se pudo cargar la tarea.', { duration: 3000, dismissible: true });
      }
    });
  }

  private loadFamilyMembers(): void {
    this.authService.getFamilyMembers().subscribe({
      next: (members: User[]) => this.familyMembers = members,
      error: () => {}
    });
  }

  private loadExistingFiles(): void {
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

        // Fusionar con registros de BD por googleDriveId o nombre
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

        // Si hay BD sin correspondencia, conservarlos también
        const extras = this.existingFiles.filter(f => !merged.find(m => m.googleDriveId === f.googleDriveId || m.fileName === f.fileName));
        this.existingFiles = [...merged, ...extras];
      },
      error: () => {}
    });
  }

  // ====== Archivos nuevos (previews y carga) ======
  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (files && files.length) {
      this.addFiles(Array.from(files));
    }
  }

  openDropZone(): void {
    this.showDropZone = true;
  }

  toggleDropZone(): void {
    this.showDropZone = !this.showDropZone;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files ? Array.from(input.files) : [];
    this.addFiles(files);
  }

  private addFiles(files: File[]): void {
    if (!files || files.length === 0) return;
    const errors: string[] = [];
    let remaining = this.maxFiles - this.filePreviews.length;
    if (remaining <= 0) {
      this.alertService.warning('Límite de archivos', `Máximo ${this.maxFiles} archivos permitidos.`, { duration: 3000, dismissible: true });
      return;
    }
    for (const file of files) {
      if (remaining <= 0) {
        errors.push(`Se alcanzó el máximo de ${this.maxFiles} archivos.`);
        break;
      }
      if (file.size > this.maxFileSize) {
        errors.push(`Demasiado grande: ${file.name}`);
        continue;
      }
      const isImage = file.type.startsWith('image/');
      const preview: FilePreview = {
        file,
        url: isImage ? URL.createObjectURL(file) : '',
        type: isImage ? 'image' : 'document',
        name: file.name,
        size: this.formatSize(file.size)
      };
      this.filePreviews.push(preview);
      remaining--;
    }
    if (errors.length > 0) {
      this.alertService.warning('Algunos archivos no se agregaron', errors.map(e => `• ${e}`).join('\n'), { duration: 5000, dismissible: true });
    }
  }

  private getFieldDisplayName(field: string): string {
    const map: Record<string, string> = {
      title: 'Título',
      description: 'Descripción',
      priority: 'Prioridad',
      startDate: 'Fecha de inicio',
      dueDate: 'Fecha límite',
      assignedUserIds: 'Asignados',
      estimatedTime: 'Tiempo estimado',
      estimatedTimeDuration: 'Tiempo estimado',
      recurrenceInterval: 'Periodo de recurrencia'
    };
    return map[field] ?? field;
  }

  private getInvalidSummary(): string {
    const messages: string[] = [];
    const controls = this.taskForm.controls as any;
    Object.keys(controls).forEach(key => {
      const ctrl = controls[key];
      if (!ctrl || ctrl.valid) return;
      const name = this.getFieldDisplayName(key);
      if (ctrl.hasError('required')) messages.push(`${name}: es requerido`);
      const minLength = ctrl.errors?.['minlength']?.requiredLength;
      if (minLength) messages.push(`${name}: mínimo ${minLength} caracteres`);
      const min = ctrl.errors?.['min']?.min;
      if (typeof min === 'number') messages.push(`${name}: mínimo ${min}`);
      const max = ctrl.errors?.['max']?.max;
      if (typeof max === 'number') messages.push(`${name}: máximo ${max}`);
      if (ctrl.hasError('futureDate')) messages.push(`${name}: debe ser una fecha futura`);
      if (ctrl.hasError('invalidPriority')) messages.push(`${name}: valor de prioridad inválido`);
    });
    if (this.taskForm.hasError('dateRange')) {
      messages.push('Rango de fechas: la fecha límite debe ser posterior a la de inicio');
    }
    return messages.length ? messages.map(m => `• ${m}`).join('\n') : 'Revisa los campos con errores.';
  }

  removeFile(preview: FilePreview): void {
    this.filePreviews = this.filePreviews.filter(p => p !== preview);
  }

  removeExistingFile(file: TaskFile): void {
    const driveId = file.googleDriveId || this.extractDriveFileId(file.fileUrl || undefined);
    const deleteDrive$ = driveId ? this.http.delete(`${environment.services.fileUpload}/files/drive/files/${driveId}`) : null;
    const deleteRecord$ = this.taskService.deleteTaskFile(file.id);

    // Mostrar progreso en AlertCenter y ejecutar ambas operaciones, tolerando fallos en Drive
    const alertId = this.alertService.info('Eliminando archivo', 'Procesando eliminación...', { loading: true, dismissible: false, duration: 0 });
    if (deleteDrive$) {
      deleteDrive$.subscribe({
        next: () => {},
        error: () => {}
      });
    }
    deleteRecord$.subscribe({
      next: () => {
        this.existingFiles = this.existingFiles.filter(f => f.id !== file.id);
        this.alertService.update(alertId, { type: 'success', title: 'Archivo eliminado', message: 'Se eliminó correctamente', loading: false, duration: 2500 });
      },
      error: () => {
        this.alertService.update(alertId, { type: 'error', title: 'Error eliminando archivo', message: 'No se pudo eliminar el archivo', loading: false, dismissible: true, duration: 5000 });
      }
    });
  }

  replaceExistingFile(file: TaskFile, event: Event): void {
    const input = event.target as HTMLInputElement;
    const selected = input.files?.[0];
    if (!selected) return;

    if (selected.size > this.maxFileSize) {
      this.alertService.warning('Archivo demasiado grande', 'Máximo permitido: 10MB', { duration: 4000, dismissible: true });
      return;
    }

    const formData = new FormData();
    formData.append('file', selected);
    const title = ((this.taskForm.value?.title || this.task?.title || '').toString().trim());
    if (title) {
      formData.append('taskTitle', title);
      formData.append('title', title);
    } else {
      formData.append('taskTitle', 'tarea');
      formData.append('title', 'tarea');
    }
    const folderId = file.folderId || this.existingFiles[0]?.folderId;
    if (folderId) formData.append('folderId', folderId);
    const uploadUrl = `${environment.services.fileUpload}/files/upload`;
    const driveId = file.googleDriveId || this.extractDriveFileId(file.fileUrl || undefined);
    const deleteUrl = driveId ? `${environment.services.fileUpload}/files/drive/files/${driveId}` : null;

    const alertId = this.alertService.info('Reemplazando archivo', 'Subiendo y actualizando...', { loading: true, dismissible: false, duration: 0 });
    const uploadAfterDelete = () => this.http.post<any>(uploadUrl, formData).subscribe({
      next: (resp: any) => {
        const uploaded = Array.isArray(resp?.uploaded) ? resp.uploaded : [];
        const u = uploaded[0];
        if (!u) {
          this.alertService.update(alertId, { type: 'error', title: 'Error subiendo archivo', message: 'No se pudo subir el archivo de reemplazo', loading: false, dismissible: true, duration: 5000 });
          return;
        }
        this.taskService.replaceTaskFile(file.id, u).subscribe({
          next: (updated) => {
            // Actualizar el registro en la lista local
            this.existingFiles = this.existingFiles.map(f => f.id === file.id ? {
              ...f,
              fileName: updated.fileName,
              fileUrl: updated.fileUrl,
              filePath: updated.filePath,
              fileSize: updated.fileSize,
              mimeType: updated.mimeType,
              storageType: updated.storageType,
              googleDriveId: updated.googleDriveId,
              isImage: updated.isImage,
              folderId: updated.folderId,
              folderName: updated.folderName
            } : f);
            this.alertService.update(alertId, { type: 'success', title: 'Archivo reemplazado', message: 'Se actualizó correctamente', loading: false, duration: 2500 });
          },
          error: () => {
            this.alertService.update(alertId, { type: 'error', title: 'Error actualizando registro', message: 'No se pudo actualizar el archivo en BD', loading: false, dismissible: true, duration: 5000 });
          }
        });
      },
      error: () => {
        this.alertService.update(alertId, { type: 'error', title: 'Error subiendo archivo', message: 'No se pudo subir el archivo de reemplazo', loading: false, dismissible: true, duration: 5000 });
      }
    });
    if (deleteUrl) {
      this.http.delete<any>(deleteUrl).subscribe({
        next: () => uploadAfterDelete(),
        error: () => uploadAfterDelete() // Continuar aunque falle el borrado en Drive
      });
    } else {
      uploadAfterDelete();
    }
    // Reset input para permitir seleccionar el mismo archivo otra vez si hace falta
    input.value = '';
  }

  private extractDriveFileId(url?: string): string | null {
    if (!url) return null;
    // Patterns comunes de Google Drive
    const patterns = [
      /\/file\/d\/([\w-]+)/,            // https://drive.google.com/file/d/<id>/view
      /id=([\w-]+)/,                     // ...?id=<id>
      /folders\/([\w-]+)/                // folder id
    ];
    for (const re of patterns) {
      const m = url.match(re);
      if (m && m[1]) return m[1];
    }
    return null;
  }

  private formatSize(bytes: number): string {
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  // ====== Duración estimada ======
  setPresetDuration(minutes: number): void {
    this.taskForm.patchValue({
      estimatedTime: minutes,
      estimatedTimeDuration: this.formatMinutesToHHMM(minutes)
    });
    this.taskForm.get('estimatedTime')?.markAsDirty();
  }

  onDurationChange(): void {
    const value = this.taskForm.get('estimatedTimeDuration')?.value as string;
    const minutes = this.parseDurationToMinutes(value || null);
    if (minutes != null) {
      this.taskForm.get('estimatedTime')?.setValue(minutes);
      this.taskForm.get('estimatedTime')?.markAsDirty();
    }
  }

  private parseDurationToMinutes(hhmm?: string | null): number | null {
    if (!hhmm) return null;
    const trimmed = hhmm.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/^([0-9]{1,2}):([0-9]{2})$/);
    if (!m) return null;
    const hours = Number(m[1]);
    const mins = Number(m[2]);
    if (Number.isNaN(hours) || Number.isNaN(mins)) return null;
    return hours * 60 + mins;
  }

  private formatMinutesToHHMM(minutes?: number | null): string {
    const m = typeof minutes === 'number' && minutes > 0 ? minutes : 0;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    const hhStr = (h < 10 ? '0' : '') + h;
    const mmStr = (mm < 10 ? '0' : '') + mm;
    return `${hhStr}:${mmStr}`;
  }

  getSelectedMembers(): User[] {
    const ids: number[] = this.taskForm.get('assignedUserIds')?.value || [];
    return this.familyMembers.filter(m => ids.includes(m.id));
  }

  // ====== Guardar cambios ======
  onSubmit(): void {
    if (this.taskForm.invalid || !this.taskId) {
      this.markFormGroupTouched();
      this.alertService.warning('Formulario inválido', this.getInvalidSummary(), { dismissible: true, duration: 4000 });
      return;
    }
    this.submitting = true;
    const progressId = this.alertService.info('Actualizando tarea', 'Procesando archivos y cambios...', { loading: true, dismissible: false, duration: 0 });

    const v = this.taskForm.value;
    const updates: UpdateTaskRequest = {
      title: v.title,
      description: v.description || undefined,
      priority: v.priority,
      assignedUserIds: Array.isArray(v.assignedUserIds) ? v.assignedUserIds : undefined,
      startDate: v.startDate ? (v.startDate as Date).toISOString() as any : undefined,
      dueDate: v.dueDate ? (v.dueDate as Date).toISOString() as any : undefined,
      isRecurring: v.isRecurring || false,
      recurrenceInterval: v.recurrenceInterval || undefined
    } as any;

    // Asegurar estimatedTime en minutos
    let minutes: number | null = null;
    if (v.estimatedTime) {
      minutes = Number(v.estimatedTime);
    } else if (v.estimatedTimeDuration) {
      minutes = this.parseDurationToMinutes(v.estimatedTimeDuration || null);
    }
    if (minutes && minutes > 0) {
      (updates as any).estimatedTime = minutes;
    }

    const hasNewFiles = this.filePreviews.length > 0;
    const upload$ = hasNewFiles ? this.uploadSelectedFiles(v.title || '') : null;

    if (upload$) {
      upload$.subscribe({
        next: (resp: any) => {
          const uploaded = Array.isArray(resp?.uploaded) ? resp.uploaded : [];
          // registrar en BD
          this.taskService.registerTaskFiles(this.taskId!, uploaded).subscribe({
            next: () => this.finalizeUpdate(updates, uploaded[0]?.fileUrl || undefined, progressId),
            error: () => this.finalizeUpdate(updates, undefined, progressId)
          });
        },
        error: () => this.finalizeUpdate(updates, undefined, progressId)
      });
    } else {
      this.finalizeUpdate(updates, undefined, progressId);
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.taskForm.controls).forEach(key => {
      const control = this.taskForm.get(key);
      control?.markAsTouched();
    });
  }

  private finalizeUpdate(updates: UpdateTaskRequest, firstFileUrl?: string, progressId?: string): void {
    if (firstFileUrl) {
      (updates as any).fileUrl = firstFileUrl;
    }
    this.taskService.updateTask(this.taskId!, updates).subscribe({
      next: (t) => {
        if (progressId) {
          this.alertService.update(progressId, { type: 'success', loading: false, title: 'Tarea actualizada', message: 'Los cambios se guardaron correctamente', duration: 3000 });
        }
        // Cerrar todas las secciones del accordion al guardar
        this.accordion?.closeAll();
        this.dialogRef.close(t);
        this.submitting = false;
      },
      error: () => {
        if (progressId) {
          this.alertService.update(progressId, { type: 'error', loading: false, title: 'Error actualizando', message: 'No se pudo actualizar la tarea', duration: 5000 });
        }
        this.submitting = false;
      }
    });
  }

  private uploadSelectedFiles(title: string) {
    const formData = new FormData();
    this.filePreviews.forEach(p => formData.append('file', p.file));
    const safeTitle = (title || 'tarea').toString().trim();
    // Incluimos ambos campos por compatibilidad con el backend y evitar "sin título"
    formData.append('taskTitle', safeTitle);
    formData.append('title', safeTitle);
    const folderId = this.existingFiles[0]?.folderId;
    if (folderId) formData.append('folderId', folderId);
    const uploadUrl = `${environment.services.fileUpload}/files/upload`;
    return this.http.post<any>(uploadUrl, formData);
  }

  close(): void {
    if (this.submitting) return; // Evitar cierre durante procesos
    this.dialogRef.close();
  }
}