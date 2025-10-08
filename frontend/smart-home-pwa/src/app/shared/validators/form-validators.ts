import { AbstractControl, ValidationErrors, ValidatorFn, FormGroup } from '@angular/forms';

/**
 * Validadores personalizados reutilizables para todo el sistema Smart Home
 */
export class FormValidators {

  /**
   * Valida que la fecha sea futura
   */
  static futureDateValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // No validar si está vacío (usar required por separado)
      }
      
      const selectedDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
      
      if (selectedDate < today) {
        return { futureDate: { value: control.value } };
      }
      
      return null;
    };
  }

  /**
   * Valida que la fecha de fin sea posterior a la fecha de inicio
   */
  static dateRangeValidator(startDateControlName: string, endDateControlName: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const startDate = formGroup.get(startDateControlName)?.value;
      const endDate = formGroup.get(endDateControlName)?.value;

      if (!startDate || !endDate) {
        return null;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (end <= start) {
        return { dateRange: { startDate, endDate } };
      }

      return null;
    };
  }

  /**
   * Valida el tamaño máximo de archivo en MB
   */
  static fileSizeValidator(maxSizeMB: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const files = control.value as FileList;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      for (let i = 0; i < files.length; i++) {
        if (files[i].size > maxSizeBytes) {
          return { 
            fileSize: { 
              actualSize: files[i].size, 
              maxSize: maxSizeBytes,
              fileName: files[i].name 
            } 
          };
        }
      }

      return null;
    };
  }

  /**
   * Valida los tipos de archivo permitidos
   */
  static fileTypeValidator(allowedTypes: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const files = control.value as FileList;
      const invalidFiles: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const fileType = files[i].type;
        const fileExtension = files[i].name.split('.').pop()?.toLowerCase();
        
        const isValidType = allowedTypes.some(type => {
          if (type.includes('/')) {
            // MIME type (ej: image/jpeg)
            return fileType === type;
          } else {
            // Extensión (ej: jpg, png)
            return fileExtension === type.toLowerCase();
          }
        });

        if (!isValidType) {
          invalidFiles.push(files[i].name);
        }
      }

      if (invalidFiles.length > 0) {
        return { 
          fileType: { 
            invalidFiles, 
            allowedTypes 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Valida el número máximo de archivos
   */
  static maxFilesValidator(maxFiles: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const files = control.value as FileList;
      
      if (files.length > maxFiles) {
        return { 
          maxFiles: { 
            actualCount: files.length, 
            maxCount: maxFiles 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Valida que el texto no contenga solo espacios en blanco
   */
  static noWhitespaceValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const isWhitespace = (control.value || '').trim().length === 0;
      
      if (isWhitespace) {
        return { whitespace: true };
      }

      return null;
    };
  }

  /**
   * Valida que la prioridad sea válida
   */
  static priorityValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const validPriorities = ['low', 'medium', 'high'];
      
      if (!validPriorities.includes(control.value)) {
        return { 
          priority: { 
            value: control.value, 
            validValues: validPriorities 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Valida que el intervalo de recurrencia sea válido
   */
  static recurrenceIntervalValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null;
      }

      const interval = parseInt(control.value);
      
      if (isNaN(interval) || interval < 1 || interval > 365) {
        return { 
          recurrenceInterval: { 
            value: control.value, 
            min: 1, 
            max: 365 
          } 
        };
      }

      return null;
    };
  }

  /**
   * Valida que un campo sea requerido condicionalmente basado en otro campo
   */
  static conditionalRequired(dependentField: string, targetField: string): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      if (!(formGroup instanceof FormGroup)) return null;
      
      const dependentControl = formGroup.get(dependentField);
      const targetControl = formGroup.get(targetField);
      
      if (!dependentControl || !targetControl) return null;
      
      if (dependentControl.value && !targetControl.value) {
        targetControl.setErrors({ conditionalRequired: true });
        return { conditionalRequired: true };
      }
      
      // Limpiar error si ya no es necesario
      if (!dependentControl.value && targetControl.hasError('conditionalRequired')) {
        const errors = { ...targetControl.errors };
        delete errors['conditionalRequired'];
        targetControl.setErrors(Object.keys(errors).length ? errors : null);
      }
      
      return null;
    };
  }

  /**
   * Obtiene el mensaje de error personalizado para mostrar al usuario
   */
  static getErrorMessage(control: AbstractControl, fieldName: string = 'Campo'): string {
    if (!control.errors) {
      return '';
    }

    const errors = control.errors;

    // Errores básicos
    if (errors['required']) {
      return `${fieldName} es requerido`;
    }

    if (errors['minlength']) {
      return `${fieldName} debe tener al menos ${errors['minlength'].requiredLength} caracteres`;
    }

    if (errors['maxlength']) {
      return `${fieldName} no puede tener más de ${errors['maxlength'].requiredLength} caracteres`;
    }

    if (errors['email']) {
      return `Ingresa un email válido`;
    }

    if (errors['pattern']) {
      return `${fieldName} tiene un formato inválido`;
    }

    // Errores personalizados
    if (errors['futureDate']) {
      return `La fecha debe ser futura`;
    }

    if (errors['dateRange']) {
      return `La fecha de fin debe ser posterior a la fecha de inicio`;
    }

    if (errors['fileSize']) {
      const sizeMB = Math.round(errors['fileSize'].maxSize / (1024 * 1024));
      return `El archivo "${errors['fileSize'].fileName}" excede el tamaño máximo de ${sizeMB}MB`;
    }

    if (errors['fileType']) {
      return `Tipos de archivo permitidos: ${errors['fileType'].allowedTypes.join(', ')}`;
    }

    if (errors['maxFiles']) {
      return `Máximo ${errors['maxFiles'].maxCount} archivos permitidos`;
    }

    if (errors['whitespace']) {
      return `${fieldName} no puede estar vacío o contener solo espacios`;
    }

    if (errors['priority']) {
      return `Prioridad inválida. Valores permitidos: ${errors['priority'].validValues.join(', ')}`;
    }

    if (errors['recurrenceInterval']) {
      return `El intervalo debe ser entre ${errors['recurrenceInterval'].min} y ${errors['recurrenceInterval'].max}`;
    }

    if (errors['conditionalRequired']) {
      return `${fieldName} es requerido cuando la tarea es recurrente`;
    }

    if (errors['fileSize']) {
      const maxSizeMB = Math.round(errors['fileSize'].maxSize / (1024 * 1024));
      return `El archivo excede el tamaño máximo de ${maxSizeMB}MB`;
    }

    if (errors['fileType']) {
      return 'Tipo de archivo no permitido';
    }

    if (errors['maxFiles']) {
      return `Máximo ${errors['maxFiles'].maxCount} archivos permitidos`;
    }

    return `${fieldName} es inválido`;
  }
}

/**
 * Configuraciones predefinidas para validaciones comunes
 */
export const ValidationConfig = {
  // Archivos de imagen
  IMAGE_FILES: {
    types: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSizeMB: 5,
    maxFiles: 10
  },

  // Archivos de documento
  DOCUMENT_FILES: {
    types: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSizeMB: 10,
    maxFiles: 5
  },

  // Todos los archivos permitidos
  ALL_FILES: {
    types: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain', 'application/zip'
    ],
    maxSizeMB: 10,
    maxFiles: 15
  },

  // Texto básico
  TEXT: {
    minLength: 3,
    maxLength: 255
  },

  // Descripción larga
  DESCRIPTION: {
    minLength: 0,
    maxLength: 1000
  }
};