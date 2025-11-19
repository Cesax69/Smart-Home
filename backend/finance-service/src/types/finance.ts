export interface ExpenseRecord {
  id?: number;
  familyId: string;
  memberId?: string;
  category: string;
  amount: number;
  currency: string;
  occurredAt: string; // ISO date
  notes?: string;
}

export interface IncomeRecord {
  id?: number;
  familyId: string;
  memberId?: string;
  source: string;
  amount: number;
  currency: string;
  occurredAt: string; // ISO date
  notes?: string;
}

export interface ReportQuery {
  familyId: string;
  startDate?: string;
  endDate?: string;
  period?: 'day' | 'week' | 'month' | 'year';
  categories?: string[];
  includeIncome?: boolean;
  includeExpenses?: boolean;
}

export interface SummaryQuery {
  familyId: string;
  startDate?: string;
  endDate?: string;
}