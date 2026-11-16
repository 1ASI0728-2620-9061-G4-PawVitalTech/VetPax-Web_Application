import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ClinicalService } from './clinical.service';
import { ClinicItem, Patient, clinicId, patientId } from './clinical.models';
import { formatShort } from '../shared/date-es';
import { SpeciesGroup, speciesEmoji, speciesGroup, speciesLabel } from '../shared/species';

@Component({
  selector: 'app-clinical-patients',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './patients.component.html',
  styleUrl: './clinical.css',
})
export class PatientsComponent implements OnInit {
  private readonly api = inject(ClinicalService);
  private readonly route = inject(ActivatedRoute);
  readonly clinicId = clinicId;
  readonly patientId = patientId;
  readonly speciesEmoji = speciesEmoji;
  readonly speciesLabel = speciesLabel;
  readonly formatShort = formatShort;
  clinics: ClinicItem[] = [];
  selectedClinic = '';
  search = '';
  speciesFilter: 'all' | SpeciesGroup = 'all';
  period: 'all' | '7d' | '30d' = 'all';
  view: 'list' | 'grid' = 'list';
  patients: Patient[] = [];
  loadingClinics = false;
  loading = false;
  error = '';
  clinicError = '';

  get filtered(): Patient[] {
    const query = this.search.trim().toLocaleLowerCase();
    const limit = this.period === 'all' ? 0 : Date.now() - (this.period === '7d' ? 7 : 30) * 86_400_000;
    return this.patients.filter((p) => {
      if (query && !(p.name || '').toLocaleLowerCase().includes(query) && !(p.species || '').toLocaleLowerCase().includes(query)) return false;
      if (this.speciesFilter !== 'all' && speciesGroup(p.species) !== this.speciesFilter) return false;
      if (limit) return !!p.lastAttentionDate && new Date(p.lastAttentionDate).getTime() >= limit;
      return true;
    });
  }

  count(group: SpeciesGroup): number { return this.patients.filter((p) => speciesGroup(p.species) === group).length; }
  percent(group: SpeciesGroup): string {
    return this.patients.length ? `${((this.count(group) / this.patients.length) * 100).toFixed(1)}% del total` : '—';
  }

  ngOnInit(): void {
    this.search = this.route.snapshot.queryParamMap.get('q') ?? '';
    this.loadClinics();
  }

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

  query(patient: Patient): Record<string, string> {
    return {
      clinicId: this.selectedClinic, name: patient.name, species: patient.species ?? '',
      lastAttentionDate: patient.lastAttentionDate ?? '',
    };
  }

  private message(err: { status?: number }): string {
    if (err.status === 401) return 'La sesión ha expirado. Inicia sesión nuevamente.';
    if (err.status === 403) return 'Tu usuario no tiene acceso a los pacientes de esta clínica.';
    if (err.status === 404) return 'La clínica seleccionada no existe.';
    return 'No se pudieron cargar los datos. Comprueba la conexión con la API.';
  }
}
