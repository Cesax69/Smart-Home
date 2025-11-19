export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartConfig {
  labels: string[];
  datasets: ChartDataset[];
}

export class ChartConfigBuilder {
  private labels: string[] = [];
  private datasets: ChartDataset[] = [];

  static new(): ChartConfigBuilder {
    return new ChartConfigBuilder();
  }

  withLabels(labels: string[]): this {
    this.labels = labels;
    return this;
  }

  addDataset(label: string, data: number[]): this {
    this.datasets.push({ label, data });
    return this;
  }

  fromReport(labels: string[], datasets: { label: string; data: number[] }[]): this {
    this.labels = labels;
    this.datasets = datasets.map(d => ({ label: d.label, data: d.data }));
    return this;
  }

  build(): ChartConfig {
    return {
      labels: this.labels,
      datasets: this.datasets
    };
  }
}
