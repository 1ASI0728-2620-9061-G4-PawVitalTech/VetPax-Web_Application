import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { TranslateModule } from '@ngx-translate/core';
import { describeApiError } from '../../core/http/api-error';
import { TranslateService } from '@ngx-translate/core';
import { CareDirectoryService } from './care-directory.service';
import { ClinicSummary, PatientSummary } from './care.models';
import { PatientContextService } from './patient-context.service';
import { formatDate, shortId } from './care.utils';

export interface PatientPick {
  clinicId: string;
  patient: PatientSummary;
}

/** Step 1 of every care flow: choose clinic, then one of its authorized patients. */
@Component({
  selector: 'app-patient-picker',
  standalone: true,
  imports: [FormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule, MatIconModule, MatTableModule, MatProgressBarModule, TranslateModule],
  template: `
    <section class="care-card">
      <div class="care-form-grid">
        <mat-form-field>
          <mat-label>{{ 'care.picker.clinic' | translate }}</mat-label>
          <mat-icon matPrefix>local_hospital</mat-icon>
          <mat-select [ngModel]="clinicId()" (ngModelChange)="onClinic($event)">
            @for (c of clinics(); track c.clinicId) { <mat-option [value]="c.clinicId">{{ c.name }}</mat-option> }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>{{ 'care.picker.search' | translate }}</mat-label>
          <mat-icon matPrefix>search</mat-icon>
          <input matInput [ngModel]="query()" (ngModelChange)="query.set($event)" [disabled]="!clinicId()" />
        </mat-form-field>
      </div>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }
      @if (error()) { <div class="care-error" role="alert"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div> }

      @if (!loading() && !error()) {
        @if (!clinicId()) {
          <div class="care-empty"><mat-icon>local_hospital</mat-icon><p>{{ 'care.picker.choose-clinic' | translate }}</p></div>
        } @else if (filtered().length === 0) {
          <div class="care-empty"><mat-icon>pets</mat-icon><p>{{ 'care.picker.no-patients' | translate }}</p></div>
        } @else {
          <table mat-table [dataSource]="filtered()" class="care-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>{{ 'care.picker.patient' | translate }}</th>
              <td mat-cell *matCellDef="let p"><strong>{{ label(p) }}</strong></td>
            </ng-container>
            <ng-container matColumnDef="species">
              <th mat-header-cell *matHeaderCellDef>{{ 'care.picker.species' | translate }}</th>
              <td mat-cell *matCellDef="let p">{{ p.species || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="last">
              <th mat-header-cell *matHeaderCellDef>{{ 'care.picker.last-attention' | translate }}</th>
              <td mat-cell *matCellDef="let p">{{ p.lastAttentionDate ? fmtDate(p.lastAttentionDate) : '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let p"><button mat-flat-button color="primary" type="button" (click)="choose(p)">{{ 'care.picker.select' | translate }}</button></td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        }
      }
    </section>
  `,
})
export class PatientPickerComponent implements OnInit {
  @Output() readonly picked = new EventEmitter<PatientPick>();

  private readonly directory = inject(CareDirectoryService);
  private readonly context = inject(PatientContextService);
  private readonly translate = inject(TranslateService);

  protected readonly columns = ['name', 'species', 'last', 'action'];
  protected readonly clinics = signal<ClinicSummary[]>([]);
  protected readonly patients = signal<PatientSummary[]>([]);
  protected readonly clinicId = signal<string | null>(this.context.clinicId());
  protected readonly query = signal('');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return q ? this.patients().filter((p) => `${p.name} ${p.species ?? ''} ${p.breed ?? ''}`.toLowerCase().includes(q)) : this.patients();
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.directory.listClinics().subscribe({
      next: (clinics) => {
        this.clinics.set(clinics);
        const current = this.clinicId();
        if (current && clinics.some((c) => c.clinicId === current)) this.loadPatients(current);
        else {
          if (clinics.length === 1) this.onClinic(clinics[0].clinicId);
          else this.loading.set(false);
        }
      },
      error: (e) => this.fail(e),
    });
  }

  protected onClinic(id: string): void {
    this.clinicId.set(id);
    this.context.setClinic(id);
    this.loadPatients(id);
  }

  protected fmtDate = (d: string) => formatDate(d);

  protected label(p: PatientSummary): string {
    return p.name || `${this.translate.instant('care.picker.patient')} ${shortId(p.petId)}`;
  }

  protected choose(patient: PatientSummary): void {
    const clinicId = this.clinicId();
    if (clinicId) this.picked.emit({ clinicId, patient });
  }

  private loadPatients(clinicId: string): void {
    this.loading.set(true);
    this.error.set('');
    this.directory.listPatients(clinicId).subscribe({
      next: (list) => {
        this.patients.set(list);
        this.context.remember(list);
        this.loading.set(false);
      },
      error: (e) => this.fail(e),
    });
  }

  private fail(e: unknown): void {
    this.patients.set([]);
    this.error.set(this.translate.instant(describeApiError(e).key));
    this.loading.set(false);
  }
}
