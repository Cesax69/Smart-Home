import { ChartConfiguration } from 'chart.js';

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut';

export interface ChartDatasetInput {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartBuildParams {
  type: ChartType;
  labels: string[];
  datasets: ChartDatasetInput[];
  stacked?: boolean;
  fill?: boolean;
  showLegend?: boolean;
  title?: string;
}

/**
 * Builder para construir configuración de Chart.js de forma fluida.
 */
export class ChartConfigBuilder {
  private type: ChartType = 'line';
  private labels: string[] = [];
  private datasets: ChartDatasetInput[] = [];
  private stacked = false;
  private fill = false;
  private showLegend = true;
  private title?: string;

  static fromParams(params: ChartBuildParams): ChartConfigBuilder {
    return new ChartConfigBuilder()
      .setType(params.type)
      .setLabels(params.labels)
      .setDatasets(params.datasets)
      .setStacked(Boolean(params.stacked))
      .setFill(Boolean(params.fill))
      .setShowLegend(params.showLegend !== false)
      .setTitle(params.title);
  }

  setType(type: ChartType): ChartConfigBuilder {
    this.type = type;
    return this;
  }

  setLabels(labels: string[]): ChartConfigBuilder {
    this.labels = labels || [];
    return this;
  }

  setDatasets(datasets: ChartDatasetInput[]): ChartConfigBuilder {
    this.datasets = (datasets || []).map(ds => ({ ...ds }));
    return this;
  }

  addDataset(dataset: ChartDatasetInput): ChartConfigBuilder {
    this.datasets.push({ ...dataset });
    return this;
  }

  setStacked(stacked: boolean): ChartConfigBuilder {
    this.stacked = stacked;
    return this;
  }

  setFill(fill: boolean): ChartConfigBuilder {
    this.fill = fill;
    return this;
  }

  setShowLegend(show: boolean): ChartConfigBuilder {
    this.showLegend = show;
    return this;
  }

  setTitle(title?: string): ChartConfigBuilder {
    this.title = title || undefined;
    return this;
  }

  /**
   * Construye objetos `data` y `options` compatibles con `ng2-charts`.
   */
  build(): { type: ChartType; data: ChartConfiguration['data']; options: ChartConfiguration['options'] } {
    const data: ChartConfiguration['data'] = {
      labels: this.labels,
      datasets: this.datasets.map(ds => {
        const isLine = this.type === 'line';
        const isBar = this.type === 'bar';
        const isPie = this.type === 'pie' || this.type === 'doughnut';
        return {
          data: ds.data,
          label: ds.label,
          borderColor: isLine ? (ds.color || '#666') : undefined,
          backgroundColor: isBar || isPie ? (ds.color || '#888') : 'transparent',
          fill: isLine ? this.fill : undefined
        } as any; // Chart.js typings son flexibles según tipo
      })
    };

    const options: ChartConfiguration['options'] = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: this.showLegend },
        title: this.title ? { display: true, text: this.title } : undefined,
        tooltip: (this.type === 'pie' || this.type === 'doughnut') ? {
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
        } : undefined
      },
      scales: this.type === 'bar' || this.type === 'line' ? {
        x: { stacked: this.stacked },
        y: { stacked: this.stacked }
      } : undefined
    };

    return { type: this.type, data, options };
  }
}

/**
 * Utilidad para normalizar la respuesta del backend a la forma esperada por el frontend.
 * Soporta dos formas:
 * - { data: { labels, datasets: { expenses, incomes, balance } } }
 * - { data: { labels, datasets: Array<{label,data,color}> } }
 */
export function formatLabelForPeriod(iso: string, period?: string): string {
  if (!iso) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  // Mantener formato ISO YYYY-MM-DD siempre para evitar desfases por zona horaria
  const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  if (isoMatch) {
    const [yStr, mStr, dStr] = iso.split('-');
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    const day = parseInt(dStr, 10);
    if (period === 'year') return `${y}-01-01`;
    if (period === 'month') return `${y}-${pad(m)}-01`;
    return `${y}-${pad(m)}-${pad(day)}`;
  }
  // Fallback: intentar convertir a ISO con cero padding
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  if (period === 'year') return `${y}-01-01`;
  if (period === 'month') return `${y}-${pad(m)}-01`;
  return `${y}-${pad(m)}-${pad(day)}`;
}

export function normalizeReport(res: any): { labels: string[]; datasets: Record<string, ChartDatasetInput> } {
  const rawLabels: string[] = res?.data?.labels || [];
  const period: string | undefined = res?.meta?.period;
  const groupBy: string | undefined = res?.meta?.groupBy;
  const labels: string[] = (groupBy === 'date' && period) ? rawLabels.map(l => formatLabelForPeriod(l, period)) : rawLabels;
  const ds = res?.data?.datasets;

  if (Array.isArray(ds)) {
    const map: Record<string, ChartDatasetInput> = {};
    ds.forEach((d: any) => {
      const rawLabel: string = d?.label || '';
      const lower = rawLabel.toLowerCase();
      let key = lower;
      if (lower.includes('gasto')) key = 'expenses';
      else if (lower.includes('ingreso')) key = 'incomes';
      else if (lower.includes('balance')) key = 'balance';

      map[key] = { label: rawLabel, data: d?.data || [], color: d?.color };
    });
    return { labels, datasets: map };
  }

  return {
    labels,
    datasets: {
      expenses: ds?.expenses,
      incomes: ds?.incomes,
      balance: ds?.balance
    }
  } as any;
}