import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { DashboardStats } from '../../core/models';
import { errMsg } from '../../core/util';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <h1>Dashboard</h1>
    <p class="muted mb">Who needs follow-up today, and what is running low.</p>

    @if (error()) { <div class="alert error">{{ error() }}</div> }
    @if (loading()) { <div class="muted">Loading...</div> }

    @if (s(); as s) {
      <div class="stats">
        <a class="stat danger" routerLink="/follow-ups" [queryParams]="{ status: 'overdue' }">
          <div class="muted small">Overdue residents</div><div class="num">{{ s.overdue_residents }}</div>
          <div class="small muted">{{ s.overdue_doses }} overdue dose(s)</div>
        </a>
        <a class="stat warn" routerLink="/follow-ups" [queryParams]="{ status: 'due' }">
          <div class="muted small">Due residents</div><div class="num">{{ s.due_residents }}</div>
          <div class="small muted">{{ s.due_doses }} due dose(s)</div>
        </a>
        <a class="stat" routerLink="/residents">
          <div class="muted small">Active residents</div><div class="num">{{ s.residents_active }}</div>
          <div class="small muted">{{ s.residents_total }} registered in total</div>
        </a>
        <div class="stat info">
          <div class="muted small">Vaccinations recorded</div><div class="num">{{ s.vaccinations_total }}</div>
        </div>
      </div>

      <h2>Medicine alerts</h2>
      <div class="stats">
        <a class="stat warn" routerLink="/medicines" [queryParams]="{ status: 'low_stock' }"><div class="muted small">Low or out of stock</div><div class="num">{{ s.low_stock }}</div></a>
        <a class="stat warn" routerLink="/medicines" [queryParams]="{ status: 'near_expiry' }"><div class="muted small">Near expiry (60 days)</div><div class="num">{{ s.near_expiry }}</div></a>
        <a class="stat danger" routerLink="/medicines" [queryParams]="{ status: 'expired' }"><div class="muted small">Expired</div><div class="num">{{ s.expired }}</div></a>
      </div>
    }
  `,
})
export class Dashboard {
  private api = inject(Api);
  s = signal<DashboardStats | null>(null);
  loading = signal(true);
  error = signal('');

  constructor() {
    this.api.get<DashboardStats>('/dashboard').subscribe({
      next: (r) => { this.s.set(r); this.loading.set(false); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
