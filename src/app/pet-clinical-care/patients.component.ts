import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ClinicalService } from './clinical.service';
import { ClinicItem, Patient, clinicId, patientId } from './clinical.models';

@Component({
  selector: 'app-clinical-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patients.component.html',
  styleUrl: './clinical.css',
})
export class PatientsComponent implements OnInit {
  private readonly api = inject(ClinicalService);
  readonly clinicId = clinicId;
  readonly patientId = patientId;
  clinics: ClinicItem[] = [];
  selectedClinic = '';
  search = '';
  patients: Patient[] = [];
  loading = false;
  error = '';
  clinicError = '';

  get filtered(): Patient[] {
    const query = this.search.trim().toLocaleLowerCase();
    return this.patients.filter(p => [p.name, p.species, p.breed, p.ownerName]
      .some(value => (value || '').toLocaleLowerCase().includes(query)));
  }

  ngOnInit(): void {
    this.api.clinics().subscribe({
      next: data => {
        this.clinics = Array.isArray(data.items) ? data.items : [];
        if (this.clinics.length) {
          this.selectedClinic = clinicId(this.clinics[0]);
          this.loadPatients();
        }
      },
      error: err => { this.clinicError = this.message(err); },
    });
  }

  loadPatients(): void {
    if (!this.selectedClinic) return;
    this.loading = true;
    this.error = '';
    this.patients = [];
    this.api.patients(this.selectedClinic).pipe(finalize(() => this.loading = false)).subscribe({
      next: result => { this.patients = Array.isArray(result) ? result : (result.items || []); },
      error: err => { this.error = this.message(err); },
    });
  }

  private message(err: { status?: number }): string {
    if (err.status === 401) return 'La sesión no es válida o ha expirado. Inicia sesión de nuevo.';
    if (err.status === 403) return 'Tu cuenta no tiene acceso a los pacientes de esta clínica.';
    return 'No pudimos cargar los datos. Comprueba el backend, el proxy y tu conexión.';
  }
}
