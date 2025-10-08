import { Component, OnInit, signal } from '@angular/core';
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
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';

// Imports actualizados para la nueva estructura
import { AuthService } from '../../../../../services/auth.service';
import { User } from '../../../../../models/user.model';
import { FormValidators } from '../../../../../shared/validators/form-validators';

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
    MatChipsModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule
  ],
  templateUrl: './task-create.component.html',
  styleUrl: './task-create.component.scss'
})
export class TaskCreateComponent implements OnInit {
  taskForm: FormGroup;
  familyMembers = signal<User[]>([]);
  filePreviews = signal<FilePreview[]>([]);
  isDragOver = signal(false);
  isSubmitting = signal(false);
  isLoadingMembers = signal(false);

  private readonly maxFiles = 5;
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<TaskCreateComponent>
  ) {
    this.taskForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadFamilyMembers();
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
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(500)
      ]],
      assignedTo: ['', Validators.required],
      priority: ['medium', [
        Validators.required,
        FormValidators.priorityValidator()
      ]],
      startDate: ['', [
        Validators.required,
        FormValidators.futureDateValidator()
      ]],
      dueDate: ['', [
        Validators.required,
        FormValidators.futureDateValidator()
      ]],
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
        this.snackBar.open('Error al cargar los miembros de la familia', 'Cerrar', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
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
      this.snackBar.open(`Máximo ${this.maxFiles} archivos permitidos`, 'Cerrar', {
        duration: 3000,
        panelClass: ['error-snackbar']
      });
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
      this.snackBar.open(errors.join(', '), 'Cerrar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
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

  getErrorMessage(fieldName: string): string {
    const control = this.taskForm.get(fieldName);
    if (!control || !control.errors) return '';

    return FormValidators.getErrorMessage(control, fieldName);
  }

  onSubmit(): void {
    if (this.taskForm.valid && !this.isSubmitting()) {
      this.isSubmitting.set(true);
      
      // Simular envío de datos
      setTimeout(() => {
        console.log('Task data:', this.taskForm.value);
        console.log('Files:', this.filePreviews().map(p => p.file));
        
        this.snackBar.open('Tarea creada exitosamente', 'Cerrar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        this.isSubmitting.set(false);
        this.dialogRef.close(this.taskForm.value);
      }, 2000);
    } else {
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private markFormGroupTouched(): void {
    Object.keys(this.taskForm.controls).forEach(key => {
      const control = this.taskForm.get(key);
      control?.markAsTouched();
    });
  }
}