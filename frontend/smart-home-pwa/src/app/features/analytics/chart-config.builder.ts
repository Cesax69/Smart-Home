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
        title: this.title ? { display: true, text: this.title } : undefined
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
export function normalizeReport(res: any): { labels: string[]; datasets: Record<string, ChartDatasetInput> } {
  const labels: string[] = res?.data?.labels || [];
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