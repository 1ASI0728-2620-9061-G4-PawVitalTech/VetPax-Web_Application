import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { describeApiError } from '../../core/http/api-error';
import { TIME_ZONES } from '../../shared/care/care.models';
import { fromDateOnly, shortId, toApiTime, toDateOnly } from '../../shared/care/care.utils';
import { PatientContextService } from '../../shared/care/patient-context.service';
import { ScheduleEditorComponent, buildScheduleArray } from '../../shared/care/schedule-editor.component';
import { FeedingPlanRequest, FeedingPlanUpdateRequest } from '../domain/nutrition.models';
import { NutritionApiService } from '../infrastructure/nutrition-api.service';

function endNotBeforeStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as Date | null;
  const end = group.get('endDate')?.value as Date | null;
  return start && end && end < start ? { range: true } : null;
}

/** Create (POST) when the route has :petId, revise (PUT → new revision) when it has :planId. */
@Component({
  selector: 'app-feeding-plan-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule, MatIconModule, MatProgressBarModule, TranslateModule, ScheduleEditorComponent],
  template: `
    <div class="care-page-head">
      <div>
        <div class="care-crumbs"><a routerLink="/nutrition">{{ 'nutrition.title' | translate }}</a> › {{ petName() }}</div>
        <h2>{{ (editing ? 'nutrition.form.title-edit' : 'nutrition.form.title-new') | translate }}</h2>
        <p class="care-sub">{{ (editing ? 'nutrition.form.subtitle-edit' : 'nutrition.form.subtitle-new') | translate: { pet: petName() } }}</p>
      </div>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (!clinicId()) { <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ 'care.errors.no-clinic' | translate }}</span></div> }
    @if (error()) { <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div> }

    <form [formGroup]="form" (ngSubmit)="submit()">
      <section class="care-card">
        <h3><mat-icon>restaurant</mat-icon>{{ 'nutrition.form.food' | translate }}</h3>
        <div class="care-form-grid" style="margin-top:12px">
          <mat-form-field class="wide">
            <mat-label>{{ 'nutrition.fields.food' | translate }}</mat-label>
            <input matInput formControlName="foodName" maxlength="200" />
            @if (form.controls.foodName.errors?.['required']) { <mat-error>{{ 'care.errors.required' | translate }}</mat-error> }
          </mat-form-field>
          <mat-form-field class="wide">
            <mat-label>{{ 'nutrition.fields.recommendations' | translate }}</mat-label>
            <textarea matInput rows="4" formControlName="recommendations" maxlength="2000"></textarea>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'nutrition.fields.start' | translate }}</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate" [min]="editing ? null : today" />
            <mat-datepicker-toggle matIconSuffix [for]="startPicker" /><mat-datepicker #startPicker />
            @if (form.controls.startDate.errors?.['required']) { <mat-error>{{ 'care.errors.required' | translate }}</mat-error> }
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'nutrition.fields.end' | translate }}</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" [min]="form.controls.startDate.value" />
            <mat-datepicker-toggle matIconSuffix [for]="endPicker" /><mat-datepicker #endPicker />
            <mat-hint>{{ 'care.common.end-optional' | translate }}</mat-hint>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'care.fields.timezone' | translate }}</mat-label>
            <mat-select formControlName="timeZoneId">
              @for (tz of zones; track tz) { <mat-option [value]="tz">{{ tz }}</mat-option> }
            </mat-select>
          </mat-form-field>
        </div>
        @if (form.errors?.['range']) { <div class="care-hint" style="color:var(--color-error)">{{ 'care.errors.range' | translate }}</div> }
      </section>

      <section class="care-card">
        <h3><mat-icon>schedule</mat-icon>{{ 'nutrition.form.schedules' | translate }}</h3>
        <p class="care-hint">{{ 'nutrition.form.schedules-hint' | translate }}</p>
        <app-schedule-editor [schedules]="form.controls.schedules" quantityLabel="nutrition.fields.quantity" unitPlaceholder="g, ml, cup" />
      </section>

      <div class="care-actions">
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || loading() || !clinicId()">
          <mat-icon>check</mat-icon>{{ (editing ? 'nutrition.form.submit-edit' : 'nutrition.form.submit-new') | translate }}
        </button>
        <a mat-button [routerLink]="backLink()" [queryParams]="backParams()">{{ 'care.common.cancel' | translate }}</a>
      </div>
    </form>
  `,
})
export class FeedingPlanFormPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(NutritionApiService);
  private readonly context = inject(PatientContextService);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  private readonly planId = this.route.snapshot.paramMap.get('planId');
  protected readonly editing = this.planId !== null;
  protected readonly petId = signal(this.route.snapshot.paramMap.get('petId') ?? this.route.snapshot.queryParamMap.get('petId') ?? '');
  protected readonly clinicId = signal(this.route.snapshot.queryParamMap.get('clinicId') ?? this.context.clinicId() ?? '');
  protected readonly zones = TIME_ZONES;
  protected readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  protected readonly loading = signal(this.editing);
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly petName = () => this.context.patient(this.petId())?.name || shortId(this.petId());
  protected readonly backLink = () => (this.petId() ? ['/nutrition/patients', this.petId()] : ['/nutrition']);
  protected readonly backParams = () => ({ clinicId: this.clinicId() });

  protected readonly form = new FormGroup(
    {
      foodName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
      recommendations: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
      startDate: new FormControl<Date | null>(null, Validators.required),
      endDate: new FormControl<Date | null>(null),
      timeZoneId: new FormControl('America/Lima', { nonNullable: true }),
      schedules: buildScheduleArray(),
    },
    { validators: [endNotBeforeStart] },
  );

  ngOnInit(): void {
    if (!this.planId) return;
    this.api.get(this.planId).subscribe({
      next: (plan) => {
        if (!this.petId() && plan.petId) this.petId.set(plan.petId);
        if (!this.clinicId() && plan.clinicId) this.clinicId.set(plan.clinicId);
        this.form.patchValue({
          foodName: plan.foodName,
          recommendations: plan.recommendations,
          startDate: fromDateOnly(plan.startDate),
          endDate: fromDateOnly(plan.endDate),
          timeZoneId: plan.timeZoneId,
        });
        const rows = buildScheduleArray(plan.schedules.map((s) => ({ localTime: s.localTime, daysOfWeek: s.daysOfWeek, quantity: s.quantity, unit: s.unit })));
        this.form.controls.schedules.clear();
        rows.controls.forEach((g) => this.form.controls.schedules.push(g));
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        this.showError(e);
      },
    });
  }

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid || !this.clinicId()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const body: FeedingPlanUpdateRequest = {
      foodName: v.foodName.trim(),
      recommendations: v.recommendations.trim() || undefined,
      startDate: toDateOnly(v.startDate as Date),
      endDate: v.endDate ? toDateOnly(v.endDate) : undefined,
      timeZoneId: v.timeZoneId,
      schedules: v.schedules.map((s) => ({ localTime: toApiTime(s.localTime), daysOfWeek: s.daysOfWeek, quantity: Number(s.quantity), unit: s.unit.trim() })),
    };

    this.saving.set(true);
    const call = this.editing
      ? this.api.revise(this.planId as string, body)
      : this.api.prescribe(this.petId(), { ...body, clinicId: this.clinicId() } satisfies FeedingPlanRequest);
    call.subscribe({
      next: () => {
        this.snack.open(this.translate.instant(this.editing ? 'nutrition.form.saved-edit' : 'nutrition.form.saved-new'), undefined, { duration: 4000, panelClass: 'success-snackbar' });
        void this.router.navigate(this.backLink(), { queryParams: this.backParams() });
      },
      error: (e) => {
        this.saving.set(false);
        this.showError(e);
      },
    });
  }

  private showError(e: unknown): void {
    const info = describeApiError(e);
    const text = this.translate.instant(info.key) as string;
    this.error.set(info.detail ? `${text} ${info.detail}` : text);
  }
}
