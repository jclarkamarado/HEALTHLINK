import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem { path: string; label: string; }

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="layout">
      <aside class="sidebar no-print">
        <div class="brand">Health<span>Link</span></div>
        <nav>
          @for (item of nav(); track item.path) {
            <a [routerLink]="item.path" routerLinkActive="active">{{ item.label }}</a>
          }
        </nav>
        <div class="userbox">
          <div class="small">{{ auth.user()?.full_name }}</div>
          <div class="muted small">{{ roleLabel() }}</div>
          <button type="button" class="btn sm block" (click)="auth.logout()">Log out</button>
        </div>
      </aside>
      <main class="content"><router-outlet></router-outlet></main>
    </div>
  `,
})
export class Shell {
  auth = inject(AuthService);

  roleLabel = computed(() => {
    const r = this.auth.user()?.role;
    return r === 'admin' ? 'Administrator' : r === 'health_worker' ? 'Health Worker' : 'Resident';
  });

  nav = computed<NavItem[]>(() => {
    const role = this.auth.user()?.role;
    if (role === 'resident') {
      return [
        { path: '/portal', label: 'My Records' },
        { path: '/portal/medicines', label: 'Medicines' },
      ];
    }
    const items: NavItem[] = [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/residents', label: 'Residents' },
      { path: '/follow-ups', label: 'Follow-Up List' },
      { path: '/medicines', label: 'Medicines' },
    ];
    if (role === 'admin') {
      items.push(
        { path: '/admin/vaccines', label: 'Vaccines' },
        { path: '/admin/users', label: 'Health Workers' },
        { path: '/admin/logs', label: 'Activity Log' }
      );
    }
    return items;
  });
}
