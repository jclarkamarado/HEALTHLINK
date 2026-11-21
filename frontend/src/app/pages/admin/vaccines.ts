import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Vaccine } from '../../core/models';
import { fail, ok } from '../../core/util';

@Component({
  selector: 'app-vaccines',
  imports: [FormsModule],
  template: `
    <div class="row spread mb">
      <div><h1>Vaccines and schedules</h1><div class="muted">The due and overdue flags are calculated from these rules, so keep them accurate.</div></div>
      <button type="button" class="btn primary" (click)="open(null)">+ Add vaccine</button>
    </div>

    @if (show()) {
      <form class="card" (ngSubmit)="save()">
        <h2>{{ editingId() ? 'Edit vaccine' : 'Add vaccine' }}</h2>
        <div class="form-grid">
          <label>Name * <input name="n" [(ngModel)]="v.name" required /></label>
          <label>Number of doses * <input name="d" type="number" min="1" max="10" [(ngModel)]="v.total_doses" /></label>
          <label>Minimum age for first dose (days) <input name="a" type="number" min="0" [(ngModel)]="v.first_dose_min_age_days" /></label>
          <label>Maximum age to start (days, optional) <input name="m" type="number" min="0" [(ngModel)]="v.max_age_days" /></label>
          <label>Interval after previous dose (days) <input name="i" type="number" min="0" [(ngModel)]="v.interval_days" /></label>
          <label>Grace period (days) <input name="g" type="number" min="0" [(ngModel)]="v.grace_days" /></label>
        </div>
        <div class="row mt"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" (click)="show.set(false)">Cancel</button></div>
      </form>
    }

    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Vaccine</th><th>Doses</th><th>Min age (days)</th><th>Max start age (days)</th><th>Interval (days)</th><th>Grace (days)</th><th></th></tr></thead>
      <tbody>
        @for (x of rows(); track x.id) {
          <tr><td>{{ x.name }}</td><td>{{ x.total_doses }}</td><td>{{ x.first_dose_min_age_days }}</td><td>{{ x.max_age_days ?? '-' }}</td><td>{{ x.interval_days }}</td><td>{{ x.grace_days }}</td>
            <td class="right"><button type="button" class="btn sm" (click)="open(x)">Edit</button></td></tr>
        } @empty { <tr><td colspan="7" class="empty">No vaccines yet.</td></tr> }
      </tbody>
    </table></div></div>
  `,
})
export class Vaccines {
  private api = inject(Api);
  rows = signal<Vaccine[]>([]);
  show = signal(false);
  editingId = signal<number | null>(null);
  v: any = this.blank();

  constructor() { this.load(); }

  private blank() { return { name: '', total_doses: 1, first_dose_min_age_days: 0, max_age_days: null, interval_days: 0, grace_days: 7 }; }
  load(): void { this.api.get<{ data: Vaccine[] }>('/vaccines').subscribe((r) => this.rows.set(r.data)); }

  open(x: Vaccine | null): void {
    this.editingId.set(x?.id ?? null);
    this.v = x ? { ...x } : this.blank();
    this.show.set(true);
  }

  save(): void {
    const id = this.editingId();
    const body = { ...this.v, max_age_days: this.v.max_age_days === '' ? null : this.v.max_age_days };
    (id ? this.api.put(`/vaccines/${id}`, body) : this.api.post('/vaccines', body)).subscribe({
      next: () => { ok('Vaccine saved.'); this.show.set(false); this.load(); },
      error: (err) => fail(err),
    });
  }
}
