import { ChartConfiguration } from 'chart.js';
// Patrón Builder (Analytics):
// - "Producto": configuración de Chart.js (`type`, `data`, `options`).
// - Builder fluido con métodos encadenables para componer la configuración paso a paso.
// - `build()` materializa el objeto final que consumen los componentes.
// - Interfaz `ChartConfigBuilderApi` para contrato estable (tests/mocks/intercambio de implementación).
// - Separación de responsabilidades: normalización/formateo fuera del Builder.

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
 * Interfaz del Builder para la configuración de Chart.js.
 * Permite intercambiar implementaciones y facilita tests/mocks.
 */
export interface ChartConfigBuilderApi {
  setType(type: ChartType): ChartConfigBuilderApi;
  setLabels(labels: string[]): ChartConfigBuilderApi;
  setDatasets(datasets: ChartDatasetInput[]): ChartConfigBuilderApi;
  addDataset(dataset: ChartDatasetInput): ChartConfigBuilderApi;
  setStacked(stacked: boolean): ChartConfigBuilderApi;
  setFill(fill: boolean): ChartConfigBuilderApi;
  setShowLegend(show: boolean): ChartConfigBuilderApi;
  setTitle(title?: string): ChartConfigBuilderApi;
  build(): { type: ChartType; data: ChartConfiguration['data']; options: ChartConfiguration['options'] };
}

/**
 * Builder para construir configuración de Chart.js de forma fluida.
 */
export class ChartConfigBuilder implements ChartConfigBuilderApi {
  private type: ChartType = 'line';
  private labels: string[] = [];
  private datasets: ChartDatasetInput[] = [];
  private stacked = false;
  private fill = false;
  private showLegend = true;
  private title?: string;

  // Factory práctico para crear un Builder con parámetros comunes del componente.
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

  // Construye objetos `data` y `options` compatibles con `ng2-charts`.
  // Mantiene defaults razonables según tipo de gráfica y flags del builder.
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
// Nota: funciones de normalización y formateo se movieron a archivos dedicados