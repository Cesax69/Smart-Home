import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FinanceService } from '../../../services/finance.service';
import { FinanceReportResponse } from '../../../models/finance.model';
import { normalizeReport, ChartConfigBuilder, ChartDatasetInput } from '../chart-config.builder';
import { CatalogMaps } from '../../../catalogs/catalogs';
import { BaseChartDirective } from 'ng2-charts';
import { RouterLink } from '@angular/router';
import { ChartConfiguration, Chart as ChartJS, registerables } from 'chart.js';

// Registrar controladores, escalas y elementos requeridos por Chart.js
ChartJS.register(...registerables);

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatToolbarModule, MatFormFieldModule, MatSelectModule, MatCardModule, MatProgressSpinnerModule, MatButtonModule, BaseChartDirective, RouterLink],
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.scss']
})
export class DashboardAnalyticsComponent implements OnInit {
  loading = signal<boolean>(false);
  loadingDistribution = signal<boolean>(false);
  currency = signal<string>('USD');
  form!: FormGroup;

  lineChartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  lineChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false };

  barChartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  barChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false };

  donutChartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  donutChartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false };

  constructor(private fb: FormBuilder, private finance: FinanceService) {
    this.form = this.fb.group({
      dataSource: ['finance'],
      view: ['overview'],
      period: ['month'],
      currency: ['USD']
    });
  }

  ngOnInit(): void {
    this.apply();
    this.form.valueChanges.subscribe(() => this.apply());
  }

  private apply(): void {
    const { dataSource, view, period, currency } = this.form.getRawValue();
    this.currency.set(currency);
    if (dataSource !== 'finance') {
      return;
    }
    if (view === 'overview') this.loadFinanceOverview(period, currency);
    if (view === 'distribution') {
      this.loadFinanceOverview(period, currency);
      this.loadFinanceDistribution(period, currency);
    }
  }

  private localizeLabel(label?: string): string {
    const map: Record<string, string> = {
      'expenses': 'Gastos', 'expense': 'Gastos', 'gastos': 'Gastos',
      'incomes': 'Ingresos', 'income': 'Ingresos', 'ingresos': 'Ingresos',
      'balance': 'Balance'
    };
    if (!label) return '';
    const key = label.toLowerCase();
    return map[key] || label;
  }

  private loadFinanceOverview(period: string, currency: string): void {
    this.loading.set(true);
    this.finance.getReport({ period: period as any, currency: currency as any }).subscribe({
      next: (res: FinanceReportResponse | any) => {
        const normalized = normalizeReport(res);
        const labels = (normalized.labels || []).map(l => CatalogMaps.expenseCategoriesMap[String(l)] || String(l));
        const exp = normalized.datasets['expenses'];
        const inc = normalized.datasets['incomes'];
        const bal = normalized.datasets['balance'];

        const lineBuilder = ChartConfigBuilder.fromParams({
          type: 'line',
          labels,
          datasets: [
            ...(exp ? [{ label: this.localizeLabel(exp.label), data: exp.data, color: exp.color || '#e57373' } as ChartDatasetInput] : []),
            ...(inc ? [{ label: this.localizeLabel(inc.label), data: inc.data, color: inc.color || '#64b5f6' } as ChartDatasetInput] : [])
          ],
          fill: true,
          stacked: false,
          showLegend: true,
          title: 'Gastos e Ingresos'
        }).build();
        this.lineChartData = lineBuilder.data;
        this.lineChartOptions = lineBuilder.options;

        const barBuilder = ChartConfigBuilder.fromParams({
          type: 'bar',
          labels,
          datasets: [
            ...(bal ? [{ label: this.localizeLabel(bal.label), data: bal.data, color: bal.color || '#81c784' } as ChartDatasetInput] : [])
          ],
          stacked: false,
          showLegend: true,
          title: 'Balance'
        }).build();
        this.barChartData = barBuilder.data;
        this.barChartOptions = barBuilder.options;

        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  private loadFinanceDistribution(period: string, currency: string): void {
    this.loadingDistribution.set(true);
    this.finance.getReport({ period: period as any, currency: currency as any, groupBy: 'category' as any }).subscribe({
      next: (res: FinanceReportResponse | any) => {
        const normalized = normalizeReport(res);
        const labels = normalized.labels;
        const exp = normalized.datasets['expenses'];

        const pieBuilder = ChartConfigBuilder.fromParams({
          type: 'doughnut',
          labels,
          datasets: [
            ...(exp ? [{ label: this.localizeLabel(exp.label), data: exp.data, color: exp.color || '#e57373' } as ChartDatasetInput] : [])
          ],
          showLegend: true,
          title: 'Distribución por categoría (Gastos)'
        }).build();

        this.donutChartData = pieBuilder.data;
        this.donutChartOptions = pieBuilder.options;
        this.loadingDistribution.set(false);
      },
      error: () => this.loadingDistribution.set(false)
    });
  }
}