import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Api } from '../../core/api';
import { AuthService } from '../../core/auth.service';
import { User } from '../../core/models';
import { fail, ok } from '../../core/util';

@Component({
  selector: 'app-users',
  imports: [FormsModule],
  template: `
    <div class="row spread mb">
      <div><h1>Health worker accounts</h1><div class="muted">Create accounts and deactivate people who should no longer have access.</div></div>
      <button type="button" class="btn primary" (click)="show.set(!show())">+ New health worker</button>
    </div>

    @if (show()) {
      <form class="card" (ngSubmit)="save()">
        <div class="form-grid">
          <label>First name * <input name="f" [(ngModel)]="u.first_name" required /></label>
          <label>Middle name <input name="m" [(ngModel)]="u.middle_name" /></label>
          <label>Last name * <input name="l" [(ngModel)]="u.last_name" required /></label>
          <label>Username * <input name="un" [(ngModel)]="u.username" required autocomplete="off" /></label>
          <label>Email <input name="e" type="email" [(ngModel)]="u.email" /></label>
          <label>Password * (min 8) <input name="p" type="password" [(ngModel)]="u.password" autocomplete="new-password" /></label>
          <label>Confirm password * <input name="pc" type="password" [(ngModel)]="u.password_confirmation" autocomplete="new-password" /></label>
        </div>
        <div class="row mt"><button class="btn primary" type="submit">Create account</button></div>
      </form>
    }

    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th></th></tr></thead>
      <tbody>
        @for (x of rows(); track x.id) {
          <tr>
            <td>{{ x.full_name }}</td><td>{{ x.username }}</td><td>{{ x.role === 'admin' ? 'Administrator' : 'Health Worker' }}</td>
            <td><span class="badge" [class.st-active]="x.is_active" [class.st-overdue]="!x.is_active">{{ x.is_active ? 'Active' : 'Deactivated' }}</span></td>
            <td class="right">
              @if (x.id !== me()?.id) {
                <button type="button" class="btn sm" [class.danger]="x.is_active" (click)="toggle(x)">{{ x.is_active ? 'Deactivate' : 'Reactivate' }}</button>
              }
            </td>
          </tr>
        }
      </tbody>
    </table></div></div>
  `,
})
export class Users {
  private api = inject(Api);
  me = inject(AuthService).user;
  rows = signal<User[]>([]);
  show = signal(false);
  u = { first_name: '', middle_name: '', last_name: '', username: '', email: '', password: '', password_confirmation: '' };

  constructor() { this.load(); }
  load(): void { this.api.get<{ data: User[] }>('/users').subscribe((r) => this.rows.set(r.data)); }

  save(): void {
    const body = { ...this.u, email: this.u.email || null, middle_name: this.u.middle_name || null };
    this.api.post('/users', body).subscribe({
      next: () => {
        ok('Account created.'); this.show.set(false); this.load();
        this.u = { first_name: '', middle_name: '', last_name: '', username: '', email: '', password: '', password_confirmation: '' };
      },
      error: (err) => fail(err),
    });
  }

  toggle(x: User): void {
    this.api.patch(`/users/${x.id}/active`, { is_active: !x.is_active }).subscribe({
      next: () => { ok('Account updated.'); this.load(); },
      error: (err) => fail(err),
    });
  }
}
