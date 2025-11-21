import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const analyticsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard-analytics/dashboard-analytics.component').then(m => m.DashboardAnalyticsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'builder',
    loadComponent: () => import('./chart-builder/chart-builder.component').then(m => m.AnalyticsChartBuilderComponent),
    canActivate: [authGuard]
  }
];