import { Component, OnInit, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatAccordion } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

// Imports actualizados para la nueva estructura
import { AuthService } from '../../../../../services/auth.service';
import { TaskService } from '../../../services/task.service';
import { User } from '../../../../../models/user.model';
import { Task, CreateTaskRequest } from '../../../models/task.model';
import { forkJoin, of, switchMap, catchError } from 'rxjs';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';
import { FormValidators } from '../../../../../shared/validators/form-validators';
import { AlertService } from '../../../../../services/alert.service';
import { NotificationService } from '../../../../../services/notification.service';

interface FilePreview {
  file: File;
  url: string;
  type: 'image' | 'document';
  name: string;
  size: string;
}

@Component({
  selector: 'app-task-create',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatIconModule,
    MatCardModule,
    MatExpansionModule,
    MatChipsModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatButtonToggleModule,
    HttpClientModule
  ],
  templateUrl: './task-create.component.html',
  styleUrl: './task-create.component.scss'
})
/**
 * Componente para creación de tareas con dos secciones:
 *  - Datos de la tarea (texto, categoría, adjuntos con vista previa)
 *  - Plazos y asignaciones (fechas, prioridad, recurrencia, asignar uno o varios miembros)
 * Incluye botones de Limpiar y Recargar y usa Signals para estado local.
 */
export class TaskCreateComponent implements OnInit {
  taskForm!: FormGroup;
  familyMembers = signal<User[]>([]);
  filePreviews = signal<FilePreview[]>([]);
  isDragOver = signal(false);
  isSubmitting = signal(false);
  isLoadingMembers = signal(false);
  showAttachments = signal(false);
  @ViewChild(MatAccordion) accordion?: MatAccordion;


  private readonly maxFiles = 5;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    private fb: FormBuilder,
    private taskService: TaskService,
    private alertService: AlertService,
    private authService: AuthService,
    private dialogRef: MatDialogRef<TaskCreateComponent>,
    private http: HttpClient,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    // Bloquear cierre por clic fuera del modal
    this.dialogRef.disableClose = true;
    this.loadFamilyMembers();
    this.taskForm = this.createForm();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      title: ['', [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(100),
        FormValidators.noWhitespaceValidator()
      ]],
      description: ['', [
        Validators.maxLength(500)
      ]],
      category: ['limpieza', Validators.required],
      // Permite uno o varios asignados; con required para al menos uno
      assignedTo: [[], Validators.required],
      priority: ['media', [
        Validators.required,
        FormValidators.priorityValidator()
      ]],
      startDate: [null, [
        FormValidators.futureDateValidator()
      ]],
      dueDate: [null, [
        FormValidators.futureDateValidator()
      ]],
      estimatedTime: ['', [Validators.min(1), Validators.max(480)]], // minutos
      estimatedTimeDuration: [''], // HH:MM para el selector de tiempo
      reward: [''],
      isRecurring: [false],
      recurrenceInterval: [''],
      files: [[]]
    }, {
      validators: [
        FormValidators.dateRangeValidator('startDate', 'dueDate'),
        FormValidators.conditionalRequired('isRecurring', 'recurrenceInterval')
      ]
    });
  }

  private loadFamilyMembers(): void {
    this.isLoadingMembers.set(true);
    this.authService.getFamilyMembers().subscribe({
      next: (members: any) => {
        this.familyMembers.set(members);
        this.isLoadingMembers.set(false);
      },
      error: (error: any) => {
        console.error('Error loading family members:', error);
        this.alertService.error('Error al cargar miembros', 'No se pudieron obtener los miembros de la familia.', { duration: 4000, dismissible: true });
        this.isLoadingMembers.set(false);
      }
    });
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
    
    const files = event.dataTransfer?.files;
    if (files) {
      this.handleFiles(Array.from(files));
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  private handleFiles(files: File[]): void {
    const currentPreviews = this.filePreviews();
    const totalFiles = currentPreviews.length + files.length;

    if (totalFiles > this.maxFiles) {
      this.alertService.warning('Límite de archivos', `Máximo ${this.maxFiles} archivos permitidos.`, { duration: 3000, dismissible: true });
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      // Validar tamaño
      if (file.size > this.maxFileSize) {
        errors.push(`${file.name}: Archivo muy grande (máx. 10MB)`);
        return;
      }

      // Validar tipo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 
                           'application/pdf', 'application/msword', 
                           'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                           'text/plain'];
      
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Tipo de archivo no permitido`);
        return;
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      this.alertService.warning('Archivos inválidos', errors.map(e => `• ${e}`).join('\n'), { duration: 5000, dismissible: true });
    }

    if (validFiles.length > 0) {
      this.createFilePreviews(validFiles);
    }
  }

  private createFilePreviews(files: File[]): void {
    const currentPreviews = this.filePreviews();
    const newPreviews: FilePreview[] = [];

    files.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const preview: FilePreview = {
        file,
        url: '',
        type: isImage ? 'image' : 'document',
        name: file.name,
        size: this.formatFileSize(file.size)
      };

      if (isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
          preview.url = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      newPreviews.push(preview);
    });

    this.filePreviews.set([...currentPreviews, ...newPreviews]);
    this.updateFormFiles();
  }

  removeFile(preview: FilePreview): void {
    const currentPreviews = this.filePreviews();
    const updatedPreviews = currentPreviews.filter(p => p !== preview);
    this.filePreviews.set(updatedPreviews);
    this.updateFormFiles();

    // Limpiar URL del objeto si es una imagen
    if (preview.url && preview.type === 'image') {
      URL.revokeObjectURL(preview.url);
    }
  }

  private updateFormFiles(): void {
    const files = this.filePreviews().map(p => p.file);
    this.taskForm.patchValue({ files });
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getErrorMessage(field: string): string {
    const control = this.taskForm.get(field);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(field)} es requerido`;
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength']?.requiredLength;
      return `${this.getFieldDisplayName(field)} debe tener al menos ${requiredLength} caracteres`;
    }
    if (control?.hasError('min')) {
      const min = control.errors?.['min']?.min;
      return `El valor mínimo es ${min}`;
    }
    if (control?.hasError('max')) {
      const max = control.errors?.['max']?.max;
      return `El valor máximo es ${max}`;
    }
    if (control?.hasError('futureDate')) {
      return 'La fecha debe ser futura';
    }
    return '';
  }

  private getFieldDisplayName(field: string): string {
    const fieldNames: { [key: string]: string } = {
      'title': 'El título',
      'description': 'La descripción',
      'category': 'La categoría',
      'assignedTo': 'El usuario asignado',
      'priority': 'La prioridad',
      'startDate': 'La fecha de inicio',
      'dueDate': 'La fecha límite',
      'estimatedTime': 'El tiempo estimado',
      'estimatedTimeDuration': 'El tiempo estimado',
      'reward': 'La recompensa',
      'recurrenceInterval': 'El intervalo de recurrencia'
    };
    return fieldNames[field] || field;
  }

  onDurationChange(): void {
    const value = this.taskForm.get('estimatedTimeDuration')?.value as string;
    const minutes = this.parseDurationToMinutes(value);
    if (minutes != null) {
      this.taskForm.get('estimatedTime')?.setValue(minutes);
      this.taskForm.get('estimatedTime')?.markAsDirty();
    }
  }

  private parseDurationToMinutes(value: string | null): number | null {
    if (!value) return null;
    const [hh, mm] = value.split(':').map(v => parseInt(v, 10));
    if (isNaN(hh) || isNaN(mm)) return null;
    return hh * 60 + mm;
  }

  setPresetDuration(minutes: number): void {
    this.taskForm.get('estimatedTime')?.setValue(minutes);
    this.taskForm.get('estimatedTime')?.markAsDirty();
    const hhmm = this.formatMinutesToHHMM(minutes);
    this.taskForm.get('estimatedTimeDuration')?.setValue(hhmm);
  }

  private formatMinutesToHHMM(minutes: number): string {
    const hh = Math.floor(minutes / 60).toString().padStart(2, '0');
    const mm = (minutes % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
  }

  onSubmit(): void {
    if (this.taskForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      const progressId = this.alertService.info('Creando tarea', 'Subiendo archivos y guardando...', { loading: true, dismissible: false, duration: 0 });
      
      const formValue = this.taskForm.value as any;
      const currentUser = this.authService.getCurrentUser();
      
      if (!currentUser) {
        this.alertService.error('Error de autenticación', 'Usuario no autenticado', { dismissible: true, duration: 4000 });
        this.isSubmitting.set(false);
        return;
      }

      const selectedAssignees: number[] = Array.isArray(formValue.assignedTo)
        ? formValue.assignedTo
        : (formValue.assignedTo != null ? [formValue.assignedTo] : []);

      // Asegurar que estimatedTime esté en minutos si se usó HH:MM
      if (!formValue.estimatedTime && formValue.estimatedTimeDuration) {
        formValue.estimatedTime = this.parseDurationToMinutes(formValue.estimatedTimeDuration) || '';
      }

      this.uploadSelectedFiles()
        .pipe(
          switchMap((uploadResp: any) => {
            const fileUrl: string | null = uploadResp?.fileUrl || (Array.isArray(uploadResp?.uploaded) ? uploadResp.uploaded[0]?.fileUrl : null);
            const primaryAssignee = selectedAssignees.length > 0 ? selectedAssignees[0] : currentUser.id;
            const payload: CreateTaskRequest = {
              title: formValue.title,
              description: formValue.description,
              category: formValue.category,
              assignedUserId: primaryAssignee, // compatibilidad backend
              assignedUserIds: selectedAssignees.length > 0 ? selectedAssignees : undefined,
              createdById: currentUser.id,
              priority: formValue.priority,
              dueDate: formValue.dueDate,
              startDate: formValue.startDate,
              isRecurring: formValue.isRecurring,
              recurrenceInterval: formValue.recurrenceInterval,
              estimatedTime: formValue.estimatedTime,
              reward: formValue.reward,
              fileUrl: fileUrl || undefined
            };

            return this.taskService.createTask(payload).pipe(
              switchMap((createdTask: Task) => {
                const uploaded = Array.isArray(uploadResp?.uploaded) ? uploadResp.uploaded : [];
                if (uploaded.length) {
                  return this.taskService.registerTaskFiles(createdTask.id, uploaded).pipe(
                    // devolver la tarea creada tras registrar archivos
                    switchMap(() => of(createdTask))
                  );
                }
                return of(createdTask);
              })
            );
          }),
          catchError((error: any) => {
            console.error('Error subiendo archivo:', error);
            this.alertService.update(progressId, { type: 'error', loading: false, title: 'Error subiendo archivo', message: 'No se pudo subir el archivo. La tarea no se creó.', duration: 5000 });
            this.isSubmitting.set(false);
            throw error;
          })
        )
        .subscribe({
          next: (createdTask) => {
            console.log('Task created successfully:', createdTask);
            this.alertService.update(progressId, { type: 'success', loading: false, title: 'Tarea creada', message: 'La tarea fue creada exitosamente', duration: 4000 });
            // Cerrar todas las secciones del accordion al guardar
            this.accordion?.closeAll();
            this.isSubmitting.set(false);


            this.dialogRef.close(createdTask);
          },
          error: (error) => {
            console.error('Error creating tasks:', error);
            this.alertService.update(progressId, { type: 'error', loading: false, title: 'Error creando tarea', message: 'No se pudo crear la tarea', duration: 5000 });
            this.isSubmitting.set(false);
          }
        });
    } else {
      this.markFormGroupTouched();
      this.alertService.warning('Formulario inválido', this.getInvalidSummary(), { dismissible: true, duration: 4000 });
    }
  }

  private uploadSelectedFiles() {
    const previews = this.filePreviews();
    if (!previews.length) {
      return of(null);
    }
    const formData = new FormData();
    // Enviar todos los archivos seleccionados (el backend acepta múltiples 'file')
    previews.forEach(p => formData.append('file', p.file));
    // Enviar el título para que la carpeta se nombre correctamente
    const titleRaw = (this.taskForm.get('title')?.value || '').toString().trim();
    const title = titleRaw || 'tarea';
    // Incluimos ambos campos por compatibilidad con el backend y evitar "sin título"
    formData.append('taskTitle', title);
    formData.append('title', title);

    const uploadUrl = `${environment.services.fileUpload}/upload`;
    return this.http.post<any>(uploadUrl, formData);
  }

  onCancel(): void {
    if (this.isSubmitting()) return; // Evitar cierre durante procesos
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.taskForm.controls).forEach(key => {
      const control = this.taskForm.get(key);
      control?.markAsTouched();
    });
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
  
  // Miembros seleccionados para mostrar al costado
  getSelectedMembers(): User[] {
    const selected = this.taskForm.get('assignedTo')?.value as number[] | number | null;
    const ids = Array.isArray(selected) ? selected : (selected != null ? [selected] : []);
    const members = this.familyMembers();
    return members.filter(m => ids.includes(m.id));
  }

  onClear(): void {
    this.taskForm.reset({
      title: '',
      description: '',
      category: 'limpieza',
      assignedTo: [],
      priority: 'media',
      startDate: null,
      dueDate: null,
      estimatedTime: '',
      estimatedTimeDuration: '',
      reward: '',
      isRecurring: false,
      recurrenceInterval: '',
      files: []
    });
    this.filePreviews.set([]);
    this.isDragOver.set(false);
  }

  onReload(): void {
    this.loadFamilyMembers();
    this.alertService.info('Miembros recargados', undefined, { duration: 2000 });
  }
}