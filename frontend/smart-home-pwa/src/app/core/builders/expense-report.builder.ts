export type ReportPeriod = 'week' | 'month' | 'year';

export interface ExpenseReportQuery {
  familyId: string;
  period: ReportPeriod;
  start?: string;
  end?: string;
  categories?: string[];
  members?: string[];
  includeIncome?: boolean;
  includeExpenses?: boolean;
  currency?: string;
}

export class ExpenseReportBuilder {
  private q: ExpenseReportQuery;

  constructor(familyId: string) {
    this.q = {
      familyId,
      period: 'month',
      includeIncome: true,
      includeExpenses: true,
      currency: 'USD',
    };
  }

  period(p: ReportPeriod) {
    this.q.period = p;
    return this;
  }

  range(start: Date, end: Date) {
    this.q.start = start.toISOString();
    this.q.end = end.toISOString();
    return this;
  }

  categories(cats: string[]) {
    this.q.categories = cats;
    return this;
  }

  members(members: string[]) {
    this.q.members = members;
    return this;
  }

  currency(code: string) {
    this.q.currency = code;
    return this;
  }

  onlyIncome() {
    this.q.includeIncome = true;
    this.q.includeExpenses = false;
    return this;
  }

  onlyExpenses() {
    this.q.includeIncome = false;
    this.q.includeExpenses = true;
    return this;
  }

  build(): ExpenseReportQuery {
    return { ...this.q };
  }
}