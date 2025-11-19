import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from '../../../finance/services/finance.service';
import { ExpenseReportBuilder } from '../../../../core/builders/expense-report.builder';
import { ChartConfigBuilder } from '../../../../core/builders/chart-config.builder';

@Component({
  selector: 'app-finance-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <h2>Centro de Gestión Financiera</h2>
      <p>Resumen de ingresos, gastos y balance.</p>
      <div *ngIf="chartConfig as cfg">
        <pre>{{ cfg | json }}</pre>
      </div>
    </section>
  `
})
export class FinanceDashboardComponent implements OnInit {
  chartConfig: any;

  constructor(private finance: FinanceService) {}

  ngOnInit(): void {
    const query = new ExpenseReportBuilder('family-123')
      .period('month')
      .build();

    this.finance.getExpenseReport(query).subscribe((report) => {
      const labels = report.labels ?? [];
      const expenses = report.expenses ?? [];
      const income = report.income ?? [];
      const balance = report.balance ?? [];

      this.chartConfig = new ChartConfigBuilder('line')
        .labels(labels)
        .addDataset({ label: 'Gastos', data: expenses, color: '#F44336' })
        .addDataset({ label: 'Ingresos', data: income, color: '#2196F3' })
        .addDataset({ label: 'Balance', data: balance, color: '#4CAF50' })
        .build();
    });
  }
}