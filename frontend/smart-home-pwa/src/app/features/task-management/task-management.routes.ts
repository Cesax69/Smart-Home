import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const taskManagementRoutes: Routes = [
  {
    path: '',
    redirectTo: 'list',
    pathMatch: 'full'
  },
  {
    path: 'list',
    loadComponent: () => import('./components/shared/task-list/task-list.component').then(m => m.TaskListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'my-tasks',
    loadComponent: () => import('./components/member/my-tasks/my-tasks.component').then(m => m.MyTasksComponent),
    canActivate: [authGuard]
  },
  {
    path: 'create',
    loadComponent: () => import('./components/admin/task-create/task-create.component').then(m => m.TaskCreateComponent),
    canActivate: [authGuard]
  },
  {
    path: 'edit/:id',
    loadComponent: () => import('./components/admin/task-edit/task-edit.component').then(m => m.AdminTaskEditComponent),
    canActivate: [authGuard]
  }
];