import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FinanceService } from '../../../finance/services/finance.service';
import { ExpenseReportBuilder } from '../../../../core/builders/expense-report.builder';
import { ChartConfigBuilder } from '../../../../core/builders/chart-config.builder';

@Component({
  selector: 'app-finance-reports',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <h2>Reportes Financieros</h2>
      <p>Semanal, mensual y anual.</p>
      <div *ngIf="chartConfig as cfg">
        <pre>{{ cfg | json }}</pre>
      </div>
    </section>
  `
})
export class FinanceReportsComponent implements OnInit {
  chartConfig: any;

  constructor(private finance: FinanceService) {}

  ngOnInit(): void {
    const query = new ExpenseReportBuilder('family-123')
      .period('week')
      .build();

    this.finance.getExpenseReport(query).subscribe((report) => {
      const labels = report.labels ?? [];
      const expenses = report.expenses ?? [];
      const income = report.income ?? [];

      this.chartConfig = new ChartConfigBuilder('bar')
        .labels(labels)
        .addDataset({ label: 'Gastos', data: expenses, color: '#F44336' })
        .addDataset({ label: 'Ingresos', data: income, color: '#2196F3' })
        .build();
    });
  }
}