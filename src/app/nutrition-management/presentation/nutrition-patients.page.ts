import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { PatientPick, PatientPickerComponent } from '../../shared/care/patient-picker.component';

@Component({
  selector: 'app-nutrition-patients-page',
  standalone: true,
  imports: [TranslateModule, PatientPickerComponent],
  template: `
    <div class="care-page-head">
      <div>
        <h2>{{ 'nutrition.title' | translate }}</h2>
        <p class="care-sub">{{ 'nutrition.patients.subtitle' | translate }}</p>
      </div>
    </div>
    <app-patient-picker (picked)="open($event)" />
  `,
})
export class NutritionPatientsPage {
  private readonly router = inject(Router);

  protected open(pick: PatientPick): void {
    void this.router.navigate(['/nutrition/patients', pick.patient.petId], { queryParams: { clinicId: pick.clinicId } });
  }
}
