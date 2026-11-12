import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClinicalService } from './clinical.service';
import { ClinicalEvolution, EvolutionEntry } from './clinical.models';

interface IndicatorGroup { label: string; unit: string; entries: EvolutionEntry[]; }

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
  lastAttentionDate = '';
  tab: 'summary' | 'evolution' | 'history' = 'summary';
  evolution?: ClinicalEvolution;
  indicatorGroups: IndicatorGroup[] = [];
  loadingEvolution = false;
  evolutionError = '';

get isValidPatientId(): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.petId);
}

  ngOnInit(): void {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    this.clinicId = this.route.snapshot.queryParamMap.get('clinicId') || '';
    this.name = this.route.snapshot.queryParamMap.get('name') || 'Paciente';
    this.species = this.route.snapshot.queryParamMap.get('species') || '';
    this.lastAttentionDate = this.route.snapshot.queryParamMap.get('lastAttentionDate') || '';
  }

selectTab(tab: 'summary' | 'evolution' | 'history'): void {
  this.tab = tab;

  if (tab === 'evolution') {
    if (!this.isValidPatientId) {
      this.evolutionError = 'El identificador del paciente no es válido.';
    } else if (!this.clinicId) {
      this.evolutionError = 'Selecciona un paciente desde una clínica autorizada para consultar su evolución.';
    } else if (!this.evolution && !this.loadingEvolution) {
      this.loadEvolution();
    }
  }
}

  loadEvolution(): void {
    if (!this.clinicId) {
      this.evolutionError = 'Abre este paciente desde una clínica para consultar su evolución.';
      return;
    }
    this.loadingEvolution = true;
    this.evolutionError = '';
    this.api.evolution(this.petId, this.clinicId).subscribe({
      next: data => {
        this.evolution = data;
        const groups = new Map<string, IndicatorGroup>();
        for (const entry of data.entries || []) {
          const key = `${entry.indicatorName}\u0000${entry.unit}`;
          if (!groups.has(key)) groups.set(key, {label: entry.indicatorName, unit: entry.unit, entries: []});
          groups.get(key)!.entries.push(entry);
        }
        this.indicatorGroups = [...groups.values()].map(group => ({
          ...group,
          entries: group.entries.sort((a, b) => new Date(a.attentionDate).getTime() - new Date(b.attentionDate).getTime()),
        }));
        this.loadingEvolution = false;
      },
      error: (err: {status?: number}) => {
        this.loadingEvolution = false;
        this.evolutionError = err.status === 403
          ? 'No tienes autorización para consultar la evolución de esta mascota.'
          : err.status === 404 ? 'No se encontró el paciente o su evolución.'
          : 'No se pudo consultar la evolución clínica.';
      },
    });
  }

  /** SVG coordinates are calculated from actual measurements, never generated as fake data. */
  points(group: IndicatorGroup): string {
    const values = group.entries.map(e => Number(e.value));
    if (!values.length) return '';
    const min = Math.min(...values), max = Math.max(...values);
    const range = max - min || 1;
    return values.map((v, i) => `${16 + (values.length === 1 ? 50 : i * 280 / (values.length - 1))},${108 - ((v - min) / range) * 80}`).join(' ');
  }
}
