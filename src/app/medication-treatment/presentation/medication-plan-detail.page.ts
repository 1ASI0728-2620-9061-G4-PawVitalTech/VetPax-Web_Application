import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { describeApiError } from '../../core/http/api-error';
import { ConfirmDialogComponent } from '../../shared/care/confirm-dialog.component';
import { PatientContextService } from '../../shared/care/patient-context.service';
import { ScheduleEditorComponent, buildScheduleArray } from '../../shared/care/schedule-editor.component';
import { StatusChipComponent } from '../../shared/care/status-chip.component';
import { addDays, dateInZone, formatDate, formatInZone, fromDateOnly, toApiTime, toDateOnly } from '../../shared/care/care.utils';
import { MedicationDose, MedicationPlan, MedicationPlanChange, isPlanClosed } from '../domain/medication.models';
import { MedicationApiService } from '../infrastructure/medication-api.service';

@Component({
  selector: 'app-medication-plan-detail-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatTableModule, MatProgressBarModule, TranslateModule, StatusChipComponent, ScheduleEditorComponent],
  template: `
    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (error()) { <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div> }

    @if (plan(); as p) {
      <div class="care-page-head">
        <div>
          <div class="care-crumbs">
            <a routerLink="/medication">{{ 'medication.title' | translate }}</a> ›
            <a [routerLink]="['/medication/patients', petId()]" [queryParams]="{ clinicId: clinicId() }">{{ petName() }}</a>
          </div>
          <h2>{{ p.medicationName }} <app-status-chip [status]="p.status" prefix="medication.status" /></h2>
        </div>
        @if (!closed()) {
          <div class="care-actions">
            <button mat-stroked-button type="button" (click)="toggleEdit()"><mat-icon>edit_calendar</mat-icon>{{ 'medication.detail.change-schedules' | translate }}</button>
            <button mat-stroked-button type="button" (click)="confirm('complete')"><mat-icon>task_alt</mat-icon>{{ 'medication.detail.complete' | translate }}</button>
            <button mat-stroked-button color="warn" type="button" (click)="confirm('cancel')"><mat-icon>block</mat-icon>{{ 'medication.detail.cancel' | translate }}</button>
          </div>
        }
      </div>

      <section class="care-card">
        <h3><mat-icon>medication</mat-icon>{{ 'medication.detail.summary' | translate }}</h3>
        <div class="care-grid">
          <div class="care-kv"><span>{{ 'medication.fields.route' | translate }}</span><strong>{{ p.route || '—' }}</strong></div>
          <div class="care-kv"><span>{{ 'medication.fields.period' | translate }}</span><strong>{{ fmtDate(p.startDate) }} → {{ p.endDate ? fmtDate(p.endDate) : ('care.common.open-ended' | translate) }}</strong></div>
          <div class="care-kv"><span>{{ 'care.fields.timezone' | translate }}</span><strong>{{ p.timeZoneId }}</strong></div>
        </div>
        <div class="care-kv" style="margin-top:12px"><span>{{ 'medication.fields.instructions' | translate }}</span><strong style="font-weight:500">{{ p.instructions || '—' }}</strong></div>
      </section>

      <section class="care-card">
        <h3><mat-icon>schedule</mat-icon>{{ 'medication.detail.schedules' | translate }}</h3>
        @if (editing()) {
          <p class="care-hint">{{ 'medication.detail.change-hint' | translate }}</p>
          <app-schedule-editor [schedules]="scheduleForm.controls.schedules" quantityLabel="medication.fields.amount" unitPlaceholder="mg, ml, tab" />
          <div class="care-actions" style="margin-top:12px">
            <button mat-flat-button color="primary" type="button" [disabled]="saving()" (click)="saveSchedules()">{{ 'care.common.save' | translate }}</button>
            <button mat-button type="button" (click)="editing.set(false)">{{ 'care.common.cancel' | translate }}</button>
          </div>
        } @else {
          @for (s of p.schedules; track $index) {
            <div class="care-slot">
              <span class="time">{{ s.localTime }}</span>
              <span style="flex:1">{{ s.amount }} {{ s.unit }}</span>
              <span class="care-sub">
                @for (d of s.daysOfWeek; track d; let last = $last) { {{ 'care.days.' + d | translate }}{{ last ? '' : ', ' }} }
              </span>
            </div>
          } @empty { <p class="care-sub">{{ 'medication.detail.no-schedules' | translate }}</p> }
        }
      </section>

      <section class="care-card">
        <h3><mat-icon>vaccines</mat-icon>{{ 'medication.detail.doses' | translate }}</h3>
        <p class="care-hint">{{ 'medication.detail.doses-hint' | translate }}</p>
        <form [formGroup]="range" class="care-actions" (ngSubmit)="loadDoses()">
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>{{ 'medication.detail.from' | translate }}</mat-label>
            <input matInput [matDatepicker]="fromPicker" formControlName="from" />
            <mat-datepicker-toggle matIconSuffix [for]="fromPicker" /><mat-datepicker #fromPicker />
          </mat-form-field>
          <mat-form-field subscriptSizing="dynamic">
            <mat-label>{{ 'medication.detail.to' | translate }}</mat-label>
            <input matInput [matDatepicker]="toPicker" formControlName="to" />
            <mat-datepicker-toggle matIconSuffix [for]="toPicker" /><mat-datepicker #toPicker />
          </mat-form-field>
          <button mat-stroked-button type="submit"><mat-icon>refresh</mat-icon>{{ 'medication.detail.refresh' | translate }}</button>
        </form>

        @if (dosesLoading()) { <mat-progress-bar mode="indeterminate" /> }
        @if (dosesError()) { <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ dosesError() }}</span></div> }

        @if (!dosesLoading() && !dosesError()) {
          @if (doses().length === 0) {
            <div class="care-empty"><mat-icon>hourglass_empty</mat-icon><p>{{ 'medication.detail.no-doses' | translate }}</p></div>
          } @else {
            <table mat-table [dataSource]="doses()" class="care-table">
              <ng-container matColumnDef="scheduled">
                <th mat-header-cell *matHeaderCellDef>{{ 'medication.detail.scheduled' | translate }}</th>
                <td mat-cell *matCellDef="let d">{{ fmtZone(d.scheduledAtUtc) }}</td>
              </ng-container>
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>{{ 'medication.fields.amount' | translate }}</th>
                <td mat-cell *matCellDef="let d">{{ doseAmount(d) }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>{{ 'medication.detail.status' | translate }}</th>
                <td mat-cell *matCellDef="let d"><app-status-chip [status]="d.status" prefix="medication.dose-status" /></td>
              </ng-container>
              <ng-container matColumnDef="administered">
                <th mat-header-cell *matHeaderCellDef>{{ 'medication.detail.administered' | translate }}</th>
                <td mat-cell *matCellDef="let d">{{ d.administeredAtUtc ? fmtZone(d.administeredAtUtc) : '—' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="doseColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: doseColumns"></tr>
            </table>
          }
        }
      </section>
    }
  `,
})
export class MedicationPlanDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(MedicationApiService);
  private readonly context = inject(PatientContextService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  private readonly planId = this.route.snapshot.paramMap.get('planId') ?? '';
  protected readonly plan = signal<MedicationPlan | null>(null);
  protected readonly doses = signal<MedicationDose[]>([]);
  protected readonly loading = signal(true);
  protected readonly dosesLoading = signal(false);
  protected readonly saving = signal(false);
  protected readonly editing = signal(false);
  protected readonly error = signal('');
  protected readonly dosesError = signal('');
  protected readonly doseColumns = ['scheduled', 'amount', 'status', 'administered'];

  protected readonly petId = signal(this.route.snapshot.queryParamMap.get('petId') ?? '');
  protected readonly clinicId = signal(this.route.snapshot.queryParamMap.get('clinicId') ?? this.context.clinicId() ?? '');
  protected readonly petName = () => this.context.patient(this.petId())?.name || this.petId().substring(0, 8);

  protected scheduleForm = new FormGroup({ schedules: buildScheduleArray() });
  protected readonly range = new FormGroup({ from: new FormControl<Date | null>(null), to: new FormControl<Date | null>(null) });

  protected closed = () => isPlanClosed(this.plan()?.status ?? '');
  protected fmtDate = (d: string) => formatDate(d);
  /** Doses carry only scheduleId; amount and unit come from the plan's schedule. */
  protected doseAmount = (d: MedicationDose): string => {
    const s = this.plan()?.schedules.find((x) => x.scheduleId === d.scheduleId);
    return s ? `${s.amount} ${s.unit}` : '';
  };
  protected fmtZone = (iso?: string) => formatInZone(iso, this.plan()?.timeZoneId ?? 'America/Lima');

  ngOnInit(): void {
    this.api.get(this.planId).subscribe({
      next: (plan) => {
        this.plan.set(plan);
        if (!this.petId() && plan.petId) this.petId.set(plan.petId);
        if (!this.clinicId() && plan.clinicId) this.clinicId.set(plan.clinicId);
        // Open-ended plans: show the first 30 days by default.
        const start = fromDateOnly(plan.startDate);
        this.range.setValue({ from: start, to: fromDateOnly(plan.endDate) ?? (start ? addDays(start, 30) : null) });
        this.loading.set(false);
        this.loadDoses();
      },
      error: (e) => this.fail(e, this.error),
    });
  }

  protected loadDoses(): void {
    const plan = this.plan();
    const { from, to } = this.range.getRawValue();
    if (!plan || !from || !to) return;
    const lastDay = toDateOnly(to);
    this.dosesLoading.set(true);
    this.dosesError.set('');
    // Ask one extra day and trim on the client so the result is right whether the API treats `to` as inclusive or not.
    this.api.doses(plan.planId, toDateOnly(from), toDateOnly(addDays(to, 1))).subscribe({
      next: (list) => {
        this.doses.set(
          list
            .filter((d) => {
              const day = dateInZone(d.scheduledAtUtc, plan.timeZoneId);
              return !day || day <= lastDay;
            })
            .sort((a, b) => (a.scheduledAtUtc ?? '').localeCompare(b.scheduledAtUtc ?? '')),
        );
        this.dosesLoading.set(false);
      },
      error: (e) => this.fail(e, this.dosesError, this.dosesLoading),
    });
  }

  protected toggleEdit(): void {
    const plan = this.plan();
    if (!plan) return;
    this.scheduleForm = new FormGroup({
      schedules: buildScheduleArray(plan.schedules.map((s) => ({ localTime: s.localTime, daysOfWeek: s.daysOfWeek, quantity: s.amount, unit: s.unit }))),
    });
    this.editing.update((v) => !v);
  }

  protected saveSchedules(): void {
    if (this.scheduleForm.invalid) {
      this.scheduleForm.markAllAsTouched();
      return;
    }
    this.apply({
      operation: 'changeSchedules',
      schedules: this.scheduleForm.getRawValue().schedules.map((s) => ({
        localTime: toApiTime(s.localTime),
        daysOfWeek: s.daysOfWeek,
        amount: Number(s.quantity),
        unit: s.unit.trim(),
      })),
    });
  }

  protected confirm(operation: 'complete' | 'cancel'): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: {
          titleKey: `medication.confirm.${operation}-title`,
          messageKey: `medication.confirm.${operation}-message`,
          confirmKey: `medication.confirm.${operation}-action`,
          destructive: operation === 'cancel',
        },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.apply({ operation }));
  }

  private apply(change: MedicationPlanChange): void {
    this.saving.set(true);
    this.error.set('');
    this.api.change(this.planId, change).subscribe({
      next: () => {
        this.snack.open(this.translate.instant('medication.detail.updated'), undefined, { duration: 4000, panelClass: 'success-snackbar' });
        this.saving.set(false);
        this.editing.set(false);
        this.api.get(this.planId).subscribe((plan) => {
          this.plan.set(plan);
          this.loadDoses();
        });
      },
      error: (e) => {
        this.fail(e, this.error);
        this.saving.set(false);
      },
    });
  }

  private fail(e: unknown, target: { set(v: string): void }, busy: { set(v: boolean): void } = this.loading): void {
    const info = describeApiError(e);
    const text = this.translate.instant(info.key) as string;
    target.set(info.detail ? `${text} ${info.detail}` : text);
    busy.set(false);
  }
}
