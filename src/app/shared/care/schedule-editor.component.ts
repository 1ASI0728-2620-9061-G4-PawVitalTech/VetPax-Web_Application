import { Component, Input } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule } from '@ngx-translate/core';
import { DAYS_OF_WEEK, DayOfWeek, ScheduleDraft } from './care.models';

export type ScheduleGroup = FormGroup<{
  localTime: FormControl<string>;
  daysOfWeek: FormControl<DayOfWeek[]>;
  quantity: FormControl<number | null>;
  unit: FormControl<string>;
}>;

function atLeastOneDay(control: AbstractControl): ValidationErrors | null {
  const value = control.value as DayOfWeek[] | null;
  return value && value.length > 0 ? null : { days: true };
}

export function buildScheduleGroup(draft?: Partial<ScheduleDraft>): ScheduleGroup {
  return new FormGroup({
    localTime: new FormControl(draft?.localTime ?? '08:00', { nonNullable: true, validators: [Validators.required] }),
    daysOfWeek: new FormControl<DayOfWeek[]>(draft?.daysOfWeek ?? [...DAYS_OF_WEEK], { nonNullable: true, validators: [atLeastOneDay] }),
    quantity: new FormControl<number | null>(draft?.quantity ?? null, [Validators.required, Validators.min(0.01)]),
    unit: new FormControl(draft?.unit ?? '', { nonNullable: true, validators: [Validators.required, Validators.maxLength(30)] }),
  });
}

export function buildScheduleArray(drafts: ScheduleDraft[] = []): FormArray<ScheduleGroup> {
  return new FormArray<ScheduleGroup>(
    (drafts.length ? drafts : [{ localTime: '08:00', daysOfWeek: [...DAYS_OF_WEEK], quantity: null, unit: '' }]).map((d) => buildScheduleGroup(d)),
    { validators: [(c) => ((c as FormArray).length > 0 ? null : { required: true })] },
  );
}

/** Repeatable "time + days + quantity + unit" rows shared by medication and feeding forms. */
@Component({
  selector: 'app-schedule-editor',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, TranslateModule],
  template: `
    @for (group of schedules.controls; track group; let i = $index) {
      <div class="care-schedule" [formGroup]="group">
        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ 'care.schedule.time' | translate }}</mat-label>
          <input matInput type="time" formControlName="localTime" />
        </mat-form-field>

        <div>
          <div class="care-days" role="group" [attr.aria-label]="'care.schedule.days' | translate">
            @for (day of days; track day) {
              <button type="button" class="care-day" [class.on]="isOn(group, day)" [attr.aria-pressed]="isOn(group, day)" (click)="toggle(group, day)">
                {{ 'care.days.' + day | translate }}
              </button>
            }
          </div>
          @if (group.controls.daysOfWeek.invalid && group.touched) {
            <div class="care-hint" style="color:var(--color-error)">{{ 'care.schedule.days-required' | translate }}</div>
          }
        </div>

        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ quantityLabel | translate }}</mat-label>
          <input matInput type="number" min="0" step="any" formControlName="quantity" />
        </mat-form-field>

        <mat-form-field subscriptSizing="dynamic">
          <mat-label>{{ 'care.schedule.unit' | translate }}</mat-label>
          <input matInput formControlName="unit" [placeholder]="unitPlaceholder" />
        </mat-form-field>

        <button mat-icon-button type="button" (click)="remove(i)" [disabled]="schedules.length === 1" [attr.aria-label]="'care.schedule.remove' | translate">
          <mat-icon>delete_outline</mat-icon>
        </button>
      </div>
    }
    <button mat-stroked-button type="button" (click)="add()"><mat-icon>add</mat-icon>{{ 'care.schedule.add' | translate }}</button>
  `,
})
export class ScheduleEditorComponent {
  @Input({ required: true }) schedules!: FormArray<ScheduleGroup>;
  /** i18n key for the quantity field ("Dosis" in medication, "Cantidad" in feeding). */
  @Input() quantityLabel = 'care.schedule.quantity';
  @Input() unitPlaceholder = '';
  protected readonly days = DAYS_OF_WEEK;

  protected isOn(group: ScheduleGroup, day: DayOfWeek): boolean {
    return group.controls.daysOfWeek.value.includes(day);
  }

  protected toggle(group: ScheduleGroup, day: DayOfWeek): void {
    const ctrl = group.controls.daysOfWeek;
    const next = ctrl.value.includes(day) ? ctrl.value.filter((d) => d !== day) : [...ctrl.value, day];
    ctrl.setValue(DAYS_OF_WEEK.filter((d) => next.includes(d)));
    ctrl.markAsDirty();
    group.markAsTouched();
  }

  protected add(): void {
    this.schedules.push(buildScheduleGroup({ quantity: null, unit: this.schedules.at(0)?.controls.unit.value ?? '' }));
  }

  protected remove(index: number): void {
    if (this.schedules.length > 1) this.schedules.removeAt(index);
  }
}
