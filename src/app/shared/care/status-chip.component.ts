import { Component, Input, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { statusTone } from './care.utils';

/** Colored status pill. Translates `<prefix>.<status in lowercase>` and falls back to the raw API text. */
@Component({
  selector: 'app-status-chip',
  standalone: true,
  template: `<span class="care-chip" [class]="'care-chip ' + tone">{{ label }}</span>`,
})
export class StatusChipComponent {
  @Input({ required: true }) status = '';
  @Input() prefix = 'care.status';
  private readonly translate = inject(TranslateService);

  protected get tone(): string {
    return statusTone(this.status);
  }

  protected get label(): string {
    const key = `${this.prefix}.${this.status.toLowerCase()}`;
    const text = this.translate.instant(key) as string;
    return text === key ? this.status : text;
  }
}
