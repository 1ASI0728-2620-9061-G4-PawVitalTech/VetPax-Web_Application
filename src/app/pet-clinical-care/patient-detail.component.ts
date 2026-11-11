import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClinicalService } from './clinical.service';
import { ClinicalEvolution } from './clinical.models';

@Component({
  selector: 'app-clinical-patient-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './patient-detail.component.html',
  styleUrl: './clinical.css',
})
export class PatientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ClinicalService);
  petId = '';
  clinicId = '';
  name = '';
  species = '';
  breed = '';
  tab: 'summary' | 'evolution' | 'history' = 'summary';
  evolution?: ClinicalEvolution;
  loadingEvolution = false;
  evolutionError = '';

  ngOnInit(): void {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    this.clinicId = this.route.snapshot.queryParamMap.get('clinicId') || '';
    this.name = this.route.snapshot.queryParamMap.get('name') || 'Paciente';
    this.species = this.route.snapshot.queryParamMap.get('species') || '';
    this.breed = this.route.snapshot.queryParamMap.get('breed') || '';
    if (!this.clinicId) this.evolutionError = 'Abre el paciente desde el listado para conservar la clínica seleccionada.';
  }

  selectTab(tab: 'summary' | 'evolution' | 'history'): void {
    this.tab = tab;
    if (tab === 'evolution' && this.clinicId) this.loadEvolution();
  }

  loadEvolution(): void {
    this.loadingEvolution = true;
    this.evolutionError = '';
    this.api.evolution(this.petId, this.clinicId).subscribe({
      next: data => { this.evolution = data; this.loadingEvolution = false; },
      error: err => {
        this.loadingEvolution = false;
        this.evolutionError = err.status === 403
          ? 'No tienes autorización para consultar la evolución de esta mascota.'
          : 'No se pudo consultar la evolución clínica.';
      },
    });
  }
}
