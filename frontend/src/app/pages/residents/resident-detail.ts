import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { Resident, ResidentDetail, Vaccine } from '../../core/models';
import { askText, fail, ok, todayISO } from '../../core/util';
import { Badge } from '../../shared/badge';

@Component({
  selector: 'app-resident-detail',
  imports: [FormsModule, RouterLink, Badge],
  template: `
    @if (loading()) { <div class="muted">Loading...</div> }
    @if (error()) { <div class="alert error">{{ error() }}</div> }

    @if (d(); as d) {
      <div class="row spread mb no-print">
        <a routerLink="/residents">&larr; Back to residents</a>
        <button type="button" class="btn" (click)="print()">Print schedule</button>
      </div>

      <div class="card">
        <div class="row spread">
          <div>
            <h1>{{ d.resident.full_name }}</h1>
            <div class="muted">Reference no. <b>{{ d.resident.reference_no }}</b></div>
          </div>
          <app-badge [value]="d.resident.status" />
        </div>
        <div class="kv mt">
          <div><div class="k">Birth date</div><div class="v">{{ d.resident.birth_date }}@if (d.resident.birth_date_estimated) { (estimated) }</div></div>
          <div><div class="k">Sex</div><div class="v">{{ d.resident.sex }}</div></div>
          <div><div class="k">Contact</div><div class="v">{{ d.resident.contact_number || '-' }}</div></div>
          <div><div class="k">Address</div><div class="v">{{ d.resident.address || '-' }}</div></div>
          <div><div class="k">Purok / Barangay</div><div class="v">{{ d.resident.purok || '-' }} / {{ d.resident.barangay || '-' }}</div></div>
          <div><div class="k">Portal account</div><div class="v">{{ d.resident.has_portal_account ? 'Yes' : 'No' }}</div></div>
        </div>
        <div class="row mt no-print">
          <button type="button" class="btn sm" (click)="startEdit(d.resident)">Edit details</button>
          <label>Status
            <select [ngModel]="d.resident.status" (ngModelChange)="changeStatus($event)" name="status">
              <option value="active">Active</option><option value="transferred">Transferred</option>
              <option value="inactive">Inactive</option><option value="deceased">Deceased</option>
            </select>
          </label>
          <button type="button" class="btn sm" (click)="portal(d.resident)">
            {{ d.resident.has_portal_account ? 'Reset portal password' : 'Create portal account' }}
          </button>
        </div>
      </div>

      @if (editing()) {
        <form class="card no-print" (ngSubmit)="saveEdit()">
          <h2>Edit details</h2>
          <div class="form-grid">
            <label>First name <input name="e1" [(ngModel)]="e.first_name" /></label>
            <label>Middle name <input name="e2" [(ngModel)]="e.middle_name" /></label>
            <label>Last name <input name="e3" [(ngModel)]="e.last_name" /></label>
            <label>Birth date <input name="e4" type="date" [(ngModel)]="e.birth_date" [max]="today" /></label>
            <label>Contact <input name="e5" [(ngModel)]="e.contact_number" /></label>
            <label>Address <input name="e6" [(ngModel)]="e.address" /></label>
            <label>Purok <input name="e7" [(ngModel)]="e.purok" /></label>
            <label>Barangay <input name="e8" [(ngModel)]="e.barangay" /></label>
          </div>
          <div class="alert warn mt">Changing the birth date recomputes the dose schedule and is recorded in the activity log.</div>
          <div class="row"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" (click)="editing.set(false)">Cancel</button></div>
        </form>
      }

      <div class="card">
        <h2>Next doses</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Vaccine</th><th>Dose</th><th>Due date</th><th>Status</th></tr></thead>
          <tbody>
            @for (s of d.schedule; track s.vaccine_id) {
              <tr>
                <td>{{ s.vaccine }}</td><td>{{ s.dose_number }} of {{ s.total_doses }}</td><td>{{ s.due_date }}</td>
                <td><app-badge [value]="s.status" />@if (s.days_overdue > 0) { <span class="muted small"> {{ s.days_overdue }} day(s) past due date</span> }</td>
              </tr>
            } @empty {
              <tr><td colspan="4" class="empty">{{ d.resident.status === 'active' ? 'No pending doses.' : 'Not shown for non-active residents.' }}</td></tr>
            }
          </tbody>
        </table></div>
      </div>

      @if (d.resident.status === 'active') {
        <form class="card no-print" (ngSubmit)="record()">
          <h2>Record a vaccination</h2>
          <div class="row">
            <label>Vaccine
              <select name="vaccine" [(ngModel)]="v.vaccine_id">
                <option [ngValue]="null">Select vaccine</option>
                @for (x of vaccines(); track x.id) { <option [ngValue]="x.id">{{ x.name }}</option> }
              </select>
            </label>
            <label>Date given <input name="date" type="date" [(ngModel)]="v.date_given" [max]="today" /></label>
            <label>Batch / lot no. <input name="batch" [(ngModel)]="v.batch_number" /></label>
            <button class="btn primary" type="submit" [disabled]="saving()">Save dose</button>
          </div>
          <div class="muted small mt">The dose number is assigned automatically and the next due date is calculated from this date.</div>
        </form>
      }

      <div class="card">
        <h2>Vaccination history</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>Date</th><th>Vaccine</th><th>Dose</th><th>Batch</th><th>Given by</th><th class="no-print"></th></tr></thead>
          <tbody>
            @for (x of d.vaccinations; track x.id) {
              <tr [class.voided]="x.voided">
                <td>{{ x.date_given }}</td><td>{{ x.vaccine }}</td><td>{{ x.dose_number }}</td><td>{{ x.batch_number || '-' }}</td><td>{{ x.given_by || '-' }}</td>
                <td class="no-print right">
                  @if (x.voided) { <span class="muted small">Voided: {{ x.void_reason }}</span> }
                  @else { <button type="button" class="btn sm danger" (click)="voidRecord(x.id)">Void</button> }
                </td>
              </tr>
            } @empty { <tr><td colspan="6" class="empty">No vaccinations recorded yet.</td></tr> }
          </tbody>
        </table></div>
      </div>
    }
  `,
})
export class ResidentDetailPage {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  auth = inject(AuthService);

  id = Number(this.route.snapshot.paramMap.get('id'));
  today = todayISO();
  d = signal<ResidentDetail | null>(null);
  vaccines = signal<Vaccine[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal('');
  editing = signal(false);
  v: { vaccine_id: number | null; date_given: string; batch_number: string } = { vaccine_id: null, date_given: todayISO(), batch_number: '' };
  e = { first_name: '', middle_name: '', last_name: '', birth_date: '', contact_number: '', address: '', purok: '', barangay: '' };

  constructor() {
    this.reload();
    this.api.get<{ data: Vaccine[] }>('/vaccines').subscribe((r) => this.vaccines.set(r.data));
  }

  reload(): void {
    this.api.get<ResidentDetail>(`/residents/${this.id}`).subscribe({
      next: (r) => { this.d.set(r); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.error.set(err?.status === 404 ? 'Resident not found.' : 'Could not load this resident.'); },
    });
  }

  print(): void { window.print(); }

  startEdit(r: Resident): void {
    this.e = {
      first_name: r.first_name, middle_name: r.middle_name ?? '', last_name: r.last_name, birth_date: r.birth_date,
      contact_number: r.contact_number ?? '', address: r.address ?? '', purok: r.purok ?? '', barangay: r.barangay ?? '',
    };
    this.editing.set(true);
  }

  saveEdit(): void {
    this.api.put(`/residents/${this.id}`, this.e).subscribe({
      next: () => { ok('Details updated.'); this.editing.set(false); this.reload(); },
      error: (err) => fail(err),
    });
  }

  changeStatus(status: string): void {
    this.api.put(`/residents/${this.id}`, { status }).subscribe({
      next: () => { ok('Status updated.'); this.reload(); },
      error: (err) => { fail(err); this.reload(); },
    });
  }

  record(): void {
    if (!this.v.vaccine_id || !this.v.date_given) { Swal.fire({ icon: 'warning', title: 'Select a vaccine and a date.' }); return; }
    this.saving.set(true);
    this.api.post(`/residents/${this.id}/vaccinations`, this.v).subscribe({
      next: () => { this.saving.set(false); ok('Vaccination recorded.'); this.v = { vaccine_id: null, date_given: todayISO(), batch_number: '' }; this.reload(); },
      error: (err) => { this.saving.set(false); fail(err); },
    });
  }

  async voidRecord(id: number): Promise<void> {
    const reason = await askText('Void this record?', 'Reason (required). The record is kept, not deleted.');
    if (!reason) return;
    this.api.post(`/vaccinations/${id}/void`, { reason }).subscribe({
      next: () => { ok('Record voided.'); this.reload(); },
      error: (err) => fail(err),
    });
  }

  async portal(r: Resident): Promise<void> {
    const res = await Swal.fire({
      title: r.has_portal_account ? 'Reset portal password' : 'Create portal account',
      html: `After verifying the person's identity, set a temporary password.<br><small>Login username: <b>${r.reference_no}</b></small>`,
      input: 'password', inputPlaceholder: 'At least 8 characters', showCancelButton: true,
      inputValidator: (v) => (v && v.length >= 8 ? null : 'At least 8 characters.'),
    });
    if (!res.isConfirmed) return;
    this.api.post(`/residents/${this.id}/portal-account`, { password: res.value }).subscribe({
      next: () => { ok('Portal account saved.'); this.reload(); },
      error: (err) => fail(err),
    });
  }
}
