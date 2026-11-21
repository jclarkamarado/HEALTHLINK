import { Component, input, output } from '@angular/core';
import { Meta } from '../core/models';

@Component({
  selector: 'app-pager',
  template: `
    <div class="pager no-print">
      <span class="muted small">{{ meta().total }} result(s)</span>
      @if (meta().last_page > 1) {
        <button type="button" class="btn sm" [disabled]="meta().current_page <= 1" (click)="go.emit(meta().current_page - 1)">Prev</button>
        <span class="small">Page {{ meta().current_page }} of {{ meta().last_page }}</span>
        <button type="button" class="btn sm" [disabled]="meta().current_page >= meta().last_page" (click)="go.emit(meta().current_page + 1)">Next</button>
      }
    </div>
  `,
})
export class Pager {
  meta = input.required<Meta>();
  go = output<number>();
}
