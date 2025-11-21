import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';
import { FinanceHomeComponent } from './finance-home.component';

export const financeRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./finance-home.component').then(m => m.FinanceHomeComponent),
    canActivate: [authGuard]
  },
  // Se mantienen rutas de detalle si se requiere acceso directo
  {
    path: 'expenses/create',
    loadComponent: () => import('./expenses/expense-form.component').then(m => m.ExpenseFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'expenses/edit/:id',
    loadComponent: () => import('./expenses/expense-form.component').then(m => m.ExpenseFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'incomes/create',
    loadComponent: () => import('./incomes/income-form.component').then(m => m.IncomeFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'incomes/edit/:id',
    loadComponent: () => import('./incomes/income-form.component').then(m => m.IncomeFormComponent),
    canActivate: [authGuard]
  }
];