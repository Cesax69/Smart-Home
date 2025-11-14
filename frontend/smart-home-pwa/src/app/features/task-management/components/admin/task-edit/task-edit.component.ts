import { Component, Inject, OnInit, Optional, ViewChild } from '@angular/core';
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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { TaskService } from '../../../services/task.service';
import { AuthService } from '../../../../../services/auth.service';
import { Task, UpdateTaskRequest, TaskFile } from '../../../models/task.model';
import { User } from '../../../../../models/user.model';
import { FormValidators } from '../../../../../shared/validators/form-validators';
import { AlertService } from '../../../../../services/alert.service';
import { FileUploadService } from '../../../../../services/file-upload.service';
import { NotificationService } from '../../../../../services/notification.service';
import { map } from 'rxjs';

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
    , MatTooltipModule
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
    @Optional() private dialogRef: MatDialogRef<AdminTaskEditComponent> | null,
    private alertService: AlertService,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    private route: ActivatedRoute,
    private router: Router,
    private fileUploadService: FileUploadService,
    private notificationService: NotificationService,
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      category: ['limpieza', [Validators.required]],
      priority: ['media', [Validators.required, FormValidators.priorityValidator()]],
      startDate: [null, [FormValidators.futureDateValidator()]],
      dueDate: [null, [FormValidators.futureDateValidator()]],
      assignedUserIds: [[], Validators.required],
      estimatedTime: ['', [Validators.min(1), Validators.max(480)]], // minutos
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
    if (this.dialogRef) {
      this.dialogRef.disableClose = true;
    }
    const routeIdRaw = this.route.snapshot.paramMap.get('id');
    const routeId = routeIdRaw ? Number(routeIdRaw) : null;
    const dialogId = this.data?.taskId ? Number(this.data.taskId) : null;
    this.taskId = (dialogId && dialogId > 0) ? dialogId : (routeId && routeId > 0 ? routeId : null);
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
          category: t.category,
          // Prioridad ya viene en español; usar directamente
          priority: t.priority,
          startDate: t.startDate ? new Date(t.startDate) : null,
          dueDate: t.dueDate ? new Date(t.dueDate) : null,
          assignedUserIds: Array.isArray(t.assignedUserIds) && t.assignedUserIds.length > 0
            ? t.assignedUserIds
            : (t.assignedTo ? [t.assignedTo] : []),
          estimatedTime: t.estimatedTime || '',
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
        const normalized = (files || []).map(f => this.normalizeTaskFile(f));
        this.existingFiles = normalized;
        const folderId = this.existingFiles[0]?.folderId;
        if (folderId) {
          this.loadDriveFilesFromFolder(folderId);
        }
      },
      error: () => {}
    });
  }

  private loadDriveFilesFromFolder(folderId: string): void {
    const url = `${environment.services.fileUpload}/drive/folders/${folderId}/files?pageSize=50`;
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
      if (!this.fileUploadService.isValidFileType(file)) {
        errors.push(`Tipo no permitido: ${file.name}`);
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
      this.alertService.warning('Formato del archivo inválido', errors.map(e => `• ${e}`).join('\n'), { duration: 5000, dismissible: true });
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
    const deleteDrive$ = driveId ? this.http.delete(`${environment.services.fileUpload}/drive/files/${driveId}`) : null;
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
    if (!this.fileUploadService.isValidFileType(selected)) {
      this.alertService.warning('Tipo de archivo no permitido', 'Solo se permiten: JPG, PNG, GIF, WebP, PDF, TXT, DOC, DOCX', { duration: 4000, dismissible: true });
      input.value = '';
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
    const uploadUrl = `${environment.services.fileUpload}/upload`;
    const driveId = file.googleDriveId || this.extractDriveFileId(file.fileUrl || undefined);
    const deleteUrl = driveId ? `${environment.services.fileUpload}/drive/files/${driveId}` : null;

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
          next: (updated: any) => {
            // Actualizar el registro en la lista local
            this.existingFiles = this.existingFiles.map(f => {
              if (f.id !== file.id) return f;
              const normalized = this.normalizeTaskFile(updated);
              return {
                ...f,
                fileName: normalized.fileName,
                fileUrl: normalized.fileUrl,
                fileSize: normalized.fileSize,
                mimeType: normalized.mimeType,
                storageType: normalized.storageType,
                googleDriveId: normalized.googleDriveId,
                isImage: normalized.isImage,
                folderId: normalized.folderId,
                folderName: normalized.folderName
              } as TaskFile;
            });
            this.alertService.update(alertId, { type: 'success', title: 'Archivo reemplazado', message: 'Se actualizó correctamente', loading: false, duration: 2500 });
          },
          error: () => {
            this.alertService.update(alertId, { type: 'error', title: 'Error actualizando registro', message: 'No se pudo actualizar el archivo en BD', loading: false, dismissible: true, duration: 5000 });
          }
        });
      },
      error: (httpErr) => {
        const backendMsg = httpErr?.error?.message || httpErr?.error?.error || 'No se pudo subir el archivo de reemplazo';
        this.alertService.update(alertId, { type: 'error', title: 'Error subiendo archivo', message: backendMsg, loading: false, dismissible: true, duration: 5000 });
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

  private normalizeTaskFile(rec: any): TaskFile {
    const fileName = rec?.fileName ?? rec?.file_name ?? rec?.filename ?? '';
    const fileUrl = rec?.fileUrl ?? rec?.file_url ?? rec?.filePath ?? rec?.file_path ?? '';
    const mimeType = rec?.mimeType ?? rec?.mime_type ?? rec?.file_type ?? '';
    const fileSize = rec?.fileSize ?? rec?.size ?? rec?.file_size ?? 0;
    const googleDriveId = rec?.googleDriveId ?? rec?.google_drive_id ?? null;
    const isImage = typeof rec?.isImage === 'boolean' ? rec.isImage
      : (typeof rec?.is_image === 'boolean' ? rec.is_image
      : (typeof mimeType === 'string' ? mimeType.startsWith('image/') : false));
    const folderId = rec?.folderId ?? rec?.folder_id ?? undefined;
    const folderName = rec?.folderName ?? rec?.folder_name ?? undefined;
    const storageType = rec?.storageType ?? rec?.storage_type ?? rec?.storage ?? undefined;

    return {
      id: rec?.id ?? 0,
      taskId: rec?.taskId ?? rec?.task_id ?? this.taskId!,
      fileName,
      fileUrl,
      fileSize,
      mimeType,
      storageType,
      googleDriveId: googleDriveId ?? undefined,
      isImage,
      folderId,
      folderName
    } as TaskFile;
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
      category: v.category,
      priority: v.priority,
      assignedUserIds: Array.isArray(v.assignedUserIds) ? v.assignedUserIds : undefined,
      startDate: v.startDate ? (v.startDate as Date).toISOString() as any : undefined,
      dueDate: v.dueDate ? (v.dueDate as Date).toISOString() as any : undefined,
      isRecurring: v.isRecurring || false,
      recurrenceInterval: v.recurrenceInterval || undefined
    } as any;

    // Asegurar estimatedTime en minutos (solo minutos)
    let minutes: number | null = null;
    if (v.estimatedTime) {
      minutes = Number(v.estimatedTime);
    }
    if (minutes && minutes > 0) {
      (updates as any).estimatedTime = minutes;
    }

    // Renombrar carpeta de Drive si el título cambió y hay folderId
    const oldTitle = (this.task?.title || '').toString().trim();
    const newTitle = (v.title || '').toString().trim();
    const driveFolderId = this.existingFiles[0]?.folderId;

    const applyRename = (folderId: string) => {
      this.fileUploadService.renameDriveFolder(folderId, newTitle).subscribe({
        next: () => {
          // Actualizar folder_name en registros existentes de archivos
          this.existingFiles = this.existingFiles.map(f => ({ ...f, folderName: newTitle, folderId }));
          this.existingFiles.forEach(f => {
            this.taskService.updateTaskFile(f.id, { folderName: newTitle, folderId }).subscribe({
              next: (updated: any) => {
                const normalized = this.normalizeTaskFile(updated);
                // Sincronizar por si el backend ajusta valores
                this.existingFiles = this.existingFiles.map(ff => ff.id === f.id ? {
                  ...ff,
                  folderId: normalized.folderId,
                  folderName: normalized.folderName
                } : ff);
              },
              error: () => { /* no bloquear flujo por errores de sync */ }
            });
          });
        },
        error: () => { /* ya está manejado por finalize */ }
      });
    };

    if (newTitle && oldTitle && newTitle !== oldTitle) {
      if (driveFolderId) {
        applyRename(driveFolderId);
      } else {
        // Fallback: buscar carpeta por nombre anterior si no hay archivos registrados
        this.fileUploadService.getDriveFolderByName(oldTitle).subscribe({
          next: (resp) => {
            const fid = resp?.folder?.id;
            if (fid) applyRename(fid);
          },
          error: () => { /* ignorar si no existe carpeta previa */ }
        });
      }
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
        error: (httpErr) => {
          const backendMsg = httpErr?.error?.message || httpErr?.error?.error || httpErr?.message || 'No se pudo subir el archivo';
          this.alertService.error('Error subiendo archivo', backendMsg, { dismissible: true, duration: 5000 });
          this.finalizeUpdate(updates, undefined, progressId);
        }
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
        if (this.dialogRef) {
          this.dialogRef.close(t);
        } else {
          this.router.navigate(['/tasks/list']);
        }
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
    const uploadUrl = `${environment.services.fileUpload}/upload`;
    return this.http.post<any>(uploadUrl, formData).pipe(
      // Si el backend devuelve success=false en 200, lanzar error para flujo uniforme
      map((resp: any) => {
        if (resp && resp.success === false) {
          throw new Error(resp.message || 'Error subiendo archivo');
        }
        return resp;
      })
    );
  }

  close(): void {
    if (this.submitting) return; // Evitar cierre durante procesos
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.router.navigate(['/tasks/list']);
    }
  }
}