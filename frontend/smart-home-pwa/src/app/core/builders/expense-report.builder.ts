export type GroupBy = 'day' | 'week' | 'month' | 'year' | 'category';

export interface ExpenseReportQuery {
  startDate?: string;
  endDate?: string;
  groupBy?: GroupBy;
  currency?: string;
}

export interface ExpenseReportDataset {
  label: string;
  data: number[];
}

export interface ExpenseReportResult {
  labels: string[];
  datasets: ExpenseReportDataset[];
  currency: string;
}

export class ExpenseReportBuilder {
  private query: ExpenseReportQuery = {};

  static new(): ExpenseReportBuilder {
    return new ExpenseReportBuilder();
  }

  withPeriod(startDate?: string, endDate?: string): this {
    this.query.startDate = startDate;
    this.query.endDate = endDate;
    return this;
  }

  withGroupBy(groupBy: GroupBy): this {
    this.query.groupBy = groupBy;
    return this;
  }

  withCurrency(currency: string): this {
    this.query.currency = currency;
    return this;
  }

  build(): ExpenseReportQuery {
    return {
      ...this.query,
      currency: this.query.currency || 'USD'
    };
  }
}
