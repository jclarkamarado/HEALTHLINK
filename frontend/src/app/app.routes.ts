import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards';

const staff = roleGuard('health_worker', 'admin');

export const routes: Routes = [
  // Public landing page
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./landing_page/landing.component').then((m) => m.LandingComponent),
  },

  { path: 'login', loadComponent: () => import('./auth/login/login').then((m) => m.Login) },

  // Protected app
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: 'dashboard', canActivate: [staff], loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.Dashboard) },
      { path: 'residents', canActivate: [staff], loadComponent: () => import('./pages/residents/resident-list').then((m) => m.ResidentList) },
      { path: 'residents/new', canActivate: [staff], loadComponent: () => import('./pages/residents/resident-form').then((m) => m.ResidentForm) },
      { path: 'residents/:id', canActivate: [staff], loadComponent: () => import('./pages/residents/resident-detail').then((m) => m.ResidentDetailPage) },
      { path: 'follow-ups', canActivate: [staff], loadComponent: () => import('./pages/followups/followups').then((m) => m.FollowUps) },
      { path: 'medicines', canActivate: [staff], loadComponent: () => import('./pages/medicines/medicines').then((m) => m.Medicines) },
      { path: 'admin/vaccines', canActivate: [roleGuard('admin')], loadComponent: () => import('./pages/admin/vaccines').then((m) => m.Vaccines) },
      { path: 'admin/users', canActivate: [roleGuard('admin')], loadComponent: () => import('./pages/admin/users').then((m) => m.Users) },
      { path: 'admin/logs', canActivate: [roleGuard('admin')], loadComponent: () => import('./pages/admin/logs').then((m) => m.Logs) },
      { path: 'portal', canActivate: [roleGuard('resident')], loadComponent: () => import('./pages/portal/portal').then((m) => m.Portal) },
      { path: 'portal/medicines', canActivate: [roleGuard('resident')], loadComponent: () => import('./pages/portal/portal-medicines').then((m) => m.PortalMedicines) },
    ],
  },

  { path: '**', redirectTo: '' },
];