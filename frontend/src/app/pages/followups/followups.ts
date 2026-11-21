import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Api } from '../../core/api';
import { FollowUpItem, Meta, Paged, Vaccine } from '../../core/models';
import { errMsg, fail, ok, STATUS_LABEL } from '../../core/util';
import { Badge } from '../../shared/badge';
import { Pager } from '../../shared/pager';

@Component({
  selector: 'app-followups',
  imports: [FormsModule, RouterLink, Pager, Badge],
  template: `
    <div class="row spread mb">
      <div><h1>Follow-up list</h1><div class="muted">Active residents with a dose that is due or overdue.</div></div>
      <button type="button" class="btn no-print" (click)="print()">Print list</button>
    </div>
    <div class="print-only"><h2>HealthLink follow-up list ({{ statusLabel() }})</h2><div class="small">Printed {{ now }}</div></div>

    <div class="card no-print">
      <div class="row">
        <label class="grow">Search <input [(ngModel)]="f.q" (ngModelChange)="onType()" placeholder="Name or reference no." /></label>
        <label>Status
          <select [(ngModel)]="f.status" (ngModelChange)="load(1)">
            <option value="actionable">Due and overdue</option><option value="due">Due</option><option value="overdue">Overdue</option>
            <option value="upcoming">Upcoming</option><option value="all">All</option>
          </select>
        </label>
        <label>Vaccine
          <select [(ngModel)]="f.vaccine_id" (ngModelChange)="load(1)">
            <option value="">All</option>
            @for (v of vaccines(); track v.id) { <option [value]="v.id">{{ v.name }}</option> }
          </select>
        </label>
        <label>Age group
          <select [(ngModel)]="f.age_group" (ngModelChange)="load(1)">
            <option value="">All</option><option value="infant">Under 1 year</option><option value="toddler">1 to 4 years</option>
            <option value="child">5 to 17 years</option><option value="adult">18 and over</option>
          </select>
        </label>
        <label>Purok <input [(ngModel)]="f.purok" (ngModelChange)="onType()" /></label>
        <label>Sort by
          <select [(ngModel)]="f.sort" (ngModelChange)="load(1)">
            <option value="due_date">Date due</option><option value="days_overdue">Days overdue</option><option value="name">Name</option>
          </select>
        </label>
        <label>Rows
          <select [(ngModel)]="f.per_page" (ngModelChange)="load(1)"><option [ngValue]="10">10</option><option [ngValue]="25">25</option><option [ngValue]="200">All (up to 200)</option></select>
        </label>
      </div>
    </div>

    <div class="card">
      @if (error()) { <div class="alert error">{{ error() }}</div> }
      <div class="table-wrap">
        <table>
          <thead><tr><th>Resident</th><th>Purok</th><th>Contact</th><th>Vaccine</th><th>Due date</th><th>Status</th><th>Follow-up</th><th class="no-print"></th></tr></thead>
          <tbody>
            @for (i of rows(); track i.resident_id + '-' + i.vaccine_id) {
              <tr>
                <td><a [routerLink]="['/residents', i.resident_id]">{{ i.full_name }}</a><div class="muted small">{{ i.reference_no }}</div></td>
                <td>{{ i.purok || '-' }}</td><td>{{ i.contact_number || '-' }}</td>
                <td>{{ i.vaccine }} (dose {{ i.dose_number }}/{{ i.total_doses }})</td>
                <td>{{ i.due_date }}</td>
                <td><app-badge [value]="i.status" />@if (i.days_overdue > 0) { <div class="small muted">{{ i.days_overdue }} day(s) late</div> }</td>
                <td>@if (i.follow_up_status) { <app-badge [value]="i.follow_up_status" /> } @else { <span class="muted small">-</span> }</td>
                <td class="no-print">
                  <button type="button" class="btn sm" (click)="mark(i, 'contacted')">Contacted</button>
                  <button type="button" class="btn sm" (click)="mark(i, 'rescheduled')">Rescheduled</button>
                  <button type="button" class="btn sm" (click)="mark(i, 'completed')">Completed</button>
                </td>
              </tr>
            } @empty { <tr><td colspan="8" class="empty">{{ loading() ? 'Loading...' : 'Nobody to follow up with.' }}</td></tr> }
          </tbody>
        </table>
      </div>
      @if (meta(); as m) { <app-pager [meta]="m" (go)="load($event)" /> }
    </div>
  `,
})
export class FollowUps {
  private api = inject(Api);
  private route = inject(ActivatedRoute);

  now = new Date().toLocaleString();
  vaccines = signal<Vaccine[]>([]);
  rows = signal<FollowUpItem[]>([]);
  meta = signal<Meta | null>(null);
  loading = signal(false);
  error = signal('');
  f = { q: '', status: this.route.snapshot.queryParamMap.get('status') ?? 'actionable', vaccine_id: '', age_group: '', purok: '', sort: 'due_date', per_page: 10 };
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.api.get<{ data: Vaccine[] }>('/vaccines').subscribe((r) => this.vaccines.set(r.data));
    this.load(1);
  }

  statusLabel(): string { return this.f.status === 'actionable' ? 'Due and overdue' : (STATUS_LABEL[this.f.status] ?? 'All'); }
  print(): void { this.now = new Date().toLocaleString(); setTimeout(() => window.print(), 50); }

  onType(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(1), 300);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.get<Paged<FollowUpItem>>('/follow-ups', { ...this.f, page }).subscribe({
      next: (r) => { this.rows.set(r.data); this.meta.set(r.meta); this.loading.set(false); this.error.set(''); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  mark(i: FollowUpItem, status: 'contacted' | 'rescheduled' | 'completed'): void {
    this.api.post('/follow-ups', { resident_id: i.resident_id, vaccine_id: i.vaccine_id, dose_number: i.dose_number, status }).subscribe({
      next: () => { ok('Marked as ' + status + '.'); this.load(this.meta()?.current_page ?? 1); },
      error: (err) => fail(err),
    });
  }
}
