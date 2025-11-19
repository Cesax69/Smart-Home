import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FinanceService } from '../../../finance/services/finance.service';
import { ChartConfigBuilder } from '../../../../core/builders/chart-config.builder';

@Component({
  selector: 'app-finance-income',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section>
      <h2>Gestión de Ingresos</h2>
      <div class="form-card">
        <h3>Registrar nuevo ingreso</h3>
        <form [formGroup]="incomeForm" (ngSubmit)="createIncome()">
          <div class="form-grid">
            <label>
              Fuente
              <input type="text" formControlName="source" placeholder="Ej: Sueldo" />
            </label>
            <label>
              Monto
              <input type="number" formControlName="amount" step="0.01" placeholder="0.00" />
            </label>
            <label>
              Moneda
              <input type="text" formControlName="currency" placeholder="USD" />
            </label>
            <label>
              Fecha
              <input type="date" formControlName="occurredAt" />
            </label>
            <label class="notes">
              Notas
              <textarea formControlName="notes" rows="2" placeholder="Opcional"></textarea>
            </label>
          </div>
          <button type="submit" [disabled]="incomeForm.invalid">Guardar ingreso</button>
        </form>
        <div class="result" *ngIf="lastCreatedIncome as e">
          <small>Ingreso creado: {{ e | json }}</small>
        </div>
      </div>

      <hr />

      <button (click)="load()">Cargar ingresos</button>
      <div *ngIf="chartConfig as cfg">
        <pre>{{ cfg | json }}</pre>
      </div>
    </section>
  `
})
export class FinanceIncomeComponent implements OnInit {
  chartConfig: any;
  incomeForm!: FormGroup;
  lastCreatedIncome: any = null;

  constructor(private finance: FinanceService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.incomeForm = this.fb.group({
      familyId: ['family-123', [Validators.required]],
      source: ['', [Validators.required]],
      amount: [null as any, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', [Validators.required]],
      occurredAt: [new Date().toISOString().slice(0,10), [Validators.required]],
      notes: ['']
    });
  }

  load() {
    this.finance.getIncome({ familyId: 'family-123' }).subscribe((res) => {
      const items = (res?.data ?? res ?? []) as Array<any>;
      const labels = items.map(i => i.source ?? '');
      const amounts = items.map(i => Number(i.amount ?? 0));

      this.chartConfig = new ChartConfigBuilder('pie')
        .labels(labels)
        .addDataset({ label: 'Ingresos', data: amounts, color: '#2196F3' })
        .build();
    });
  }

  createIncome() {
    if (this.incomeForm.invalid) return;
    const payload = {
      familyId: this.incomeForm.value.familyId!,
      source: this.incomeForm.value.source!,
      amount: Number(this.incomeForm.value.amount!),
      currency: this.incomeForm.value.currency!,
      occurredAt: this.incomeForm.value.occurredAt!,
      notes: this.incomeForm.value.notes || undefined
    };
    this.finance.createIncome(payload).subscribe((res) => {
      this.lastCreatedIncome = res?.data ?? res;
      this.incomeForm.reset({
        familyId: 'family-123',
        source: '',
        amount: null,
        currency: 'USD',
        occurredAt: new Date().toISOString().slice(0,10),
        notes: ''
      });
      // refrescar gráfico
      this.load();
    });
  }
}