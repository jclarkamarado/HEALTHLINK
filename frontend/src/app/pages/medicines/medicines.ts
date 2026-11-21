import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Api } from '../../core/api';
import { Medicine, Meta, Paged } from '../../core/models';
import { errMsg, fail, ok } from '../../core/util';
import { Badge } from '../../shared/badge';
import { Pager } from '../../shared/pager';

interface Movement { id: number; type: string; quantity: number; reason: string | null; created_at: string; }

@Component({
  selector: 'app-medicines',
  imports: [FormsModule, Pager, Badge],
  template: `
    <div class="row spread mb">
      <div><h1>Medicine stock</h1><div class="muted">Keep quantities current so residents see accurate availability.</div></div>
      <button type="button" class="btn primary" (click)="openForm(null)">+ Add medicine</button>
    </div>

    <div class="card">
      <div class="row">
        <label class="grow">Search <input [(ngModel)]="q" (ngModelChange)="onType()" placeholder="Name or generic name" /></label>
        <label>Status
          <select [(ngModel)]="status" (ngModelChange)="load(1)">
            <option value="">All</option><option value="in_stock">In stock</option><option value="low_stock">Low stock</option>
            <option value="out_of_stock">Out of stock</option><option value="near_expiry">Near expiry (60 days)</option><option value="expired">Expired</option>
          </select>
        </label>
      </div>
    </div>

    @if (showForm()) {
      <form class="card" (ngSubmit)="saveMedicine()">
        <h2>{{ editingId() ? 'Edit medicine' : 'Add medicine' }}</h2>
        <div class="form-grid">
          <label>Name * <input name="name" [(ngModel)]="m.name" required /></label>
          <label>Generic name <input name="generic" [(ngModel)]="m.generic_name" /></label>
          <label>Form and strength <input name="form" [(ngModel)]="m.form_strength" placeholder="500 mg tablet" /></label>
          @if (!editingId()) { <label>Quantity * <input name="qty" type="number" min="0" [(ngModel)]="m.quantity" required /></label> }
          <label>Unit * <input name="unit" [(ngModel)]="m.unit" required /></label>
          <label>Reorder level * <input name="reorder" type="number" min="0" [(ngModel)]="m.reorder_level" required /></label>
          <label>Batch number <input name="batch" [(ngModel)]="m.batch_number" /></label>
          <label>Expiry date <input name="exp" type="date" [(ngModel)]="m.expiry_date" /></label>
        </div>
        <div class="row mt"><button class="btn primary" type="submit">Save</button><button class="btn" type="button" (click)="showForm.set(false)">Cancel</button></div>
      </form>
    }

    @if (adjusting(); as a) {
      <form class="card" (ngSubmit)="saveAdjust()">
        <h2>Stock movement: {{ a.name }} <span class="muted small">(now {{ a.quantity }} {{ a.unit }})</span></h2>
        <div class="row">
          <label>Type <select name="t" [(ngModel)]="adj.type"><option value="in">Stock in</option><option value="out">Stock out</option></select></label>
          <label>Quantity <input name="q" type="number" min="1" [(ngModel)]="adj.quantity" /></label>
          <label class="grow">Reason <input name="r" [(ngModel)]="adj.reason" placeholder="Delivery, released, damaged..." /></label>
          <button class="btn primary" type="submit">Save</button><button class="btn" type="button" (click)="adjusting.set(null)">Cancel</button>
        </div>
      </form>
    }

    @if (history(); as h) {
      <div class="card">
        <div class="row spread"><h2>Movement history: {{ h.name }}</h2><button class="btn sm" type="button" (click)="history.set(null)">Close</button></div>
        <table><thead><tr><th>When</th><th>Type</th><th>Quantity</th><th>Reason</th></tr></thead><tbody>
          @for (x of h.rows; track x.id) { <tr><td>{{ x.created_at }}</td><td>{{ x.type === 'in' ? 'Stock in' : 'Stock out' }}</td><td>{{ x.quantity }}</td><td>{{ x.reason || '-' }}</td></tr> }
          @empty { <tr><td colspan="4" class="empty">No movements yet.</td></tr> }
        </tbody></table>
      </div>
    }

    <div class="card">
      @if (error()) { <div class="alert error">{{ error() }}</div> }
      <div class="table-wrap"><table>
        <thead><tr><th>Medicine</th><th>Form / strength</th><th>Quantity</th><th>Status</th><th>Expiry</th><th>Batch</th><th></th></tr></thead>
        <tbody>
          @for (x of rows(); track x.id) {
            <tr>
              <td>{{ x.name }}<div class="muted small">{{ x.generic_name }}</div></td>
              <td>{{ x.form_strength || '-' }}</td>
              <td>{{ x.quantity }} {{ x.unit }}<div class="muted small">reorder at {{ x.reorder_level }}</div></td>
              <td><app-badge [value]="x.status" /></td>
              <td>
                {{ x.expiry_date || '-' }}
                @if (x.expired) { <div class="tag-danger small">Expired (hidden from residents)</div> }
                @else if (x.near_expiry) { <div class="tag-warn small">Near expiry</div> }
              </td>
              <td>{{ x.batch_number || '-' }}</td>
              <td class="right">
                <button type="button" class="btn sm" (click)="openAdjust(x)">Stock in/out</button>
                <button type="button" class="btn sm" (click)="openHistory(x)">History</button>
                <button type="button" class="btn sm" (click)="openForm(x)">Edit</button>
              </td>
            </tr>
          } @empty { <tr><td colspan="7" class="empty">{{ loading() ? 'Loading...' : 'No medicines found.' }}</td></tr> }
        </tbody>
      </table></div>
      @if (meta(); as mt) { <app-pager [meta]="mt" (go)="load($event)" /> }
    </div>
  `,
})
export class Medicines {
  private api = inject(Api);
  private route = inject(ActivatedRoute);

  q = '';
  status = this.route.snapshot.queryParamMap.get('status') ?? '';
  rows = signal<Medicine[]>([]);
  meta = signal<Meta | null>(null);
  loading = signal(false);
  error = signal('');
  showForm = signal(false);
  editingId = signal<number | null>(null);
  adjusting = signal<Medicine | null>(null);
  history = signal<{ name: string; rows: Movement[] } | null>(null);
  private timer: ReturnType<typeof setTimeout> | null = null;

  m: any = this.blank();
  adj = { type: 'in', quantity: 1, reason: '' };

  constructor() { this.load(1); }

  private blank() {
    return { name: '', generic_name: '', form_strength: '', quantity: 0, unit: 'pcs', reorder_level: 10, batch_number: '', expiry_date: '' };
  }

  onType(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(1), 300);
  }

  load(page: number): void {
    this.loading.set(true);
    this.api.get<Paged<Medicine>>('/medicines', { q: this.q, status: this.status, page, per_page: 10 }).subscribe({
      next: (r) => { this.rows.set(r.data); this.meta.set(r.meta); this.loading.set(false); this.error.set(''); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }

  openForm(x: Medicine | null): void {
    this.adjusting.set(null);
    this.editingId.set(x?.id ?? null);
    this.m = x
      ? { name: x.name, generic_name: x.generic_name ?? '', form_strength: x.form_strength ?? '', quantity: x.quantity ?? 0, unit: x.unit, reorder_level: x.reorder_level ?? 0, batch_number: x.batch_number ?? '', expiry_date: x.expiry_date ?? '' }
      : this.blank();
    this.showForm.set(true);
  }

  saveMedicine(): void {
    const id = this.editingId();
    const body = { ...this.m, expiry_date: this.m.expiry_date || null };
    const req = id ? this.api.put(`/medicines/${id}`, body) : this.api.post('/medicines', body);
    req.subscribe({
      next: () => { ok('Medicine saved.'); this.showForm.set(false); this.load(this.meta()?.current_page ?? 1); },
      error: (err) => fail(err),
    });
  }

  openAdjust(x: Medicine): void {
    this.showForm.set(false);
    this.adj = { type: 'in', quantity: 1, reason: '' };
    this.adjusting.set(x);
  }

  saveAdjust(): void {
    const a = this.adjusting();
    if (!a) return;
    this.api.post(`/medicines/${a.id}/stock`, this.adj).subscribe({
      next: () => { ok('Stock updated.'); this.adjusting.set(null); this.load(this.meta()?.current_page ?? 1); },
      error: (err) => fail(err),
    });
  }

  openHistory(x: Medicine): void {
    this.api.get<{ data: Movement[] }>(`/medicines/${x.id}/movements`).subscribe({
      next: (r) => this.history.set({ name: x.name, rows: r.data }),
      error: (err) => fail(err),
    });
  }
}
