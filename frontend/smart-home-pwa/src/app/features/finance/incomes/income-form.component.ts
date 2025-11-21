import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router, ActivatedRoute } from '@angular/router';
import { FinanceService } from '../../../services/finance.service';
import { CurrencyCode, Income } from '../../../models/finance.model';
import { INCOME_SOURCES, HOUSEHOLD_MEMBERS } from '../../../catalogs/catalogs';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Inject } from '@angular/core';

@Component({
  selector: 'app-income-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule
  ],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>{{ isEdit() ? 'Editar ingreso' : 'Nuevo ingreso' }}</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="form" class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Fecha</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="date">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Monto</mat-label>
            <input matInput type="number" formControlName="amount">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Moneda</mat-label>
            <mat-select formControlName="currency">
              <mat-option *ngFor="let c of currencies" [value]="c">{{ c }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Fuente</mat-label>
            <mat-select formControlName="sourceId">
              <mat-option [value]="">(Sin fuente)</mat-option>
              <mat-option *ngFor="let s of incomeSources" [value]="s.id">{{ s.name }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Miembro</mat-label>
            <mat-select formControlName="memberId">
              <mat-option [value]="">(Sin miembro)</mat-option>
              <mat-option *ngFor="let m of members" [value]="m.id">{{ m.name }}</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="notes">
            <mat-label>Notas</mat-label>
            <textarea matInput rows="3" formControlName="notes"></textarea>
          </mat-form-field>

          <div class="actions">
            <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
              <mat-icon>save</mat-icon>
              Guardar
            </button>
            <button mat-button (click)="back()">Cancelar</button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px,1fr)); gap: 12px; }
    .notes { grid-column: 1 / -1; }
    .actions { grid-column: 1 / -1; display: flex; gap: 12px; }
  `]
})
export class IncomeFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private finance = inject(FinanceService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialogRef = inject<MatDialogRef<IncomeFormComponent> | null>(MatDialogRef, { optional: true });
  constructor(@Inject(MAT_DIALOG_DATA) public data: { id?: string } | null) {}

  currencies: CurrencyCode[] = ['USD', 'EUR', 'PEN', 'MXN', 'COP', 'CLP'];
  incomeSources = INCOME_SOURCES;
  members = HOUSEHOLD_MEMBERS;

  form: FormGroup = this.fb.group({
    date: [new Date(), Validators.required],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    currency: ['USD', Validators.required],
    sourceId: [''],
    memberId: [''],
    notes: ['']
  });

  isEdit = signal<boolean>(false);
  saving = signal<boolean>(false);
  id: string | null = null;

  ngOnInit(): void {
    // Detectar id por ruta o por datos del diálogo
    this.id = (this.data && this.data.id) ? this.data.id : this.route.snapshot.paramMap.get('id');
    if (this.id) {
      this.isEdit.set(true);
      this.finance.getIncome(this.id).subscribe({
        next: (res) => {
          const i: Income = res.data;
          this.form.patchValue({
            date: new Date(i.date),
            amount: i.amount,
            currency: i.currency,
            // Backend puede devolver 'source' (string). Mapear a sourceId si aplica.
            sourceId: i.sourceId ?? (i as any).source ?? '',
            memberId: i.memberId || '',
            notes: i.notes || ''
          });
        }
      });
    }
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const payload = {
      date: new Date(this.form.value.date).toISOString().slice(0, 10),
      amount: Number(this.form.value.amount),
      currency: this.form.value.currency,
      sourceId: this.form.value.sourceId || undefined,
      memberId: this.form.value.memberId || undefined,
      notes: this.form.value.notes || undefined
    };

    const obs = this.isEdit() && this.id
      ? this.finance.updateIncome(this.id, payload)
      : this.finance.createIncome(payload as any);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        // Cerrar diálogo si está abierto; si no, navegar
        if (this.dialogRef) {
          this.dialogRef.close(true);
        } else {
          this.router.navigate(['/finance/incomes']);
        }
      },
      error: () => this.saving.set(false)
    });
  }

  back(): void {
    if (this.dialogRef) {
      this.dialogRef.close(false);
    } else {
      this.router.navigate(['/finance/incomes']);
    }
  }
}