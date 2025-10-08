import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardAdminComponent } from './components/dashboard-admin/dashboard-admin.component';
import { DashboardMemberComponent } from './components/dashboard-member/dashboard-member.component';
import { authGuard, adminGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { 
    path: 'login', 
    component: LoginComponent,
    canActivate: [guestGuard]
  },
  { 
    path: 'dashboard/admin', 
    component: DashboardAdminComponent,
    canActivate: [authGuard, adminGuard]
  },
  { 
    path: 'dashboard/member', 
    component: DashboardMemberComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'tasks', 
    loadChildren: () => import('./features/task-management/task-management.routes').then(m => m.taskManagementRoutes),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' }
];
