import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ClinicalService } from './clinical.service';
import { ClinicalEvolution, ClinicalRecordAttention, ClinicalRecordHistory, EvolutionEntry } from './clinical.models';
import { AppointmentService } from '../appointment-management/appointment.service';
import { AgendaAppointment } from '../appointment-management/appointment.models';
import { addDays, formatLong, formatShort, fromApiDate, toApiDate } from '../shared/date-es';
import { speciesEmoji, speciesLabel } from '../shared/species';

interface IndicatorGroup { label: string; unit: string; entries: EvolutionEntry[]; }
type Tab = 'summary' | 'evolution' | 'history';

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
  private readonly appointments = inject(AppointmentService);
  readonly speciesEmoji = speciesEmoji;
  readonly speciesLabel = speciesLabel;
  readonly formatShort = formatShort;

  petId = '';
  clinicId = '';
  name = '';
  species = '';
  lastAttentionDate = '';
  tab: Tab = 'summary';

  evolution?: ClinicalEvolution;
  indicatorGroups: IndicatorGroup[] = [];
  loadingEvolution = false;
  evolutionError = '';

  history?: ClinicalRecordHistory;
  loadingHistory = false;
  historyError = '';

  nextAppointment?: AgendaAppointment;
  nextAppointmentState: 'idle' | 'loading' | 'done' | 'error' = 'idle';

  get isValidPatientId(): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(this.petId);
  }

  get latestAttention(): ClinicalRecordAttention | undefined { return this.history?.attentions?.[0]; }

  ngOnInit(): void {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    this.clinicId = this.route.snapshot.queryParamMap.get('clinicId') || '';
    this.name = this.route.snapshot.queryParamMap.get('name') || 'Paciente';
    this.species = this.route.snapshot.queryParamMap.get('species') || '';
    this.lastAttentionDate = this.route.snapshot.queryParamMap.get('lastAttentionDate') || '';
    if (this.isValidPatientId && this.clinicId) {
      this.loadHistory();
      this.loadNextAppointment();
    }
  }

  selectTab(tab: Tab): void {
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

  nextAppointmentDate(a: AgendaAppointment): string { return formatLong(fromApiDate(a.date)); }

  loadNextAppointment(): void {
    this.nextAppointmentState = 'loading';
    const today = new Date();
    this.appointments.agenda(this.clinicId, toApiDate(today), toApiDate(addDays(today, 60))).subscribe({
      next: (agenda) => {
        const now = `${toApiDate(today)} ${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
        this.nextAppointment = (agenda.appointments ?? [])
          .filter((a) => a.petId === this.petId && a.status.toLowerCase() === 'pending' && `${a.date} ${a.startTime.slice(0, 5)}` >= now)
          .sort((x, y) => `${x.date} ${x.startTime}`.localeCompare(`${y.date} ${y.startTime}`))[0];
        this.nextAppointmentState = 'done';
      },
      error: () => (this.nextAppointmentState = 'error'),
    });
  }

  loadHistory(): void {
    if (!this.isValidPatientId || !this.clinicId) {
      this.historyError = 'Abre este paciente desde una clínica autorizada para consultar su historial.';
      return;
    }
    this.loadingHistory = true;
    this.historyError = '';
    this.api.clinicalRecords(this.petId, this.clinicId).subscribe({
      next: data => {
        const attentions = [...(data.attentions || [])].sort(
          (a, b) => new Date(b.attentionDate).getTime() - new Date(a.attentionDate).getTime(),
        );
        this.history = { ...data, attentions };
        this.loadingHistory = false;
      },
      error: (err: {status?: number}) => {
        this.loadingHistory = false;
        this.historyError = err.status === 403
          ? 'No tienes autorización para consultar el historial de esta mascota.'
          : err.status === 404 ? 'No se encontró el historial de este paciente.'
          : 'No se pudo consultar el historial clínico.';
      },
    });
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
