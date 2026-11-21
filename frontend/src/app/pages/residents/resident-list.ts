import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { Meta, Paged, Resident } from '../../core/models';
import { errMsg } from '../../core/util';
import { Badge } from '../../shared/badge';
import { Pager } from '../../shared/pager';

@Component({
  selector: 'app-resident-list',
  imports: [FormsModule, RouterLink, Pager, Badge],
  template: `
    <div class="row spread mb">
      <div><h1>Residents</h1><div class="muted">Search before registering to avoid duplicates.</div></div>
      <a class="btn primary" routerLink="/residents/new">+ Register resident</a>
    </div>

    <div class="card">
      <div class="row">
        <label class="grow">Search name or reference number
          <input [(ngModel)]="q" (ngModelChange)="onType()" placeholder="e.g. Santos or HL-2026-K7Q4" />
        </label>
        <label>Status
          <select [(ngModel)]="status" (ngModelChange)="load(1)">
            <option value="">All</option><option value="active">Active</option><option value="transferred">Transferred</option>
            <option value="inactive">Inactive</option><option value="deceased">Deceased</option>
          </select>
        </label>
        <label>Purok <input [(ngModel)]="purok" (ngModelChange)="onType()" placeholder="e.g. Purok 1" /></label>
      </div>
    </div>

    <div class="card">
      @if (error()) { <div class="alert error">{{ error() }}</div> }
      <div class="table-wrap">
        <table>
          <thead><tr><th>Reference</th><th>Name</th><th>Birth date</th><th>Sex</th><th>Purok</th><th>Status</th><th></th></tr></thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td>{{ r.reference_no }}</td>
                <td><a [routerLink]="['/residents', r.id]">{{ r.full_name }}</a></td>
                <td>{{ r.birth_date }}@if (r.birth_date_estimated) { <span class="muted small"> (est.)</span> }</td>
                <td>{{ r.sex }}</td><td>{{ r.purok }}</td>
                <td><app-badge [value]="r.status" /></td>
                <td class="right"><a class="btn sm" [routerLink]="['/residents', r.id]">Open</a></td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="empty">{{ loading() ? 'Loading...' : 'No residents found.' }}</td></tr>
            }
          </tbody>
        </table>
      </div>
      @if (meta(); as m) { <app-pager [meta]="m" (go)="load($event)" /> }
    </div>
  `,
})
export class ResidentList {
  private api = inject(Api);
  q = ''; status = ''; purok = '';
  rows = signal<Resident[]>([]);
  meta = signal<Meta | null>(null);
  loading = signal(false);
  error = signal('');
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() { this.load(1); }

  onType(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(1), 300);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.get<Paged<Resident>>('/residents', { q: this.q, status: this.status, purok: this.purok, page, per_page: 10 }).subscribe({
      next: (r) => { this.rows.set(r.data); this.meta.set(r.meta); this.loading.set(false); this.error.set(''); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
