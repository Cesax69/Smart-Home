import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { DashboardAdminComponent } from './components/dashboard-admin/dashboard-admin.component';
import { DashboardMemberComponent } from './components/dashboard-member/dashboard-member.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { TaskCreateComponent } from './components/task-create/task-create.component';
import { TaskEditComponent } from './components/task-edit/task-edit.component';
import { MyTasksComponent } from './components/my-tasks/my-tasks.component';
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
    component: TaskListComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'tasks/create', 
    component: TaskCreateComponent,
    canActivate: [authGuard, adminGuard]
  },
  { 
    path: 'tasks/edit/:id', 
    component: TaskEditComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'my-tasks', 
    component: MyTasksComponent,
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '/login' }
];
