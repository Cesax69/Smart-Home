import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { FinanceService } from '../../../finance/services/finance.service';
import { ChartConfigBuilder } from '../../../../core/builders/chart-config.builder';

@Component({
  selector: 'app-finance-expenses',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section>
      <h2>Gestión de Gastos</h2>
      <div class="form-card">
        <h3>Crear nuevo gasto</h3>
        <form [formGroup]="expenseForm" (ngSubmit)="createExpense()">
          <div class="form-grid">
            <label>
              Categoría
              <input type="text" formControlName="category" placeholder="Ej: Comida" />
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
          <button type="submit" [disabled]="expenseForm.invalid">Guardar gasto</button>
        </form>
        <div class="result" *ngIf="lastCreatedExpense as e">
          <small>Gasto creado: {{ e | json }}</small>
        </div>
      </div>

      <hr />

      <button (click)="load()">Cargar gastos</button>
      <div *ngIf="chartConfig as cfg">
        <pre>{{ cfg | json }}</pre>
      </div>
    </section>
  `
})
export class FinanceExpensesComponent implements OnInit {
  chartConfig: any;
  expenseForm!: FormGroup;
  lastCreatedExpense: any = null;

  constructor(private finance: FinanceService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.expenseForm = this.fb.group({
      familyId: ['family-123', [Validators.required]],
      category: ['', [Validators.required]],
      amount: [null as any, [Validators.required, Validators.min(0.01)]],
      currency: ['USD', [Validators.required]],
      occurredAt: [new Date().toISOString().slice(0,10), [Validators.required]],
      notes: ['']
    });
  }

  load() {
    this.finance.getExpenses({ familyId: 'family-123' }).subscribe((res) => {
      const items = (res?.data ?? res ?? []) as Array<any>;
      const labels = items.map(i => i.categoryName ?? i.category ?? '');
      const amounts = items.map(i => Number(i.amount ?? 0));

      this.chartConfig = new ChartConfigBuilder('bar')
        .labels(labels)
        .addDataset({ label: 'Gastos', data: amounts, color: '#F44336' })
        .build();
    });
  }

  createExpense() {
    if (this.expenseForm.invalid) return;
    const payload = {
      familyId: this.expenseForm.value.familyId!,
      category: this.expenseForm.value.category!,
      amount: Number(this.expenseForm.value.amount!),
      currency: this.expenseForm.value.currency!,
      occurredAt: this.expenseForm.value.occurredAt!,
      notes: this.expenseForm.value.notes || undefined
    };
    this.finance.createExpense(payload).subscribe((res) => {
      this.lastCreatedExpense = res?.data ?? res;
      this.expenseForm.reset({
        familyId: 'family-123',
        category: '',
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