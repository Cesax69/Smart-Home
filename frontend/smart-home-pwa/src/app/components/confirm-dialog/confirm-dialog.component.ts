import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  icon?: string;
  color?: 'primary' | 'accent' | 'warn';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="confirm-dialog">
      <div class="dialog-header">
        @if (data.icon) {
          <mat-icon [class]="'icon-' + (data.color || 'primary')">{{ data.icon }}</mat-icon>
        }
        <h2 mat-dialog-title>{{ data.title }}</h2>
      </div>
      
      <div mat-dialog-content class="dialog-content">
        <p>{{ data.message }}</p>
      </div>
      
      <div mat-dialog-actions class="dialog-actions">
        <button mat-button (click)="onCancel()" class="cancel-button">
          {{ data.cancelText || 'Cancelar' }}
        </button>
        <button mat-raised-button 
                [color]="data.color || 'warn'" 
                (click)="onConfirm()" 
                class="confirm-button">
          {{ data.confirmText || 'Confirmar' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      min-width: 360px;
      max-width: 600px;
      width: 100%;
      box-sizing: border-box;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }

    .dialog-header mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .icon-primary {
      color: #1976d2;
    }

    .icon-accent {
      color: #ff4081;
    }

    .icon-warn {
      color: #f44336;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 500;
    }

    .dialog-content {
      margin-bottom: 24px;
      max-width: 100%;
      max-height: 40vh;
      overflow: auto;
    }

    .dialog-content p {
      margin: 0;
      color: rgba(0, 0, 0, 0.8);
      line-height: 1.5;
      white-space: pre-wrap;
      word-break: break-word;
    }

    .dialog-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: flex-end;
      gap: 8px;
      margin: 0;
      padding: 0;
    }

    .cancel-button {
      color: rgba(0, 0, 0, 0.6);
    }

    .confirm-button {
      min-width: 110px;
    }

    .dialog-actions button {
      flex: 1 1 auto;
    }

    @media (max-width: 420px) {
      .dialog-actions {
        flex-direction: column;
        align-items: stretch;
      }

      .dialog-actions button {
        width: 100%;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}