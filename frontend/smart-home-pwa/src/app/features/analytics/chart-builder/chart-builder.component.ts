import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, registerables } from 'chart.js';

// Registrar controladores, escalas y elementos requeridos por Chart.js
ChartJS.register(...registerables);

import { FinanceService } from '../../../services/finance.service';
import { normalizeReport, ChartConfigBuilder, ChartType, ChartDatasetInput } from '../chart-config.builder';

@Component({
  selector: 'app-analytics-chart-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    BaseChartDirective
  ],
  templateUrl: './chart-builder.component.html',
  styleUrls: ['./chart-builder.component.scss']
})
export class AnalyticsChartBuilderComponent implements OnInit {
  loading = signal<boolean>(false);

  form!: FormGroup;

  chartType: ChartType = 'line';
  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false };

  constructor(private fb: FormBuilder, private finance: FinanceService) {
    this.form = this.fb.group({
      dataSource: ['finance'],
      chartType: ['line' as ChartType],
      groupBy: ['date'],
      period: ['month'],
      currency: ['USD'],
      includeExpenses: [true],
      includeIncomes: [true],
      includeBalance: [false],
      stacked: [false]
    });
  }

  ngOnInit(): void {
    // Generar inicial con valores por defecto
    this.generate();
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

  private titleFor(type: ChartType, groupBy?: string): string {
    const groupMap: Record<string, string> = { date: 'por fecha', category: 'por categoría', member: 'por miembro', source: 'por fuente' };
    const g = groupMap[(groupBy || 'date') as string] || 'por fecha';
    const typeMap: Record<ChartType, string> = { line: 'Líneas', bar: 'Barras', pie: 'Pie', doughnut: 'Donut' } as any;
    const base = `Gráfica (${typeMap[type] || 'Gráfica'}) ${g}`;
    return base;
  }

  generate(): void {
    const value = this.form.value;
    this.loading.set(true);

    // Mapear groupBy: si es 'date', omitimos para usar default del backend
    const query: any = {
      period: value.period,
      currency: value.currency
    };
    if (value.groupBy !== 'date') {
      query.groupBy = value.groupBy as any;
    }

    // Selección de fuente de datos
    const source = value.dataSource;
    if (source !== 'finance') {
      // Fuente de tareas aún no disponible: limpiar y salir
      this.chartData = { labels: [], datasets: [] };
      this.chartOptions = { responsive: true, maintainAspectRatio: false };
      this.loading.set(false);
      return;
    }

    this.finance.getReport(query).subscribe({
      next: (res: any) => {
        const normalized = normalizeReport(res);

        // Selección de datasets
        const selected: ChartDatasetInput[] = [];
        if (value.includeExpenses && normalized.datasets['expenses']) selected.push({ ...normalized.datasets['expenses'], label: this.localizeLabel(normalized.datasets['expenses'].label) });
        if (value.includeIncomes && normalized.datasets['incomes']) selected.push({ ...normalized.datasets['incomes'], label: this.localizeLabel(normalized.datasets['incomes'].label) });
        if (value.includeBalance && normalized.datasets['balance']) selected.push({ ...normalized.datasets['balance'], label: this.localizeLabel(normalized.datasets['balance'].label) });

        const builder = ChartConfigBuilder.fromParams({
          type: value.chartType,
          labels: normalized.labels,
          datasets: selected,
          stacked: Boolean(value.stacked),
          fill: value.chartType === 'line' ? true : false,
          showLegend: true,
          title: this.titleFor(value.chartType, value.groupBy)
        });

        const built = builder.build();
        this.chartType = built.type;
        this.chartData = built.data;
        this.chartOptions = built.options;
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }
}