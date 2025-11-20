export interface Expense {
    id: string;
    amount: number;
    currency: string;
    categoryId: string;
    memberId?: string;
    date: string;
    notes?: string;
    createdAt: string;
}
export interface Income {
    id: string;
    amount: number;
    currency: string;
    source: string;
    memberId?: string;
    date: string;
    notes?: string;
    createdAt: string;
}
export interface CreateExpenseRequest {
    amount: number;
    currency?: string;
    categoryId: string;
    memberId?: string;
    date?: string;
    notes?: string;
}
export interface CreateIncomeRequest {
    amount: number;
    currency?: string;
    source: string;
    memberId?: string;
    date?: string;
    notes?: string;
}
export interface GetExpensesQuery {
    from?: string;
    to?: string;
    categoryId?: string;
    memberId?: string;
}
export interface GetIncomeQuery {
    from?: string;
    to?: string;
    source?: string;
    memberId?: string;
}
export interface FinanceReportQuery {
    period?: 'week' | 'month' | 'year';
    from?: string;
    to?: string;
    groupBy?: 'category' | 'member' | 'date';
    currency?: string;
}
export interface ApiResponse<T = any> {
    ok: boolean;
    data?: T;
    meta?: Record<string, any>;
    error?: ApiError;
}
export interface ApiError {
    code: string;
    message: string;
    details?: any;
}
export interface ExpensesListData {
    items: Expense[];
}
export interface IncomeListData {
    items: Income[];
}
export interface FinanceReportData {
    labels: string[];
    datasets: Dataset[];
}
export interface Dataset {
    label: string;
    data: number[];
    color: string;
}
export interface DateRange {
    start: string;
    end: string;
}
//# sourceMappingURL=types.d.ts.map