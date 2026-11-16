import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { AppointmentService } from '../appointment-management/appointment.service';
import { AgendaAppointment } from '../appointment-management/appointment.models';
import { ClinicService } from '../clinic-management/clinic.service';
import { CareDirectoryService } from '../shared/care/care-directory.service';
import { PatientSummary } from '../shared/care/care.models';
import { ClinicContextService } from '../shared/clinic-context.service';
import { addDays, formatLong, formatShort, toApiDate } from '../shared/date-es';
import { speciesEmoji, speciesLabel } from '../shared/species';
import { userDisplayName } from '../shared/user-claims';

interface QuickLink { title: string; description: string; path: string; icon: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly clinicContext = inject(ClinicContextService);
  private readonly directory = inject(CareDirectoryService);
  private readonly appointments = inject(AppointmentService);
  private readonly clinicService = inject(ClinicService);

  readonly speciesEmoji = speciesEmoji;
  readonly speciesLabel = speciesLabel;
  readonly formatShort = formatShort;

  readonly isVeterinarian = this.auth.hasRole('veterinarian');
  readonly isAdministrator = this.auth.hasRole('clinic_administrator');
  readonly userName = userDisplayName(this.auth.accessToken);
  readonly todayLabel = formatLong(new Date());

  loading = false;
  error = '';
  clinicName = '';
  clinicId = '';
  clinicCount = 0;
  vetCount = 0;
  patients: PatientSummary[] = [];
  agenda: AgendaAppointment[] = [];
  listDay: 'today' | 'tomorrow' = 'today';

  readonly quickLinks: QuickLink[] = [
    { title: 'Pacientes', description: 'Expedientes, historial y evolución.', path: '/patients', icon: '🐾' },
    { title: 'Agenda', description: 'Citas de la semana.', path: '/agenda', icon: '📅' },
    { title: 'Medicación', description: 'Tratamientos prescritos.', path: '/medication', icon: '💊' },
    { title: 'Nutrición', description: 'Planes alimentarios.', path: '/nutrition', icon: '🥣' },
  ];

  get greeting(): string {
    const hour = new Date().getHours();
    const base = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
    return this.userName ? `${base}, ${this.userName}` : base;
  }

  private dayKey(offset: number): string { return toApiDate(addDays(new Date(), offset)); }
  private byTime = (a: AgendaAppointment, b: AgendaAppointment): number => a.startTime.localeCompare(b.startTime);

  private forDay(offset: number): AgendaAppointment[] {
    const key = this.dayKey(offset);
    return this.agenda.filter((a) => a.date === key).sort(this.byTime);
  }

  get todayActive(): AgendaAppointment[] { return this.forDay(0).filter((a) => a.status.toLowerCase() !== 'cancelled'); }
  get todayPending(): AgendaAppointment[] { return this.todayActive.filter((a) => a.status.toLowerCase() === 'pending'); }
  get todayAttended(): number { return this.todayActive.filter((a) => a.status.toLowerCase() === 'attended').length; }
  get progress(): number { return this.todayActive.length ? Math.round((this.todayAttended / this.todayActive.length) * 100) : 0; }
  get listItems(): AgendaAppointment[] { return this.forDay(this.listDay === 'today' ? 0 : 1); }

  get nextAppointment(): AgendaAppointment | undefined {
    const now = new Date();
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return this.todayPending.find((a) => a.startTime.slice(0, 5) >= current);
  }

  get recentPatients(): PatientSummary[] {
    return [...this.patients]
      .sort((a, b) => (b.lastAttentionDate ?? '').localeCompare(a.lastAttentionDate ?? ''))
      .slice(0, 5);
  }

  time(value: string): string { return value.slice(0, 5); }

  statusLabel(status: string): string {
    return ({ pending: 'Programada', attended: 'Atendida', cancelled: 'Cancelada' } as Record<string, string>)[status.toLowerCase()] ?? status;
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    if (!this.isVeterinarian && !this.isAdministrator) return;
    this.loading = true;
    this.error = '';
    this.clinicContext.clinics().pipe(
      switchMap((clinics) => {
        this.clinicCount = clinics.length;
        if (!clinics.length) return of(null);
        const clinic = clinics[0];
        this.clinicId = clinic.clinicId;
        this.clinicName = clinic.name;
        return forkJoin({
          patients: this.isVeterinarian ? this.directory.listPatients(clinic.clinicId) : of([] as PatientSummary[]),
          agenda: this.isVeterinarian
            ? this.appointments.agenda(clinic.clinicId, this.dayKey(0), this.dayKey(1)).pipe(map((r) => r.appointments ?? []))
            : of([] as AgendaAppointment[]),
          vets: this.isAdministrator ? this.clinicService.veterinarians(clinic.clinicId) : of([]),
        });
      }),
      finalize(() => (this.loading = false)),
    ).subscribe({
      next: (result) => {
        if (!result) return;
        this.patients = result.patients;
        this.agenda = result.agenda;
        this.vetCount = result.vets.length;
      },
      error: (e: HttpErrorResponse) => {
        this.error = e.status === 401 ? 'La sesión expiró. Inicia sesión nuevamente.'
          : e.status === 403 ? 'Tu usuario no tiene una clínica asignada.'
          : 'No se pudo conectar con la API.';
      },
    });
  }

  patientQuery(p: PatientSummary): Record<string, string> {
    return { clinicId: this.clinicId, name: p.name, species: p.species ?? '', lastAttentionDate: p.lastAttentionDate ?? '' };
  }
}
