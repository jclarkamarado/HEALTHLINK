import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Api } from './api';
import { Role, User } from './models';

interface LoginResponse { token: string; expires_in_minutes: number; user: User; }

const TOKEN_KEY = 'hl_token';
const USER_KEY = 'hl_user';
const IDLE_MS = 15 * 60 * 1000; // automatic logout after 15 minutes of inactivity

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(Api);
  private router = inject(Router);

  readonly user = signal<User | null>(this.readUser());
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private listening = false;

  constructor() {
    if (this.user()) this.startIdleWatch();
  }

  private readUser(): User | null {
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw && sessionStorage.getItem(TOKEN_KEY) ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  token(): string | null {
    try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
  }

  isLoggedIn(): boolean { return !!this.token() && !!this.user(); }

  homeFor(role: Role | undefined): string {
    return role === 'resident' ? '/portal' : '/dashboard';
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.api.post<LoginResponse>('/login', { username, password }).pipe(
      tap((res) => {
        sessionStorage.setItem(TOKEN_KEY, res.token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(res.user));
        this.user.set(res.user);
        this.startIdleWatch();
      })
    );
  }

  logout(callApi = true, reason?: string): void {
    if (callApi && this.token()) {
      this.api.post('/logout').subscribe({ error: () => {} });
    }
    this.clear();
    this.router.navigate(['/login'], reason ? { queryParams: { reason } } : {});
  }

  private clear(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch {}
    this.user.set(null);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  private startIdleWatch(): void {
    const reset = () => {
      if (!this.user()) return;
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.idleTimer = setTimeout(() => this.logout(true, 'idle'), IDLE_MS);
    };
    if (!this.listening) {
      this.listening = true;
      ['click', 'keydown', 'mousemove', 'touchstart'].forEach((e) =>
        window.addEventListener(e, reset, { passive: true })
      );
    }
    reset();
  }

  /** Called by the interceptor when the API says the token is no longer valid. */
  sessionExpired(): void {
    if (this.user()) this.logout(false, 'expired');
  }
}
