import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { Api } from '../../core/api';
import { Resident } from '../../core/models';
import { errMsg, esc, todayISO } from '../../core/util';

@Component({
  selector: 'app-resident-form',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="row spread mb">
      <div><h1>Register resident</h1><div class="muted">Search existing residents first. Residents cannot register themselves.</div></div>
      <a class="btn" routerLink="/residents">Back to list</a>
    </div>

    <form class="card" (ngSubmit)="save(false)">
      @if (error()) { <div class="alert error">{{ error() }}</div> }

      <h2>Personal details</h2>
      <div class="form-grid">
        <label>First name * <input name="first_name" [(ngModel)]="f.first_name" required maxlength="255" /></label>
        <label>Middle name <input name="middle_name" [(ngModel)]="f.middle_name" maxlength="255" /></label>
        <label>Last name * <input name="last_name" [(ngModel)]="f.last_name" required maxlength="255" /></label>
        <label>Birth date * <input name="birth_date" type="date" [(ngModel)]="f.birth_date" [max]="today" required /></label>
        <label>Sex *
          <select name="sex" [(ngModel)]="f.sex" required><option value="">Select</option><option value="male">Male</option><option value="female">Female</option></select>
        </label>
        <label>Contact number <input name="contact_number" [(ngModel)]="f.contact_number" maxlength="50" /></label>
        <label class="check span2"><input name="est" type="checkbox" [(ngModel)]="f.birth_date_estimated" /> Birth date is an estimate</label>
      </div>

      <h2 class="mt">Address</h2>
      <div class="form-grid">
        <label class="span2">Street / house <input name="address" [(ngModel)]="f.address" maxlength="255" /></label>
        <label>Purok <input name="purok" [(ngModel)]="f.purok" maxlength="100" /></label>
        <label>Barangay <input name="barangay" [(ngModel)]="f.barangay" maxlength="100" /></label>
      </div>

      <h2 class="mt">Identity and consent</h2>
      <div class="form-grid">
        <label class="check span2"><input name="idc" type="checkbox" [(ngModel)]="f.identity_checked" /> I checked this person's identity *</label>
        <label>Consent given by * <input name="consent_by" [(ngModel)]="f.consent_by" placeholder="Resident or guardian name" required /></label>
        <label class="check"><input name="consent" type="checkbox" [(ngModel)]="f.consent_given" /> Privacy notice shown and consent given *</label>
      </div>

      <div class="row mt">
        <button class="btn primary" type="submit" [disabled]="saving()">{{ saving() ? 'Saving...' : 'Register resident' }}</button>
        <a class="btn" routerLink="/residents">Cancel</a>
      </div>
    </form>
  `,
})
export class ResidentForm {
  private api = inject(Api);
  private router = inject(Router);

  today = todayISO();
  saving = signal(false);
  error = signal('');
  f = {
    first_name: '', middle_name: '', last_name: '', birth_date: '', sex: '',
    contact_number: '', address: '', purok: '', barangay: '',
    birth_date_estimated: false, identity_checked: false, consent_given: false, consent_by: '',
  };

  save(confirmNew: boolean): void {
    this.error.set('');
    if (!this.f.first_name.trim() || !this.f.last_name.trim() || !this.f.birth_date || !this.f.sex) {
      this.error.set('Please fill in first name, last name, birth date, and sex.');
      return;
    }
    if (!this.f.identity_checked || !this.f.consent_given || !this.f.consent_by.trim()) {
      this.error.set('Identity check, consent, and the name of the person who agreed are required.');
      return;
    }

    this.saving.set(true);
    this.api.post<{ resident: Resident }>('/residents', { ...this.f, confirm_new: confirmNew }).subscribe({
      next: (r) => {
        this.saving.set(false);
        Swal.fire({ icon: 'success', title: 'Resident registered', html: `Reference number: <b>${esc(r.resident.reference_no)}</b>` });
        this.router.navigate(['/residents', r.resident.id]);
      },
      error: async (err) => {
        this.saving.set(false);
        if (err?.status === 409) {
          const list = (err.error.possible_matches as Resident[])
            .map((m) => `<li>${esc(m.full_name)}, born ${esc(m.birth_date)} (${esc(m.reference_no)})</li>`).join('');
          const res = await Swal.fire({
            icon: 'warning', title: 'Possible duplicate',
            html: `<div style="text-align:left">Existing residents that look similar:<ul>${list}</ul>Is this a different person?</div>`,
            showCancelButton: true, confirmButtonText: 'Different person, register', cancelButtonText: 'Same person, cancel',
          });
          if (res.isConfirmed) this.save(true);
          return;
        }
        this.error.set(errMsg(err));
      },
    });
  }
}
