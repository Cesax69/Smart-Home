export type ChartType = 'bar' | 'line' | 'pie';

export interface ChartDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface ChartConfig {
  type: ChartType;
  labels: string[];
  datasets: ChartDataset[];
  options?: any;
}

export class ChartConfigBuilder {
  private cfg: ChartConfig;

  constructor(type: ChartType) {
    this.cfg = { type, labels: [], datasets: [] };
  }

  labels(labels: string[]) {
    this.cfg.labels = labels;
    return this;
  }

  addDataset(dataset: ChartDataset) {
    this.cfg.datasets = [...this.cfg.datasets, dataset];
    return this;
  }

  options(options: any) {
    this.cfg.options = options;
    return this;
  }

  build(): ChartConfig {
    return {
      ...this.cfg,
      datasets: [...this.cfg.datasets],
      labels: [...this.cfg.labels],
    };
  }
}