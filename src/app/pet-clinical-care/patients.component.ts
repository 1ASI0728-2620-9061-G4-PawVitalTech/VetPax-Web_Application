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
  loadingClinics = false;
  loading = false;
  error = '';
  clinicError = '';

  get filtered(): Patient[] {
    const query = this.search.trim().toLocaleLowerCase();
    return this.patients.filter(p => [p.name, p.species]
      .some(value => (value || '').toLocaleLowerCase().includes(query)));
  }

  ngOnInit(): void { this.loadClinics(); }

  loadClinics(): void {
    this.loadingClinics = true;
    this.clinicError = '';
    this.api.clinics().pipe(finalize(() => this.loadingClinics = false)).subscribe({
      next: data => {
        this.clinics = Array.isArray(data.items) ? data.items.filter(c => !!clinicId(c)) : [];
        if (!this.clinics.some(c => clinicId(c) === this.selectedClinic)) {
          this.selectedClinic = this.clinics.length ? clinicId(this.clinics[0]) : '';
        }
        if (this.selectedClinic) this.loadPatients();
        else this.patients = [];
      },
      error: err => { this.clinics = []; this.patients = []; this.clinicError = this.message(err); },
    });
  }

  loadPatients(): void {
    if (!this.selectedClinic) { this.patients = []; return; }
    this.loading = true;
    this.error = '';
    this.patients = [];
    this.api.patients(this.selectedClinic).pipe(finalize(() => this.loading = false)).subscribe({
      next: result => {
        this.patients = Array.isArray(result.patients) ? result.patients : [];
      },
      error: err => { this.error = this.message(err); },
    });
  }

  private message(err: { status?: number }): string {
    if (err.status === 401) return 'La sesión ha expirado. Inicia sesión nuevamente.';
    if (err.status === 403) return 'Tu usuario no tiene acceso a los pacientes de esta clínica.';
    if (err.status === 404) return 'La clínica seleccionada no existe.';
    return 'No se pudieron cargar los datos. Comprueba la conexión con la API.';
  }
}
