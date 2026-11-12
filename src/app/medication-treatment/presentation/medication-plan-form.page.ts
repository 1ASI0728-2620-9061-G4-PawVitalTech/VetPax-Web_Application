import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { describeApiError } from '../../core/http/api-error';
import { TIME_ZONES } from '../../shared/care/care.models';
import { shortId, toApiTime, toDateOnly } from '../../shared/care/care.utils';
import { PatientContextService } from '../../shared/care/patient-context.service';
import { ScheduleEditorComponent, buildScheduleArray } from '../../shared/care/schedule-editor.component';
import { PrescribeMedicationRequest } from '../domain/medication.models';
import { MedicationApiService } from '../infrastructure/medication-api.service';

const GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;

function endNotBeforeStart(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as Date | null;
  const end = group.get('endDate')?.value as Date | null;
  return start && end && end < start ? { range: true } : null;
}

@Component({
  selector: 'app-medication-plan-form-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatDatepickerModule, MatButtonModule, MatIconModule, TranslateModule, ScheduleEditorComponent],
  template: `
    <div class="care-page-head">
      <div>
        <div class="care-crumbs">
          <a routerLink="/medication">{{ 'medication.title' | translate }}</a> ›
          <a [routerLink]="['/medication/patients', petId]" [queryParams]="{ clinicId: clinicId }">{{ petName }}</a>
        </div>
        <h2>{{ 'medication.form.title' | translate }}</h2>
        <p class="care-sub">{{ 'medication.form.subtitle' | translate: { pet: petName } }}</p>
      </div>
    </div>

    @if (!clinicId) {
      <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ 'care.errors.no-clinic' | translate }}</span></div>
    }
    @if (error()) { <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div> }

    <form [formGroup]="form" (ngSubmit)="submit()">
      <section class="care-card">
        <h3><mat-icon>medication</mat-icon>{{ 'medication.form.drug' | translate }}</h3>
        <div class="care-form-grid" style="margin-top:12px">
          <mat-form-field>
            <mat-label>{{ 'medication.fields.name' | translate }}</mat-label>
            <input matInput formControlName="medicationName" maxlength="200" />
            @if (form.controls.medicationName.errors?.['required']) { <mat-error>{{ 'care.errors.required' | translate }}</mat-error> }
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'medication.fields.route' | translate }}</mat-label>
            <input matInput formControlName="route" maxlength="100" [placeholder]="'medication.form.route-hint' | translate" />
            @if (form.controls.route.errors?.['required']) { <mat-error>{{ 'care.errors.required' | translate }}</mat-error> }
          </mat-form-field>
          <mat-form-field class="wide">
            <mat-label>{{ 'medication.fields.instructions' | translate }}</mat-label>
            <textarea matInput rows="3" formControlName="instructions" maxlength="2000"></textarea>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'medication.fields.start' | translate }}</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate" [min]="today" />
            <mat-datepicker-toggle matIconSuffix [for]="startPicker" />
            <mat-datepicker #startPicker />
            @if (form.controls.startDate.errors?.['required']) { <mat-error>{{ 'care.errors.required' | translate }}</mat-error> }
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'medication.fields.end' | translate }}</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate" [min]="form.controls.startDate.value ?? today" />
            <mat-datepicker-toggle matIconSuffix [for]="endPicker" />
            <mat-datepicker #endPicker />
            <mat-hint>{{ 'care.common.end-optional' | translate }}</mat-hint>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'care.fields.timezone' | translate }}</mat-label>
            <mat-select formControlName="timeZoneId">
              @for (tz of zones; track tz) { <mat-option [value]="tz">{{ tz }}</mat-option> }
            </mat-select>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'medication.fields.attention' | translate }}</mat-label>
            <input matInput formControlName="clinicalAttentionId" />
            <mat-hint>{{ 'medication.form.attention-hint' | translate }}</mat-hint>
            @if (form.controls.clinicalAttentionId.errors?.['pattern']) { <mat-error>{{ 'care.errors.guid' | translate }}</mat-error> }
          </mat-form-field>
        </div>
        @if (form.errors?.['range']) { <div class="care-hint" style="color:var(--color-error)">{{ 'care.errors.range' | translate }}</div> }
      </section>

      <section class="care-card">
        <h3><mat-icon>schedule</mat-icon>{{ 'medication.form.schedules' | translate }}</h3>
        <p class="care-hint">{{ 'medication.form.schedules-hint' | translate }}</p>
        <app-schedule-editor [schedules]="form.controls.schedules" quantityLabel="medication.fields.amount" unitPlaceholder="mg, ml, tab" />
      </section>

      <div class="care-actions">
        <button mat-flat-button color="primary" type="submit" [disabled]="saving() || !clinicId">
          <mat-icon>check</mat-icon>{{ 'medication.form.submit' | translate }}
        </button>
        <a mat-button [routerLink]="['/medication/patients', petId]" [queryParams]="{ clinicId: clinicId }">{{ 'care.common.cancel' | translate }}</a>
      </div>
    </form>
  `,
})
export class MedicationPlanFormPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(MedicationApiService);
  private readonly context = inject(PatientContextService);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  protected readonly petId = this.route.snapshot.paramMap.get('petId') ?? '';
  protected readonly clinicId = this.route.snapshot.queryParamMap.get('clinicId') ?? this.context.clinicId() ?? '';
  protected readonly petName = this.context.patient(this.petId)?.name || shortId(this.petId);
  protected readonly zones = TIME_ZONES;
  protected readonly today = new Date(new Date().setHours(0, 0, 0, 0));
  protected readonly saving = signal(false);
  protected readonly error = signal('');

  protected readonly form = new FormGroup(
    {
      medicationName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
      route: new FormControl('Oral', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
      instructions: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
      startDate: new FormControl<Date | null>(null, Validators.required),
      endDate: new FormControl<Date | null>(null),
      timeZoneId: new FormControl('America/Lima', { nonNullable: true }),
      clinicalAttentionId: new FormControl('', { nonNullable: true, validators: [Validators.pattern(GUID)] }),
      schedules: buildScheduleArray(),
    },
    { validators: [endNotBeforeStart] },
  );

  protected submit(): void {
    this.error.set('');
    if (this.form.invalid || !this.clinicId) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: PrescribeMedicationRequest = {
      clinicId: this.clinicId,
      clinicalAttentionId: v.clinicalAttentionId.trim() || undefined,
      medicationName: v.medicationName.trim(),
      route: v.route.trim(),
      instructions: v.instructions.trim() || undefined,
      startDate: toDateOnly(v.startDate as Date),
      endDate: v.endDate ? toDateOnly(v.endDate) : undefined,
      timeZoneId: v.timeZoneId,
      schedules: v.schedules.map((s) => ({
        localTime: toApiTime(s.localTime),
        daysOfWeek: s.daysOfWeek,
        amount: Number(s.quantity),
        unit: s.unit.trim(),
      })),
    };

    this.saving.set(true);
    this.api.prescribe(this.petId, request).subscribe({
      next: () => {
        this.snack.open(this.translate.instant('medication.form.saved'), undefined, { duration: 4000, panelClass: 'success-snackbar' });
        void this.router.navigate(['/medication/patients', this.petId], { queryParams: { clinicId: this.clinicId } });
      },
      error: (e) => {
        const info = describeApiError(e);
        const text = this.translate.instant(info.key) as string;
        this.error.set(info.detail ? `${text} ${info.detail}` : text);
        this.saving.set(false);
      },
    });
  }
}