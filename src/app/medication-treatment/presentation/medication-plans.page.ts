import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { describeApiError } from '../../core/http/api-error';
import { formatDate, shortId } from '../../shared/care/care.utils';
import { PatientContextService } from '../../shared/care/patient-context.service';
import { StatusChipComponent } from '../../shared/care/status-chip.component';
import { MedicationPlan } from '../domain/medication.models';
import { MedicationApiService } from '../infrastructure/medication-api.service';

@Component({
  selector: 'app-medication-plans-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, TranslateModule, StatusChipComponent],
  template: `
    <div class="care-page-head">
      <div>
        <div class="care-crumbs"><a routerLink="/medication">{{ 'medication.title' | translate }}</a> › {{ petName }}</div>
        <h2>{{ 'medication.plans.title' | translate: { pet: petName } }}</h2>
        <p class="care-sub">{{ 'medication.plans.subtitle' | translate }}</p>
      </div>
      <a mat-flat-button color="primary" [routerLink]="['/medication/patients', petId, 'new']" [queryParams]="{ clinicId: clinicId }">
        <mat-icon>add</mat-icon>{{ 'medication.plans.new' | translate }}
      </a>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (error()) { <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div> }

    @if (!loading() && !error() && plans().length === 0) {
      <div class="care-card care-empty"><mat-icon>medication</mat-icon><p>{{ 'medication.plans.empty' | translate }}</p></div>
    }

    @for (plan of plans(); track plan.planId) {
      <a class="care-card" style="display:block;text-decoration:none;color:inherit" [routerLink]="['/medication/plans', plan.planId]" [queryParams]="{ petId: petId, clinicId: clinicId }">
        <div class="care-actions" style="justify-content:space-between">
          <h3><mat-icon>medication</mat-icon>{{ plan.medicationName }}</h3>
          <app-status-chip [status]="plan.status" prefix="medication.status" />
        </div>
        <div class="care-grid">
          <div class="care-kv"><span>{{ 'medication.fields.route' | translate }}</span><strong>{{ plan.route || '—' }}</strong></div>
          <div class="care-kv"><span>{{ 'medication.fields.period' | translate }}</span><strong>{{ fmt(plan.startDate) }} → {{ plan.endDate ? fmt(plan.endDate) : ('care.common.open-ended' | translate) }}</strong></div>
          <div class="care-kv"><span>{{ 'medication.fields.schedules' | translate }}</span><strong>{{ plan.schedules.length }}</strong></div>
        </div>
      </a>
    }
  `,
})
export class MedicationPlansPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(MedicationApiService);
  private readonly context = inject(PatientContextService);
  private readonly translate = inject(TranslateService);

  protected readonly petId = this.route.snapshot.paramMap.get('petId') ?? '';
  protected readonly clinicId = this.route.snapshot.queryParamMap.get('clinicId') ?? this.context.clinicId() ?? '';
  protected readonly petName = this.context.patient(this.petId)?.name || shortId(this.petId);
  protected readonly plans = signal<MedicationPlan[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected fmt = (d: string) => formatDate(d);

  ngOnInit(): void {
    this.api.listByPet(this.petId).subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(this.translate.instant(describeApiError(e).key));
        this.loading.set(false);
      },
    });
  }
}
