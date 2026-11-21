import { Component, inject, signal } from '@angular/core';
import { Api } from '../../core/api';
import { ResidentDetail } from '../../core/models';
import { errMsg } from '../../core/util';
import { Badge } from '../../shared/badge';

@Component({
  selector: 'app-portal',
  imports: [Badge],
  template: `
    <div class="row spread mb">
      <div><h1>My vaccination record</h1><div class="muted">Read-only. Ask your health worker if something looks wrong.</div></div>
      <button type="button" class="btn no-print" (click)="print()">Print</button>
    </div>
    @if (error()) { <div class="alert error">{{ error() }}</div> }

    @if (d(); as d) {
      <div class="card">
        <h2>{{ d.resident.full_name }}</h2>
        <div class="kv">
          <div><div class="k">Reference no.</div><div class="v">{{ d.resident.reference_no }}</div></div>
          <div><div class="k">Birth date</div><div class="v">{{ d.resident.birth_date }}</div></div>
          <div><div class="k">Purok / Barangay</div><div class="v">{{ d.resident.purok || '-' }} / {{ d.resident.barangay || '-' }}</div></div>
        </div>
      </div>

      <div class="card">
        <h2>Upcoming doses</h2>
        @for (s of d.schedule; track s.vaccine_id) {
          @if (s.status === 'due' || s.status === 'overdue') {
            <div class="alert" [class.warn]="s.status === 'due'" [class.error]="s.status === 'overdue'">
              <b>{{ s.vaccine }}</b> dose {{ s.dose_number }}: {{ s.status === 'overdue' ? 'was due on' : 'due on' }} {{ s.due_date }}. Please visit your health center.
            </div>
          }
        }
        <div class="table-wrap"><table>
          <thead><tr><th>Vaccine</th><th>Dose</th><th>Due date</th><th>Status</th></tr></thead>
          <tbody>
            @for (s of d.schedule; track s.vaccine_id) {
              <tr><td>{{ s.vaccine }}</td><td>{{ s.dose_number }} of {{ s.total_doses }}</td><td>{{ s.due_date }}</td><td><app-badge [value]="s.status" /></td></tr>
            } @empty { <tr><td colspan="4" class="empty">No upcoming doses.</td></tr> }
          </tbody>
        </table></div>
      </div>

      <div class="card">
        <h2>Completed immunizations</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Vaccine</th><th>Dose</th><th>Batch</th></tr></thead>
          <tbody>
            @for (x of d.vaccinations; track x.id) {
              <tr><td>{{ x.date_given }}</td><td>{{ x.vaccine }}</td><td>{{ x.dose_number }}</td><td>{{ x.batch_number || '-' }}</td></tr>
            } @empty { <tr><td colspan="4" class="empty">No vaccinations recorded yet.</td></tr> }
          </tbody>
        </table></div>
      </div>
    }
  `,
})
export class Portal {
  private api = inject(Api);
  d = signal<ResidentDetail | null>(null);
  error = signal('');

  constructor() {
    this.api.get<ResidentDetail>('/portal/me').subscribe({
      next: (r) => this.d.set(r),
      error: (e) => this.error.set(errMsg(e)),
    });
  }

  print(): void { window.print(); }
}
