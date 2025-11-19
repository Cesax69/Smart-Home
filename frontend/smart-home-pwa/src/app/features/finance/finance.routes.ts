import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const financeRoutes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/finance-dashboard.component').then(m => m.FinanceDashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'expenses',
    loadComponent: () => import('./components/expenses/finance-expenses.component').then(m => m.FinanceExpensesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'income',
    loadComponent: () => import('./components/income/finance-income.component').then(m => m.FinanceIncomeComponent),
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./components/reports/finance-reports.component').then(m => m.FinanceReportsComponent),
    canActivate: [authGuard]
  }
];