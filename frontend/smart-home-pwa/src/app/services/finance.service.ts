import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Expense,
  Income,
  ListQuery,
  ExpensesListResponse,
  IncomesListResponse,
  FinanceReportQuery,
  FinanceReportResponse,
} from '../models/finance.model';

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly base = environment.services.finance;

  constructor(private http: HttpClient) {}

  // Expenses
  listExpenses(query: ListQuery): Observable<ExpensesListResponse> {
    const params = this.buildParams(query);
    return this.http.get<ExpensesListResponse>(`${this.base}/expenses`, { params });
  }

  getExpense(id: string): Observable<{ success: boolean; data: Expense }> {
    return this.http.get<{ success: boolean; data: Expense }>(`${this.base}/expenses/${id}`);
  }

  createExpense(payload: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Observable<{ success: boolean; data: Expense }> {
    // Backend espera: { amount, currency?, categoryId, memberId?, date?, notes? }
    return this.http.post<{ success: boolean; data: Expense }>(`${this.base}/expenses`, payload);
  }

  updateExpense(id: string, payload: Partial<Expense>): Observable<{ success: boolean; data: Expense }> {
    return this.http.put<{ success: boolean; data: Expense }>(`${this.base}/expenses/${id}`, payload);
  }

  deleteExpense(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/expenses/${id}`);
  }

  // Incomes
  listIncomes(query: ListQuery): Observable<IncomesListResponse> {
    // Backend espera query: { from?, to?, source?, memberId? }
    const q: any = { ...(query || {}) };
    if (q.sourceId) { q.source = q.sourceId; delete q.sourceId; }
    const params = this.buildParams(q);
    return this.http.get<IncomesListResponse>(`${this.base}/income`, { params });
  }

  getIncome(id: string): Observable<{ success: boolean; data: Income }> {
    return this.http.get<{ success: boolean; data: Income }>(`${this.base}/income/${id}`);
  }

  createIncome(payload: Omit<Income, 'id' | 'createdAt' | 'updatedAt'>): Observable<{ success: boolean; data: Income }> {
    // Backend espera: { amount, currency?, source, memberId?, date?, notes? }
    const body: any = this.mapIncomePayload(payload);
    return this.http.post<{ success: boolean; data: Income }>(`${this.base}/income`, body);
  }

  updateIncome(id: string, payload: Partial<Income>): Observable<{ success: boolean; data: Income }> {
    const body: any = this.mapIncomePayload(payload);
    return this.http.put<{ success: boolean; data: Income }>(`${this.base}/income/${id}`, body);
  }

  deleteIncome(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/income/${id}`);
  }

  // Report
  getReport(query: FinanceReportQuery): Observable<FinanceReportResponse> {
    const params = this.buildParams(query);
    return this.http.get<FinanceReportResponse>(`${this.base}/report`, { params });
  }

  private buildParams(query: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      params = params.set(key, String(value));
    });
    return params;
  }

  private mapIncomePayload(payload: Partial<Income>): Record<string, any> {
    return {
      source: payload.sourceId ?? (payload as any).source,
      amount: payload.amount,
      currency: payload.currency,
      date: payload.date,
      memberId: payload.memberId,
      notes: payload.notes
    };
  }
}