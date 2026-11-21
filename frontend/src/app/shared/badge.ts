import { Component, input } from '@angular/core';
import { STATUS_LABEL } from '../core/util';

@Component({
  selector: 'app-badge',
  template: `<span class="badge st-{{ value() }}">{{ label() }}</span>`,
})
export class Badge {
  value = input.required<string>();
  label() { return STATUS_LABEL[this.value()] ?? this.value(); }
}
