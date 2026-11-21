import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { Medicine } from '../../core/models';
import { errMsg } from '../../core/util';
import { Badge } from '../../shared/badge';

@Component({
  selector: 'app-portal-medicines',
  imports: [FormsModule, Badge],
  template: `
    <h1>Medicine availability</h1>
    <p class="muted mb">Check before you travel. Availability depends on the health center's latest stock count and does not guarantee release.</p>
    <div class="card"><label>Search <input [(ngModel)]="q" (ngModelChange)="onType()" placeholder="Medicine name" /></label></div>
    <div class="card">
      @if (error()) { <div class="alert error">{{ error() }}</div> }
      <div class="table-wrap"><table>
        <thead><tr><th>Medicine</th><th>Form / strength</th><th>Availability</th></tr></thead>
        <tbody>
          @for (x of rows(); track x.id) {
            <tr><td>{{ x.name }}<div class="muted small">{{ x.generic_name }}</div></td><td>{{ x.form_strength || '-' }}</td><td><app-badge [value]="x.status" /></td></tr>
          } @empty { <tr><td colspan="3" class="empty">{{ loading() ? 'Loading...' : 'No medicines found.' }}</td></tr> }
        </tbody>
      </table></div>
    </div>
  `,
})
export class PortalMedicines {
  private api = inject(Api);
  q = '';
  rows = signal<Medicine[]>([]);
  loading = signal(true);
  error = signal('');
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() { this.load(); }

  onType(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(), 300);
  }

  load(): void {
    this.api.get<{ data: Medicine[] }>('/portal/medicines', { q: this.q }).subscribe({
      next: (r) => { this.rows.set(r.data); this.loading.set(false); this.error.set(''); },
      error: (e) => { this.error.set(errMsg(e)); this.loading.set(false); },
    });
  }
}
