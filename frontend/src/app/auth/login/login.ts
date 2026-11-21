import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { errMsg } from '../../core/util';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  username = '';
  password = '';
  loading = signal(false);
  error = signal('');
  notice = signal(this.noticeFor(this.route.snapshot.queryParamMap.get('reason')));

  private noticeFor(reason: string | null): string {
    if (reason === 'idle') return 'You were logged out after a period of inactivity.';
    if (reason === 'expired') return 'Your session expired. Please log in again.';
    return '';
  }

  submit(): void {
    if (!this.username.trim() || !this.password) {
      this.error.set('Enter your username and password.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.auth.login(this.username.trim(), this.password).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.router.navigate([this.auth.homeFor(res.user.role)]);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(err?.status === 429 ? 'Too many attempts. Please wait a minute.' : errMsg(err));
      },
    });
  }
}
