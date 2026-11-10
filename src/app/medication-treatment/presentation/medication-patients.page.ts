import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PatientPick, PatientPickerComponent } from '../../shared/care/patient-picker.component';

@Component({
  selector: 'app-medication-patients-page',
  standalone: true,
  imports: [TranslateModule, PatientPickerComponent],
  template: `
    <div class="care-page-head">
      <div>
        <h2>{{ 'medication.title' | translate }}</h2>
        <p class="care-sub">{{ 'medication.patients.subtitle' | translate }}</p>
      </div>
    </div>
    <app-patient-picker (picked)="open($event)" />
  `,
})
export class MedicationPatientsPage {
  private readonly router = inject(Router);

  protected open(pick: PatientPick): void {
    void this.router.navigate(['/medication/patients', pick.patient.petId], { queryParams: { clinicId: pick.clinicId } });
  }
}
