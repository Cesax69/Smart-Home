import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardAdminComponent } from './components/dashboard-admin/dashboard-admin.component';
import { DashboardMemberComponent } from './components/dashboard-member/dashboard-member.component';
import { authGuard, adminGuard, guestGuard } from './guards/auth.guard';
import { AppLayoutComponent } from './components/shared/layout/app-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard/admin',
        component: DashboardAdminComponent,
        canActivate: [adminGuard]
      },
      {
        path: 'dashboard/member',
        component: DashboardMemberComponent
      },
      {
        path: 'tasks',
        loadChildren: () => import('./features/task-management/task-management.routes').then(m => m.taskManagementRoutes)
      },
      {
        path: 'notifications',
        loadComponent: () => import('./components/notifications-list/notifications-list.component').then(m => m.NotificationsListComponent),
        canActivate: [authGuard]
      }
    ]
  },
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  { path: '**', redirectTo: '/login' }
];
