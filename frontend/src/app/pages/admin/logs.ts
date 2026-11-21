import { Component, inject, signal } from '@angular/core';
import { Api } from '../../core/api';
import { LogRow, Meta, Paged } from '../../core/models';
import { errMsg } from '../../core/util';
import { Pager } from '../../shared/pager';

@Component({
  selector: 'app-logs',
  imports: [Pager],
  template: `
    <h1>Activity log</h1>
    <p class="muted mb">Who viewed, added, or changed a record, and when.</p>
    <div class="card">
      @if (error()) { <div class="alert error">{{ error() }}</div> }
      <div class="table-wrap"><table>
        <thead><tr><th>When</th><th>User</th><th>Action</th><th>Record</th><th>Details</th><th>IP</th></tr></thead>
        <tbody>
          @for (l of rows(); track l.id) {
            <tr><td>{{ l.created_at }}</td><td>{{ l.user }}</td><td>{{ l.action }}</td><td>{{ l.subject || '-' }}</td><td>{{ l.description || '-' }}</td><td>{{ l.ip_address }}</td></tr>
          } @empty { <tr><td colspan="6" class="empty">No activity yet.</td></tr> }
        </tbody>
      </table></div>
      @if (meta(); as m) { <app-pager [meta]="m" (go)="load($event)" /> }
    </div>
  `,
})
export class Logs {
  private api = inject(Api);
  rows = signal<LogRow[]>([]);
  meta = signal<Meta | null>(null);
  error = signal('');

  constructor() { this.load(1); }

  load(page: number): void {
    this.api.get<Paged<LogRow>>('/activity-logs', { page, per_page: 20 }).subscribe({
      next: (r) => { this.rows.set(r.data); this.meta.set(r.meta); },
      error: (e) => this.error.set(errMsg(e)),
    });
  }
}
