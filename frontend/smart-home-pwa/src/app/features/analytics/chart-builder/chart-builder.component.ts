import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { BaseChartDirective } from 'ng2-charts';
import { ChartConfiguration, Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

import { FinanceService } from '../../../services/finance.service';
import { UserService } from '../../../services/user.service';
import { TaskService } from '../../task-management/services/task.service';
import { normalizeReport, ChartConfigBuilder, ChartType, ChartDatasetInput } from '../chart-config.builder';
import { CatalogMaps } from '../../../catalogs/catalogs';

@Component({
  selector: 'app-analytics-chart-builder',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatToolbarModule,
    MatFormFieldModule,
    MatInputModule,
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
  detailVisible = signal<boolean>(false);
  selectedMeta = signal<{ source: 'finance' | 'tasks'; groupBy: string; period?: string; label?: string; datasetLabel?: string } | null>(null);
  selectedSummary = signal<Array<{ label: string; value: number }>>([]);
  financeExpenses = signal<any[]>([]);
  financeIncomes = signal<any[]>([]);
  taskItems = signal<any[]>([]);
  
  private lastTaskStats: any = null;
  private usersById: Record<number, string> = {};
  private financeMemberIds: string[] = [];
  private financeCategoryIds: string[] = [];
  private financeSourceIds: string[] = [];
  private taskMemberIds: number[] = [];

  form!: FormGroup;

  chartType: ChartType = 'line';
  chartData: ChartConfiguration['data'] = { labels: [], datasets: [] };
  chartOptions: ChartConfiguration['options'] = { responsive: true, maintainAspectRatio: false };

  constructor(
    private fb: FormBuilder,
    private finance: FinanceService,
    private tasks: TaskService,
    private users: UserService
  ) {
    this.form = this.fb.group({
      dataSource: ['finance'],
      chartType: ['line' as ChartType],
      groupBy: ['timeline'],
      period: ['month'],
      currency: ['USD'],
      includeExpenses: [true],
      includeIncomes: [true],
      includeBalance: [false]
    });
  }

  ngOnInit(): void {
    this.users.getUserNameMap().subscribe({
      next: (map) => { this.usersById = map || {}; },
      error: () => { this.usersById = {}; }
    });
    
    this.form.valueChanges.subscribe((v) => {
      if (v?.dataSource === 'finance') {
        this.ensureValidFinanceGroupBy();
      }
    });
    
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

  private labelForFinanceMember(memberId: string): string {
    const num = Number(memberId);
    if (!isNaN(num) && this.usersById[num]) {
      return this.usersById[num];
    }
    const key = String(memberId || '').toLowerCase();
    const map: Record<string, string> = {
      'head': 'Jefe de hogar',
      'spouse': 'Pareja',
      'child': 'Hijo',
      'child1': 'Hijo 1',
      'child2': 'Hijo 2',
      'child3': 'Hijo 3',
      'guest': 'Invitado'
    };
    if (map[key]) return map[key];
    return key.charAt(0).toUpperCase() + key.slice(1);
  }

  private titleFor(type: ChartType, groupBy?: string): string {
    const groupMap: Record<string, string> = {
      timeline: 'por período',
      category: 'por categoría',
      member: 'por miembro',
      source: 'por fuente'
    };
    const g = groupMap[(groupBy || 'timeline') as string] || 'por período';
    const typeMap: Record<ChartType, string> = {
      line: 'Líneas',
      bar: 'Barras',
      pie: 'Pie',
      doughnut: 'Donut'
    } as any;
    return `Gráfica (${typeMap[type] || 'Gráfica'}) ${g}`;
  }

  generate(): void {
    const value = this.form.value;
    this.loading.set(true);

    const source = value.dataSource;
    if (source === 'finance') {
      const allowed = this.computeAllowedFinanceGroupBy(value);
      const inputGb = value.groupBy ? String(value.groupBy) : 'timeline';
      const gb = inputGb && allowed.includes(inputGb) ? inputGb : 'timeline';
      
      const query: any = {
        period: value.period,
        currency: value.currency
      };
      
      if (gb && gb !== 'timeline') {
        query.groupBy = gb as any;
      } else {
        query.groupBy = 'date';
      }

      this.finance.getReport(query).subscribe({
        next: (res: any) => {
          const normalized = normalizeReport(res);
          const selected: ChartDatasetInput[] = [];
          
          if (value.includeExpenses && normalized.datasets['expenses']) {
            selected.push({
              ...normalized.datasets['expenses'],
              label: this.localizeLabel(normalized.datasets['expenses'].label)
            });
          }
          if (value.includeIncomes && normalized.datasets['incomes']) {
            selected.push({
              ...normalized.datasets['incomes'],
              label: this.localizeLabel(normalized.datasets['incomes'].label)
            });
          }
          if (value.includeBalance && normalized.datasets['balance']) {
            selected.push({
              ...normalized.datasets['balance'],
              label: this.localizeLabel(normalized.datasets['balance'].label)
            });
          }

          let labelsToUse: any[] = normalized.labels;
          const gbForLabels = String(gb || 'timeline');
          
          if (gbForLabels === 'member') {
            this.financeMemberIds = (normalized.labels || []).map((x: any) => String(x));
            labelsToUse = (normalized.labels || []).map((id: any) => 
              this.labelForFinanceMember(String(id))
            );
          } else {
            this.financeMemberIds = [];
          }

          // Mapear etiquetas de categoría y fuente a nombres legibles
          if (gbForLabels === 'category') {
            this.financeCategoryIds = (normalized.labels || []).map((x: any) => String(x));
            labelsToUse = (normalized.labels || []).map((id: any) => 
              CatalogMaps.expenseCategoriesMap[String(id)] || String(id)
            );
          }
          if (gbForLabels === 'source') {
            this.financeSourceIds = (normalized.labels || []).map((x: any) => String(x));
            labelsToUse = (normalized.labels || []).map((id: any) => 
              CatalogMaps.incomeSourcesMap[String(id)] || String(id)
            );
          }

          const builder = ChartConfigBuilder.fromParams({
            type: value.chartType,
            labels: labelsToUse,
            datasets: selected,
            stacked: value.chartType === 'bar',
            fill: value.chartType === 'line' ? true : false,
            title: this.titleFor(value.chartType, gb)
          });

          const built = builder.build();
          this.chartType = built.type;
          this.chartData = built.data;
          this.chartOptions = this.enhanceChartOptions(built.options);
          
          this.loading.set(false);
          this.detailVisible.set(false);
          this.selectedMeta.set(null);
          this.selectedSummary.set([]);
          this.financeExpenses.set([]);
          this.financeIncomes.set([]);
        },
        error: () => {
          this.loading.set(false);
        }
      });
      return;
    }

    if (source === 'tasks') {
      const group = ['status', 'category', 'priority', 'member'].includes(value.groupBy) 
        ? value.groupBy 
        : 'status';
        
      this.tasks.getTaskStats().subscribe({
        next: (stats: any) => {
          this.lastTaskStats = stats;
          const labels: string[] = [];
          const data: number[] = [];
          let datasetLabel = 'Tareas';
          let color = '#42a5f5';

          if (group === 'status') {
            labels.push('Pendiente', 'En Proceso', 'Completada');
            data.push(
              stats?.pendingTasks ?? 0,
              stats?.inProgressTasks ?? 0,
              stats?.completedTasks ?? 0
            );
            datasetLabel = 'Tareas por estado';
            color = '#5c6bc0';
          } else if (group === 'category') {
            const entries = Object.entries(stats?.tasksByCategory || {});
            entries.forEach(([cat, count]) => {
              labels.push(cat);
              data.push(Number(count as any) || 0);
            });
            datasetLabel = 'Tareas por categoría';
            color = '#26a69a';
          } else if (group === 'priority') {
            const order = ['baja', 'media', 'alta', 'urgente'];
            order.forEach((p) => {
              labels.push(p);
              data.push(Number((stats?.tasksByPriority || {})[p] || 0));
            });
            datasetLabel = 'Tareas por prioridad';
            color = '#ef5350';
          } else if (group === 'member') {
            const entries = Object.entries(stats?.tasksByMember || {}) as Array<[string, any]>;
            this.taskMemberIds = [];
            entries.forEach(([userId, info]) => {
              const idNum = Number(userId);
              const displayName = this.usersById[idNum] || String(info?.name || 'Miembro');
              labels.push(displayName);
              data.push(Number(info?.count || 0));
              this.taskMemberIds.push(idNum);
            });
            datasetLabel = 'Tareas por miembro';
            color = '#ab47bc';
          }

          const builder = ChartConfigBuilder.fromParams({
            type: value.chartType,
            labels,
            datasets: [{ label: datasetLabel, data, color }],
            fill: value.chartType === 'line' ? true : false,
            title: this.titleFor(value.chartType, group)
          });

          const built = builder.build();
          this.chartType = built.type;
          this.chartData = built.data;
          this.chartOptions = this.enhanceChartOptions(built.options);
          
          this.loading.set(false);
          this.detailVisible.set(false);
        },
        error: () => {
          this.loading.set(false);
        }
      });
      return;
    }

    this.chartData = { labels: [], datasets: [] };
    this.chartOptions = { responsive: true, maintainAspectRatio: false };
    this.loading.set(false);
  }

  private enhanceChartOptions(baseOptions: any): ChartConfiguration['options'] {
    const enhanced: any = { ...baseOptions };

    // Animaciones y transiciones básicas por defecto
    enhanced.animation = {
      duration: 600,
      easing: 'easeInOutQuart'
    };
    enhanced.transitions = { active: { animation: { duration: 300 } } };
    const isPieLike = this.chartType === 'pie' || this.chartType === 'doughnut';
    enhanced.hover = isPieLike ? { mode: 'nearest', intersect: true, animationDuration: 300 } : { mode: 'index', intersect: false, animationDuration: 300 };

    // Plugins mínimos: leyenda, tooltip y título
    enhanced.plugins = {
      ...enhanced.plugins,
      legend: {
        display: true,
        position: 'top',
        labels: { usePointStyle: true, padding: 16, font: { size: 12, weight: '600' } }
      },
      tooltip: isPieLike ? {
        enabled: true,
        mode: 'nearest',
        intersect: true,
        callbacks: {
          label: (context: any) => {
            const lbl = context.label ?? '';
            const valNum = typeof context.parsed === 'number' ? context.parsed : Number(context.formattedValue?.replace(/[^0-9.-]/g, ''));
            const dataArr = Array.isArray(context?.dataset?.data) ? context.dataset.data : [];
            const total = (dataArr as number[]).reduce((acc, n) => acc + (Number(n) || 0), 0) || 0;
            const pct = total > 0 ? ((valNum || 0) / total) * 100 : 0;
            const valFmt = (valNum ?? '')?.toLocaleString?.() ?? valNum;
            const pctFmt = `${pct.toFixed(1)}%`;
            return `${lbl}: ${valFmt} (${pctFmt})`;
          }
        }
      } : {
        enabled: true,
        mode: 'index',
        intersect: false
      },
      title: {
        display: true,
        text: enhanced.plugins?.title?.text || 'Gráfica',
        font: { size: 18, weight: 'bold' },
        padding: { top: 10, bottom: 20 }
      }
    };

    // Escalas y cuadrícula básicas
    if (this.chartType === 'line' || this.chartType === 'bar') {
      enhanced.scales = {
        x: {
          display: true,
          grid: { display: true, color: 'rgba(0, 0, 0, 0.05)', drawBorder: true, drawOnChartArea: true, drawTicks: true },
          ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 0 }
        },
        y: {
          display: true,
          beginAtZero: true,
          grid: { display: true, color: 'rgba(0, 0, 0, 0.05)', drawBorder: true, drawOnChartArea: true, drawTicks: true },
          ticks: { font: { size: 11 }, callback: (value: any) => value.toLocaleString() }
        }
      };
    }

    // Estilo por defecto de datasets (sin controles avanzados)
    if (this.chartData.datasets) {
      this.chartData.datasets.forEach((dataset: any) => {
        if (this.chartType === 'line') {
          dataset.tension = 0.4;
          dataset.pointRadius = 3;
          dataset.pointHoverRadius = 5;
          dataset.borderWidth = 2;
          dataset.pointBackgroundColor = dataset.borderColor;
          dataset.pointBorderColor = '#fff';
          dataset.pointBorderWidth = 2;
          dataset.pointHoverBorderWidth = 3;
        } else if (this.chartType === 'bar') {
          dataset.borderWidth = 1;
          dataset.borderRadius = 6;
          dataset.borderSkipped = false;
        } else if (this.chartType === 'pie' || this.chartType === 'doughnut') {
          dataset.borderWidth = 2;
          dataset.borderColor = '#fff';
          dataset.hoverOffset = 10;
        }
      });
    }

    return enhanced;
  }

  private computeAllowedFinanceGroupBy(value: any): string[] {
    const allow: string[] = ['timeline', 'member'];
    const incExp = Boolean(value?.includeExpenses);
    const incInc = Boolean(value?.includeIncomes);
    if (incExp && !incInc) allow.push('category');
    if (incInc && !incExp) allow.push('source');
    return allow;
  }

  private ensureValidFinanceGroupBy(): void {
    const v = this.form.value;
    const allowed = this.computeAllowedFinanceGroupBy(v);
    const current = v.groupBy ? String(v.groupBy) : 'timeline';
    if (!allowed.includes(current)) {
      this.form.patchValue({ groupBy: 'timeline' }, { emitEvent: false });
    }
  }

  onChartClick(evt: { event?: any; active?: any[] }): void {
    try {
      const active = evt?.active || [];
      if (!active.length) return;
      
      const idx = (active[0]?.index ?? (active[0] as any)?._index ?? 0);
      const dsIdx = active[0]?.datasetIndex ?? 0;
      const labels = (this.chartData?.labels as any[]) || [];
      const datasets = (this.chartData?.datasets as any[]) || [];
      const label = String(labels[idx] ?? '');
      const datasetLabel = String(datasets[dsIdx]?.label ?? '');

      const source = (this.form.value.dataSource as 'finance' | 'tasks') || 'finance';
      const groupBy = String(this.form.value.groupBy || (source === 'finance' ? 'timeline' : 'status'));
      const period = source === 'finance' ? String(this.form.value.period || 'month') : undefined;

      const summary: Array<{ label: string; value: number }> = datasets
        .map((d: any) => ({
          label: String(d?.label || ''),
          value: Number((d?.data || [])[idx] ?? 0)
        }))
        .filter((s) => s.value !== 0);
      
      this.selectedSummary.set(summary);
      
      let effectiveLabelForDetail: string = label;
      if (source === 'finance' && groupBy === 'member') {
        const id = this.financeMemberIds[idx];
        if (id) effectiveLabelForDetail = String(id);
      }
      if (source === 'finance' && groupBy === 'category') {
        const id = this.financeCategoryIds[idx];
        if (id) effectiveLabelForDetail = String(id);
      }
      if (source === 'finance' && groupBy === 'source') {
        const id = this.financeSourceIds[idx];
        if (id) effectiveLabelForDetail = String(id);
      }
      if (source === 'tasks' && groupBy === 'member') {
        const idNum = this.taskMemberIds[idx];
        if (typeof idNum === 'number') effectiveLabelForDetail = String(idNum);
      }

      this.selectedMeta.set({ source, groupBy, period, label, datasetLabel });
      this.detailVisible.set(true);

      this.financeExpenses.set([]);
      this.financeIncomes.set([]);
      this.taskItems.set([]);

      if (source === 'finance') {
        this.loadFinanceDetails(groupBy, period as string, effectiveLabelForDetail);
      } else {
        this.loadTaskDetails(groupBy, effectiveLabelForDetail);
      }
    } catch (err) {
      console.error('Error en clic de gráfica:', err);
    }
  }

  computeChartWidth(): number {
    try {
      const labels = (this.chartData?.labels as any[]) || [];
      const base = this.chartType === 'line' || this.chartType === 'bar' ? 80 : 40;
      const min = 600;
      return Math.max(min, labels.length * base);
    } catch {
      return 800;
    }
  }

  private computeCurrentPeriodRange(period: string): { from: string; to: string } | null {
    const now = new Date();
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
    const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();

    if (period === 'day') {
      return { from: startOfDay(now), to: endOfDay(now) };
    }
    if (period === 'week') {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const from = new Date(now);
      from.setDate(now.getDate() - diffToMonday);
      const to = new Date(from);
      to.setDate(from.getDate() + 6);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    if (period === 'month') {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    if (period === 'year') {
      const from = new Date(now.getFullYear(), 0, 1);
      const to = new Date(now.getFullYear(), 11, 31);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    return null;
  }

  private loadFinanceDetails(groupBy: string, period: string, label: string): void {
    if (groupBy === 'timeline' || groupBy === 'date') {
      const range = this.computeRangeFromLabel(period, label);
      if (range) {
        const cfg = this.form.value;
        const currency = String(cfg.currency || 'USD');
        if (cfg.includeExpenses) {
          this.finance.listExpenses({ from: range.from, to: range.to, currency } as any).subscribe({
            next: (resp) => {
              const items = (resp?.data?.items || []).filter((e: any) => String(e?.currency) === currency);
              this.financeExpenses.set(items);
            },
            error: () => this.financeExpenses.set([])
          });
        } else {
          this.financeExpenses.set([]);
        }
        if (cfg.includeIncomes) {
          this.finance.listIncomes({ from: range.from, to: range.to, currency } as any).subscribe({
            next: (resp) => {
              const items = (resp?.data?.items || []).filter((i: any) => String(i?.currency) === currency);
              this.financeIncomes.set(items);
            },
            error: () => this.financeIncomes.set([])
          });
        } else {
          this.financeIncomes.set([]);
        }
      }
      return;
    }

    if (groupBy === 'category') {
      const range = this.computeCurrentPeriodRange(period);
      if (range) {
        const cfg = this.form.value; const currency = String(cfg.currency || 'USD');
        this.finance.listExpenses({ from: range.from, to: range.to, categoryId: label, currency } as any).subscribe({
          next: (resp) => {
            const items = (resp?.data?.items || []).filter((e: any) => String(e?.currency) === currency);
            this.financeExpenses.set(items);
          },
          error: () => this.financeExpenses.set([])
        });
        this.financeIncomes.set([]);
      }
      return;
    }

    if (groupBy === 'member') {
      const range = this.computeCurrentPeriodRange(period);
      if (range) {
        const cfg = this.form.value; const currency = String(cfg.currency || 'USD');
        this.finance.listExpenses({ from: range.from, to: range.to, memberId: label, currency } as any).subscribe({
          next: (resp) => {
            const items = (resp?.data?.items || []).filter((e: any) => String(e?.currency) === currency);
            this.financeExpenses.set(items);
          },
          error: () => this.financeExpenses.set([])
        });
        this.finance.listIncomes({ from: range.from, to: range.to, memberId: label, currency } as any).subscribe({
          next: (resp) => {
            const items = (resp?.data?.items || []).filter((i: any) => String(i?.currency) === currency);
            this.financeIncomes.set(items);
          },
          error: () => this.financeIncomes.set([])
        });
      }
      return;
    }

    if (groupBy === 'source') {
      const range = this.computeCurrentPeriodRange(period);
      if (range) {
        const cfg = this.form.value; const currency = String(cfg.currency || 'USD');
        this.finance.listIncomes({ from: range.from, to: range.to, source: label, currency } as any).subscribe({
          next: (resp) => {
            const items = (resp?.data?.items || []).filter((i: any) => String(i?.currency) === currency);
            this.financeIncomes.set(items);
          },
          error: () => this.financeIncomes.set([])
        });
        this.financeExpenses.set([]);
      }
      return;
    }
  }

  private computeRangeFromLabel(period: string, label: string): { from: string; to: string } | null {
    const pad = (n: number) => String(n).padStart(2, '0');
    
    let d = new Date(label);
    let isoParsed = false;
    let isoParts: [number, number, number] | null = null;

    if (isNaN(d.getTime())) {
      const currentRange = this.computeCurrentPeriodRange(period);
      const base = currentRange ? new Date(currentRange.from) : new Date();
      const year = base.getFullYear();
      const month = base.getMonth();

      const clean = String(label || '').trim().toLowerCase();
      const months: Record<string, number> = {
        'ene': 0, 'enero': 0, 'feb': 1, 'febrero': 1, 'mar': 2, 'marzo': 2,
        'abr': 3, 'abril': 3, 'may': 4, 'mayo': 4, 'jun': 5, 'junio': 5,
        'jul': 6, 'julio': 6, 'ago': 7, 'agosto': 7, 'sep': 8, 'sept': 8,
        'septiembre': 8, 'oct': 9, 'octubre': 9, 'nov': 10, 'noviembre': 10,
        'dic': 11, 'diciembre': 11
      };

      const isoMatch = clean.match(/^\d{4}-\d{2}-\d{2}$/);
      if (isoMatch) {
        const [yrStr, monStr, dayStr] = clean.split('-');
        const yr = parseInt(yrStr, 10);
        const mon = parseInt(monStr, 10) - 1;
        const day = parseInt(dayStr, 10);
        d = new Date(yr, mon, day);
        isoParsed = true;
        isoParts = [yr, mon, day];
      }

      // Soporte para formato "YYYY/MM/DD" manteniendo interpretación en UTC
      if (!isoParsed) {
        const ymdSlashMatch = clean.match(/^(\d{4})[\/](\d{1,2})[\/](\d{1,2})$/);
        if (ymdSlashMatch) {
          const yr = parseInt(ymdSlashMatch[1], 10);
          const mon = parseInt(ymdSlashMatch[2], 10) - 1;
          const day = parseInt(ymdSlashMatch[3], 10);
          d = new Date(yr, mon, day);
          isoParsed = true;
          isoParts = [yr, mon, day];
        }
      }

      if (isNaN(d.getTime())) {
        const dmMatch = clean.match(/^(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?$/);
        if (dmMatch) {
          const day = parseInt(dmMatch[1], 10);
          const mon = parseInt(dmMatch[2], 10) - 1;
          const yr = dmMatch[3] ? parseInt(dmMatch[3], 10) : year;
          d = new Date(yr, mon, day);
        }
      }

      if (isNaN(d.getTime())) {
        let mMatch = clean.match(/^(\d{1,2})\s+([a-z\.]+)/);
        if (!mMatch) mMatch = clean.match(/^([a-z\.]+)\s+(\d{1,2})$/);
        if (mMatch) {
          const a = mMatch[1];
          const b = mMatch[2];
          let day: number | null = null;
          let monName: string | null = null;
          if (/^\d/.test(a)) {
            day = parseInt(a, 10);
            monName = b.replace(/\./g, '');
          } else {
            day = parseInt(b, 10);
            monName = a.replace(/\./g, '');
          }
          const mon = months[monName || ''];
          if (day && typeof mon === 'number') {
            d = new Date(year, mon, day);
          }
        }
      }

      if (isNaN(d.getTime())) {
        const onlyDay = clean.match(/^(\d{1,2})$/);
        if (onlyDay) {
          const day = parseInt(onlyDay[1], 10);
          d = new Date(year, month, day);
        }
      }
    }

    if (isNaN(d.getTime())) return null;

    if (period === 'day' || period === 'month') {
      if (isoParsed && isoParts) {
        const [yr, mon, day] = isoParts;
        const fromUtc = new Date(Date.UTC(yr, mon, day, 0, 0, 0, 0)).toISOString();
        const toUtc = new Date(Date.UTC(yr, mon, day, 23, 59, 59, 999)).toISOString();
        return { from: fromUtc, to: toUtc };
      }
      const fromIso = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
      const toIsoEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).toISOString();
      return { from: fromIso, to: toIsoEnd };
    }
    if (period === 'week') {
      const from = new Date(d);
      const to = new Date(d);
      to.setDate(to.getDate() + 6);
      const fromIso = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).toISOString();
      const toIsoEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).toISOString();
      return { from: fromIso, to: toIsoEnd };
    }
    if (period === 'year') {
      const from = new Date(d.getFullYear(), 0, 1);
      const to = new Date(d.getFullYear(), 11, 31);
      const fromIso = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0, 0, 0, 0).toISOString();
      const toIsoEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999).toISOString();
      return { from: fromIso, to: toIsoEnd };
    }
    return null;
  }

  private loadTaskDetails(groupBy: string, label: string): void {
    const lower = String(label || '').toLowerCase();
    if (groupBy === 'status') {
      const map: any = {
        'pendiente': 'pending',
        'en proceso': 'in_progress',
        'en_proceso': 'in_progress',
        'completada': 'completed'
      };
      const stKey = map[lower] || 'pending';
      // Mapear al formato esperado por el backend en español
      const backendStatusMap: Record<string, 'pendiente' | 'en_proceso' | 'completada' | 'archivada'> = {
        pending: 'pendiente',
        in_progress: 'en_proceso',
        completed: 'completada',
        archived: 'archivada'
      };
      const st = backendStatusMap[stKey] || 'pendiente';
      this.tasks.getTasksByStatus(st).subscribe({
        next: (list) => this.taskItems.set(list || []),
        error: () => this.taskItems.set([])
      });
      return;
    }
    if (groupBy === 'priority') {
      // Filtrar en cliente con método dedicado
      const pri = ['baja','media','alta','urgente'].includes(lower) ? (lower as any) : 'media';
      this.tasks.getTasksByPriority(pri).subscribe({
        next: (list) => this.taskItems.set(list || []),
        error: () => this.taskItems.set([])
      });
      return;
    }
    if (groupBy === 'category') {
      this.tasks.getTasksByCategory(lower).subscribe({
        next: (list) => this.taskItems.set(list || []),
        error: () => this.taskItems.set([])
      });
      return;
    }
    if (groupBy === 'member') {
      const parsedId = parseInt(String(label), 10);
      const userId = !isNaN(parsedId) ? parsedId : (() => {
        const nameToId: Record<string, number> = {};
        Object.entries(this.usersById).forEach(([idStr, name]) => {
          nameToId[String(name).toLowerCase()] = Number(idStr);
        });
        return nameToId[lower];
      })();
      if (typeof userId === 'number' && !isNaN(userId)) {
        this.tasks.getTasksByMember(userId).subscribe({
          next: (list) => this.taskItems.set(list || []),
          error: () => this.taskItems.set([])
        });
      } else {
        this.taskItems.set([]);
      }
      return;
    }
  }
}