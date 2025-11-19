import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ExpenseReportQuery, ExpenseReportResult } from '../../../core/builders/expense-report.builder';

export interface ExpenseDTO {
  id?: number;
  amount: number;
  currency: string;
  description?: string;
  category?: string;
  date?: string; // ISO string
}

export interface IncomeDTO {
  id?: number;
  amount: number;
  currency: string;
  source?: string;
  date?: string; // ISO string
}

@Injectable({ providedIn: 'root' })
export class FinanceService {
  private readonly API_URL = environment.services.finance;

  constructor(private http: HttpClient) {}

  // Expenses
  listExpenses(params?: { page?: number; pageSize?: number; category?: string; from?: string; to?: string }): Observable<any> {
    return this.http.get(`${this.API_URL}/expenses`, { params: (params as any) });
  }

  createExpense(dto: ExpenseDTO): Observable<any> {
    return this.http.post(`${this.API_URL}/expenses`, dto);
  }

  // Income
  listIncome(params?: { page?: number; pageSize?: number; source?: string; from?: string; to?: string }): Observable<any> {
    return this.http.get(`${this.API_URL}/income`, { params: (params as any) });
  }

  createIncome(dto: IncomeDTO): Observable<any> {
    return this.http.post(`${this.API_URL}/income`, dto);
  }

  // Reports
  getExpenseReport(query: ExpenseReportQuery): Observable<ExpenseReportResult> {
    return this.http.get<ExpenseReportResult>(`${this.API_URL}/report/expenses`, { params: (query as any) });
  }
}