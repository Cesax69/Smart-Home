import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface ExpenseReportResponse {
  labels: string[];
  expenses: number[];
  income: number[];
  balance: number[];
  currency: string;
  meta?: { period?: string; start?: string; end?: string };
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly API_URL = environment.services.finance;

  constructor(private http: HttpClient) {}

  getExpenseReport(query: import('../../../core/builders/expense-report.builder').ExpenseReportQuery) {
    return this.http.post<ExpenseReportResponse>(`${this.API_URL}/finance/reports`, query);
  }

  getFinanceSummary(params: { start?: string; end?: string; familyId: string }) {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) httpParams = httpParams.set(k, String(v));
    });
    return this.http.get<any>(`${this.API_URL}/finance/summary`, { params: httpParams });
  }

  getExpenses(params?: { from?: string; to?: string; category?: string; member?: string; familyId?: string }) {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http.get<any>(`${this.API_URL}/finance/expenses`, { params: httpParams });
  }

  createExpense(payload: any) {
    return this.http.post<any>(`${this.API_URL}/finance/expenses`, payload);
  }

  getIncome(params?: { from?: string; to?: string; source?: string; member?: string; familyId?: string }) {
    let httpParams = new HttpParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null) httpParams = httpParams.set(k, String(v));
      });
    }
    return this.http.get<any>(`${this.API_URL}/finance/income`, { params: httpParams });
  }

  createIncome(payload: any) {
    return this.http.post<any>(`${this.API_URL}/finance/income`, payload);
  }
}