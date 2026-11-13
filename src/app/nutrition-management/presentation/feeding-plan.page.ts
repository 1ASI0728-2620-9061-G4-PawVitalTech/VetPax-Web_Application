import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { describeApiError } from '../../core/http/api-error';
import { formatDate, formatInZone, shortId } from '../../shared/care/care.utils';
import { ConfirmDialogComponent } from '../../shared/care/confirm-dialog.component';
import { PatientContextService } from '../../shared/care/patient-context.service';
import { StatusChipComponent } from '../../shared/care/status-chip.component';
import { FeedingPlan } from '../domain/nutrition.models';
import { NutritionApiService } from '../infrastructure/nutrition-api.service';

/** Shows a feeding plan: the pet's active plan (mode "active") or any plan by id (mode "byId"). */
@Component({
  selector: 'app-feeding-plan-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule, MatProgressBarModule, TranslateModule, StatusChipComponent],
  template: `
    <div class="care-page-head">
      <div>
        <div class="care-crumbs"><a routerLink="/nutrition">{{ 'nutrition.title' | translate }}</a> › {{ petName() }}</div>
        <h2>{{ 'nutrition.plan.title' | translate: { pet: petName() } }}</h2>
      </div>
      <div class="care-actions">
        @if (plan(); as p) {
          @if (p.active) {
            <a mat-stroked-button [routerLink]="['/nutrition/plans', p.planId, 'edit']" [queryParams]="{ petId: petId(), clinicId: clinicId() }"><mat-icon>edit</mat-icon>{{ 'nutrition.plan.edit' | translate }}</a>
            <button mat-stroked-button color="warn" type="button" [disabled]="busy()" (click)="confirmDeactivate()"><mat-icon>pause_circle</mat-icon>{{ 'nutrition.plan.deactivate' | translate }}</button>
          }
        }
        @if (petId() && (noActive() || (plan() && !plan()!.active))) {
          <a mat-flat-button color="primary" [routerLink]="['/nutrition/patients', petId(), 'new']" [queryParams]="{ clinicId: clinicId() }"><mat-icon>add</mat-icon>{{ 'nutrition.plan.new' | translate }}</a>
        }
      </div>
    </div>

    @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
    @if (error()) { <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div> }

    @if (noActive()) {
      <div class="care-card care-empty"><mat-icon>restaurant</mat-icon><p>{{ 'nutrition.plan.no-active' | translate }}</p></div>
    }

    @if (plan(); as p) {
      @if (!p.active) {
        <div class="care-card" style="background:#fff7ed"><strong>{{ 'nutrition.plan.inactive-banner' | translate }}</strong></div>
      }
      <section class="care-card">
        <div class="care-actions" style="justify-content:space-between">
          <h3><mat-icon>restaurant</mat-icon>{{ p.foodName }}</h3>
          <app-status-chip [status]="p.active ? 'active' : 'inactive'" prefix="nutrition.status" />
        </div>
        <div class="care-grid">
          <div class="care-kv"><span>{{ 'nutrition.fields.period' | translate }}</span><strong>{{ fmt(p.startDate) }} → {{ p.endDate ? fmt(p.endDate) : ('care.common.open-ended' | translate) }}</strong></div>
          <div class="care-kv"><span>{{ 'care.fields.timezone' | translate }}</span><strong>{{ p.timeZoneId }}</strong></div>
          @if (p.revision) { <div class="care-kv"><span>{{ 'nutrition.fields.revision' | translate }}</span><strong>#{{ p.revision }}</strong></div> }
          <div class="care-kv"><span>{{ 'nutrition.fields.reminders' | translate }}</span><strong>{{ (p.remindersEnabled ? 'care.common.on' : 'care.common.off') | translate }}</strong></div>
        </div>
      </section>

      <section class="care-card">
        <h3><mat-icon>schedule</mat-icon>{{ 'nutrition.plan.schedules' | translate }}</h3>
        @for (s of p.schedules; track $index) {
          <div class="care-slot">
            <span class="time">{{ s.localTime }}</span>
            <span style="flex:1">{{ s.quantity }} {{ s.unit }}</span>
            <span class="care-sub">
              @for (d of s.daysOfWeek; track d; let last = $last) { {{ 'care.days.' + d | translate }}{{ last ? '' : ', ' }} }
            </span>
          </div>
        } @empty { <p class="care-sub">{{ 'nutrition.plan.no-schedules' | translate }}</p> }
      </section>

      <section class="care-card">
        <h3><mat-icon>notes</mat-icon>{{ 'nutrition.fields.recommendations' | translate }}</h3>
        <p style="white-space:pre-line;margin:8px 0 0">{{ p.recommendations || '—' }}</p>
      </section>

      @if (p.revisions.length > 0) {
        <section class="care-card">
          <h3><mat-icon>history</mat-icon>{{ 'nutrition.plan.history' | translate }}</h3>
          <p class="care-hint">{{ 'nutrition.plan.history-hint' | translate }}</p>
          @for (r of p.revisions; track $index) {
            <details class="care-slot" style="display:block">
              <summary style="cursor:pointer;font-weight:600">
                {{ 'nutrition.fields.revision' | translate }} {{ r.revision ? '#' + r.revision : '' }} · {{ r.foodName }}
                @if (r.createdAt) { <span class="care-sub"> · {{ 'nutrition.plan.replaced-at' | translate }} {{ fmtZone(r.createdAt, p.timeZoneId) }}</span> }
              </summary>
              <p class="care-sub" style="margin:8px 0 4px">{{ fmt(r.startDate) }} → {{ r.endDate ? fmt(r.endDate) : ('care.common.open-ended' | translate) }}</p>
              @for (s of r.schedules; track $index) { <div>{{ s.localTime }} — {{ s.quantity }} {{ s.unit }}</div> }
              @if (r.recommendations) { <p style="white-space:pre-line;margin:8px 0 0">{{ r.recommendations }}</p> }
            </details>
          }
        </section>
      }
    }
  `,
})
export class FeedingPlanPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(NutritionApiService);
  private readonly context = inject(PatientContextService);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  private readonly mode = (this.route.snapshot.data['mode'] as 'active' | 'byId') ?? 'active';
  protected readonly petId = signal(this.route.snapshot.paramMap.get('petId') ?? this.route.snapshot.queryParamMap.get('petId') ?? '');
  protected readonly clinicId = signal(this.route.snapshot.queryParamMap.get('clinicId') ?? this.context.clinicId() ?? '');
  protected readonly plan = signal<FeedingPlan | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly noActive = signal(false);
  protected readonly error = signal('');

  protected readonly petName = () => this.context.patient(this.petId())?.name || shortId(this.petId());
  protected fmt = (d: string) => formatDate(d);
  protected fmtZone = (iso: string, tz: string) => formatInZone(iso, tz);

  ngOnInit(): void {
    this.load();
  }

  protected confirmDeactivate(): void {
    this.dialog
      .open(ConfirmDialogComponent, {
        data: { titleKey: 'nutrition.confirm.deactivate-title', messageKey: 'nutrition.confirm.deactivate-message', confirmKey: 'nutrition.confirm.deactivate-action', destructive: true },
      })
      .afterClosed()
      .subscribe((ok) => ok && this.deactivate());
  }

  private deactivate(): void {
    const plan = this.plan();
    if (!plan) return;
    this.busy.set(true);
    this.api.deactivate(plan.planId).subscribe({
      next: () => {
        this.busy.set(false);
        this.snack.open(this.translate.instant('nutrition.plan.deactivated'), undefined, { duration: 4000, panelClass: 'success-snackbar' });
        if (this.mode === 'active') {
          // GET /active now answers 404 by design; the plan stays readable by id.
          this.plan.set(null);
          this.noActive.set(true);
        } else {
          this.load();
        }
      },
      error: (e) => {
        this.busy.set(false);
        this.showError(e);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set('');
    this.noActive.set(false);
    const request = this.mode === 'active' ? this.api.active(this.petId()) : this.api.get(this.route.snapshot.paramMap.get('planId') ?? '');
    request.subscribe({
      next: (plan) => {
        this.plan.set(plan);
        if (!this.petId() && plan.petId) this.petId.set(plan.petId);
        if (!this.clinicId() && plan.clinicId) this.clinicId.set(plan.clinicId);
        this.loading.set(false);
      },
      error: (e) => {
        this.loading.set(false);
        if (this.mode === 'active' && describeApiError(e).status === 404) this.noActive.set(true);
        else this.showError(e);
      },
    });
  }

  private showError(e: unknown): void {
    const info = describeApiError(e);
    const text = this.translate.instant(info.key) as string;
    this.error.set(info.detail ? `${text} ${info.detail}` : text);
  }
}
