import { Component, ElementRef, AfterViewInit, OnDestroy, NgZone } from '@angular/core';
import { RouterLink } from '@angular/router';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements AfterViewInit, OnDestroy {
  menuOpen = false;
  openFaq = 0;
  year = new Date().getFullYear();

  steps = [
    { icon: '📝', title: 'Register', text: 'A health worker registers the resident and links guardians for children.' },
    { icon: '💉', title: 'Record', text: 'Every vaccine dose is logged with date, batch and administering worker.' },
    { icon: '⏰', title: 'Schedule', text: 'Next doses are scheduled automatically and flagged when due or overdue.' },
    { icon: '📱', title: 'Follow up', text: 'Residents check records in the portal; workers print follow-up lists.' },
  ];

  stats = [
    { n: 3, suffix: '', label: 'User roles' },
    { n: 4, suffix: '', label: 'Simple steps' },
    { n: 0, suffix: '', label: 'Records deleted' },
    { n: 24, suffix: '/7', label: 'Portal access' },
  ];

  faqs = [
    { q: 'Can residents sign up on their own?', a: 'No. A health worker registers the resident and issues a one-time activation code, so every account is tied to a real record.' },
    { q: 'Are vaccination records ever deleted?', a: 'No. Records are voided, not deleted, so the history and the activity log always stay intact.' },
    { q: 'Who can see what?', a: 'Health workers and administrators manage records, medicines and follow-ups. Residents only see their own records in the portal.' },
    { q: 'How do we know who is due for a dose?', a: 'The system checks daily and flags next doses as due or overdue. Health workers can print a follow-up list.' },
  ];

  private words = ['Vaccination records', 'Medicine stock', 'Follow-up lists', 'Resident portal', 'Activity log'];
  marquee = [...this.words, ...this.words, ...this.words, ...this.words];

  private ctx?: gsap.Context;
  private cleanups: Array<() => void> = [];
  private introDone = false;

  constructor(private host: ElementRef<HTMLElement>, private zone: NgZone) {}

  ngAfterViewInit() {
    this.zone.runOutsideAngular(() => {
      // Failsafe: never leave the user stuck on the loader.
      const t = setTimeout(() => { if (!this.introDone) this.forceShow(); }, 5000);
      this.cleanups.push(() => clearTimeout(t));
      try {
        this.initAnimations();
      } catch (err) {
        console.error('Landing animation error:', err);
        this.forceShow();
      }
    });
  }

  ngOnDestroy() {
    this.cleanups.forEach((fn) => fn());
    this.ctx?.revert();
    document.body.style.overflow = '';
  }

  private forceShow() {
    const root = this.host.nativeElement;
    const pre = root.querySelector('.preloader') as HTMLElement | null;
    if (pre) pre.style.display = 'none';
    document.body.style.overflow = '';
    gsap.set(root.querySelectorAll('.nav, .pill, .hero .line, .hero-sub, .cta .btn, .scroll-hint, .mock, .mock-row, .float-chip'), { clearProps: 'all' });
  }

  scrollTo(id: string) {
    this.menuOpen = false;
    gsap.to(window, { scrollTo: { y: '#' + id, offsetY: 90 }, duration: 1.2, ease: 'power3.inOut' });
  }

  private on(el: EventTarget, evt: string, fn: (e: any) => void) {
    el.addEventListener(evt, fn);
    this.cleanups.push(() => el.removeEventListener(evt, fn));
  }

  private initAnimations() {
    const root = this.host.nativeElement;
    const q = (s: string) => root.querySelectorAll<HTMLElement>(s);

    this.ctx = gsap.context(() => {
      const mm = gsap.matchMedia(root);

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('.preloader', { display: 'none' });
        q('.count').forEach((el) => (el.textContent = el.dataset['count'] ?? '0'));
        q('.count-ring').forEach((el) => (el.textContent = '87'));
        gsap.set('.ring-fg', { strokeDashoffset: 13 });
      });

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        /* ---------- preloader + hero intro ---------- */
        document.body.style.overflow = 'hidden';
        gsap.set('.pre-fill', { scaleX: 0, transformOrigin: 'left center' });
        const intro = gsap.timeline({
          defaults: { ease: 'power4.out' },
          onComplete: () => { this.introDone = true; document.body.style.overflow = ''; },
        });
        intro
          .from('.pre-logo', { opacity: 0, scale: 0.7, duration: 0.6 })
          .to('.pre-fill', { scaleX: 1, duration: 0.9, ease: 'power2.inOut' })
          .to('.preloader', { yPercent: -100, duration: 0.9, ease: 'power4.inOut' })
          .from('.nav', { yPercent: -150, opacity: 0, duration: 0.8 }, '-=0.3')
          .from('.pill', { y: 20, opacity: 0, duration: 0.6 }, '-=0.5')
          .from('.hero .line', { yPercent: 115, rotate: 4, duration: 1.1, stagger: 0.12 }, '-=0.5')
          .from('.hero-sub', { y: 30, opacity: 0, duration: 0.8 }, '-=0.7')
          .from('.cta .btn', { y: 30, opacity: 0, stagger: 0.1, duration: 0.7 }, '-=0.6')
          .from('.mock', { y: 80, opacity: 0, rotateY: -18, rotateX: 8, transformPerspective: 1200, duration: 1.2 }, '-=1')
          .from('.mock-row', { x: 40, opacity: 0, stagger: 0.12, duration: 0.7 }, '-=0.6')
          .fromTo('.ring-fg', { strokeDashoffset: 100 }, { strokeDashoffset: 13, duration: 1.6, ease: 'power3.out' }, '-=0.8')
          .from('.float-chip', { scale: 0, opacity: 0, stagger: 0.15, duration: 0.7, ease: 'back.out(2)' }, '-=1')
          .from('.scroll-hint', { opacity: 0, duration: 0.6 }, '-=0.4');

        const ringObj = { v: 0 };
        intro.to(ringObj, { v: 87, duration: 1.6, ease: 'power3.out', snap: { v: 1 }, onUpdate: () => { q('.count-ring').forEach((el) => (el.textContent = String(ringObj.v))); } }, '-=1.5');

        /* ---------- idle motion ---------- */
        q('.blob').forEach((b, i) => {
          gsap.to(b, { x: 'random(-70, 70)', y: 'random(-70, 70)', duration: 'random(6, 10)', ease: 'sine.inOut', repeat: -1, yoyo: true, delay: i * 0.4 });
          gsap.to(b, { yPercent: (i + 1) * -25, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        });
        q('.float-chip').forEach((c, i) => gsap.to(c, { y: i % 2 ? 14 : -14, duration: 2.4 + i * 0.4, ease: 'sine.inOut', repeat: -1, yoyo: true }));
        gsap.to('.mock-wrap', { y: -16, duration: 3.2, ease: 'sine.inOut', repeat: -1, yoyo: true });
        gsap.to('.hero-content', { yPercent: -10, opacity: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.grid-bg', { yPercent: 20, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to('.scroll-hint span', { y: 10, duration: 0.9, ease: 'sine.inOut', repeat: -1, yoyo: true });

        /* ---------- progress bar + navbar ---------- */
        gsap.to('.progress', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: document.documentElement, start: 'top top', end: 'bottom bottom', scrub: 0.3 } });
        const nav = root.querySelector('.nav') as HTMLElement;
        ScrollTrigger.create({
          start: 0, end: 'max',
          onUpdate: (self: ScrollTrigger) => {
            nav.classList.toggle('scrolled', self.scroll() > 30);
            if (this.menuOpen) return;
            const hide = self.direction === 1 && self.scroll() > 400;
            gsap.to(nav, { yPercent: hide ? -150 : 0, duration: 0.4, ease: 'power3.out', overwrite: 'auto' });
          },
        });

        /* ---------- marquee + stats + headings ---------- */
        gsap.to('.marquee-track', { xPercent: -50, duration: 30, ease: 'none', repeat: -1 });
        q('.count').forEach((el) => {
          const obj = { v: 0 };
          const target = Number(el.dataset['count'] ?? 0);
          gsap.to(obj, { v: target, duration: 2, ease: 'power2.out', snap: { v: 1 },
            scrollTrigger: { trigger: el, start: 'top 90%', once: true },
            onUpdate: () => { el.textContent = String(obj.v); } });
        });
        gsap.from('.stat', { y: 50, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.stats', start: 'top 85%' } });
        q('.sec-head').forEach((el) => {
          gsap.from(el.children, { y: 60, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
        });

        /* ---------- how it works ---------- */
        gsap.from('.step', { y: 90, opacity: 0, rotateX: -20, transformPerspective: 800, stagger: 0.18, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.steps', start: 'top 80%' } });
        gsap.fromTo('.track-fill', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 70%', end: 'bottom 55%', scrub: true } });
        gsap.from('.step .num', { scale: 0, rotate: -180, stagger: 0.18, duration: 0.8, ease: 'back.out(2)', scrollTrigger: { trigger: '.steps', start: 'top 75%' } });

        /* ---------- about / bento ---------- */
        gsap.from('.about-text > *', { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.about-text', start: 'top 85%' } });
        gsap.from('.feature', { y: 80, opacity: 0, scale: 0.94, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.features', start: 'top 82%' } });
        gsap.from('.bar', { scaleY: 0, transformOrigin: 'bottom', stagger: 0.08, duration: 0.9, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.features', start: 'top 70%' } });
        gsap.from('.mini-row', { x: -30, opacity: 0, stagger: 0.12, duration: 0.7, ease: 'power3.out', scrollTrigger: { trigger: '.features', start: 'top 70%' } });
        gsap.from('.chip-pop', { scale: 0, stagger: 0.1, duration: 0.6, ease: 'back.out(2.4)', scrollTrigger: { trigger: '.features', start: 'top 70%' } });

        /* ---------- faq, cta, footer ---------- */
        gsap.from('.faq-item', { y: 40, opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.faq', start: 'top 85%' } });
        gsap.from('.band > *', { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.band', start: 'top 85%' } });
        gsap.from('.foot-grid > *', { y: 40, opacity: 0, stagger: 0.12, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '.footer', start: 'top 85%' } });
        gsap.from('.foot-big span', { yPercent: 110, stagger: 0.05, duration: 1, ease: 'power4.out', scrollTrigger: { trigger: '.foot-big', start: 'top 95%' } });
      });

      /* ---------- desktop only: cursor, magnetic, tilt, mockup parallax ---------- */
      mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const dot = root.querySelector('.cursor-dot') as HTMLElement;
        const ring = root.querySelector('.cursor-ring') as HTMLElement;
        gsap.set([dot, ring], { xPercent: -50, yPercent: -50, opacity: 0 });
        const dx = gsap.quickTo(dot, 'x', { duration: 0.1 }), dy = gsap.quickTo(dot, 'y', { duration: 0.1 });
        const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' }), ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
        this.on(window, 'mousemove', (e: MouseEvent) => {
          gsap.to([dot, ring], { opacity: 1, duration: 0.3, overwrite: 'auto' });
          dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
        });
        q('a, button, .tilt, .faq-item').forEach((el) => {
          this.on(el, 'mouseenter', () => gsap.to(ring, { scale: 1.8, duration: 0.3 }));
          this.on(el, 'mouseleave', () => gsap.to(ring, { scale: 1, duration: 0.3 }));
        });

        q('.magnetic').forEach((el) => {
          const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          const my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'elastic.out(1, 0.5)' });
          this.on(el, 'mousemove', (e: MouseEvent) => {
            const r = el.getBoundingClientRect();
            mx((e.clientX - (r.left + r.width / 2)) * 0.35);
            my((e.clientY - (r.top + r.height / 2)) * 0.35);
          });
          this.on(el, 'mouseleave', () => { mx(0); my(0); });
        });

        q('.tilt').forEach((el) => {
          const rotX = gsap.quickTo(el, 'rotateX', { duration: 0.4, ease: 'power3' });
          const rotY = gsap.quickTo(el, 'rotateY', { duration: 0.4, ease: 'power3' });
          gsap.set(el, { transformPerspective: 900 });
          this.on(el, 'mousemove', (e: MouseEvent) => {
            const r = el.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width - 0.5;
            const py = (e.clientY - r.top) / r.height - 0.5;
            rotY(px * 12); rotX(-py * 12);
            el.style.setProperty('--mx', `${(px + 0.5) * 100}%`);
            el.style.setProperty('--my', `${(py + 0.5) * 100}%`);
          });
          this.on(el, 'mouseleave', () => { rotX(0); rotY(0); });
        });

        const hero = root.querySelector('.hero') as HTMLElement;
        const mock = root.querySelector('.mock') as HTMLElement;
        const mrx = gsap.quickTo(mock, 'rotateY', { duration: 0.8, ease: 'power3' });
        const mry = gsap.quickTo(mock, 'rotateX', { duration: 0.8, ease: 'power3' });
        this.on(hero, 'mousemove', (e: MouseEvent) => {
          mrx((e.clientX / window.innerWidth - 0.5) * 14);
          mry(-(e.clientY / window.innerHeight - 0.5) * 10);
        });
      });
    }, root);
  }
}