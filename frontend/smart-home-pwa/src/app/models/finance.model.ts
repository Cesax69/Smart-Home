export type CurrencyCode = 'USD' | 'EUR' | 'PEN' | 'MXN' | 'COP' | 'CLP';

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface Expense {
  id: string;
  amount: number;
  currency: CurrencyCode;
  date: string; // ISO 8601
  categoryId?: string;
  memberId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Income {
  id: string;
  amount: number;
  currency: CurrencyCode;
  date: string; // ISO 8601
  sourceId?: string; // opcional si se usan fuentes de ingreso
  memberId?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ListQuery {
  from?: string; // ISO date
  to?: string;   // ISO date
  categoryId?: string;
  memberId?: string;
  page?: number;
  limit?: number;
  sort?: string; // e.g. "date:desc"
}

export interface ExpensesListResponse {
  success: boolean;
  message?: string;
  data: { items: Expense[] };
  meta: PaginationMeta;
}

export interface IncomesListResponse {
  success: boolean;
  message?: string;
  data: { items: Income[] };
  meta: PaginationMeta;
}

export interface FinanceReportQuery {
  period?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  from?: string;
  to?: string;
  groupBy?: 'category' | 'member' | 'source' | 'none';
  currency?: CurrencyCode;
}

export interface FinanceReportDataset {
  label: string;
  data: number[];
  color?: string;
}

export interface FinanceReportResponse {
  success: boolean;
  data: {
    labels: string[];
    datasets: {
      expenses: FinanceReportDataset;
      incomes: FinanceReportDataset;
      balance: FinanceReportDataset;
    };
  };
  meta?: Record<string, any>;
}