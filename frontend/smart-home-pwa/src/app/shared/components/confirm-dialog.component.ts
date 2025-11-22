import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

@Component({
    selector: 'app-confirm-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
    template: `
    <div class="confirm-dialog">
      <div class="dialog-header" [ngClass]="'type-' + data.type">
        <mat-icon class="dialog-icon">{{ getIcon() }}</mat-icon>
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      
      <mat-dialog-content class="dialog-content">
        <p>{{ data.message }}</p>
      </mat-dialog-content>
      
      <mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-button">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button mat-raised-button [color]="data.type === 'danger' ? 'warn' : 'primary'" 
                (click)="onConfirm()" class="confirm-button">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
    styles: [`
    .confirm-dialog {
      min-width: 400px;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid #e5e7eb;
    }

    .dialog-header.type-danger {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
    }

    .dialog-header.type-warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    }

    .dialog-header.type-info {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
    }

    .dialog-icon {
      font-size: 32px !important;
      width: 32px !important;
      height: 32px !important;
    }

    .type-danger .dialog-icon {
      color: #dc2626;
    }

    .type-warning .dialog-icon {
      color: #f59e0b;
    }

    .type-info .dialog-icon {
      color: #3b82f6;
    }

    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #1f2937;
    }

    .dialog-content {
      padding: 24px !important;
      color: #4b5563;
      font-size: 15px;
      line-height: 1.6;
    }

    .dialog-content p {
      margin: 0;
    }

    .dialog-actions {
      padding: 16px 24px !important;
      border-top: 1px solid #e5e7eb;
      gap: 12px;
      justify-content: flex-end;
    }

    .cancel-button {
      min-width: 100px;
    }

    .confirm-button {
      min-width: 100px;
      font-weight: 500;
    }

    @media (max-width: 500px) {
      .confirm-dialog {
        min-width: 280px;
      }

      .dialog-actions {
        flex-direction: column-reverse;
      }

      .cancel-button,
      .confirm-button {
        width: 100%;
      }
    }
  `]
})
export class ConfirmDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<ConfirmDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
    ) {
        // Set default type if not provided
        if (!this.data.type) {
            this.data.type = 'warning';
        }
    }

    getIcon(): string {
        switch (this.data.type) {
            case 'danger':
                return 'delete_forever';
            case 'warning':
                return 'warning';
            case 'info':
                return 'info';
            default:
                return 'help_outline';
        }
    }

    onConfirm(): void {
        this.dialogRef.close(true);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
