import { Component, OnInit, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin, map, of, switchMap } from 'rxjs';
import { CareDirectoryService } from '../shared/care/care-directory.service';
import { ClinicService } from '../clinic-management/clinic.service';
import { PatientSummary } from '../shared/care/care.models';
import { ClinicVeterinarian } from '../clinic-management/clinic.models';
import { Router, RouterLink } from '@angular/router';

type WebRole = 'veterinarian' | 'clinic_administrator' | 'owner' | 'unassigned';
interface DashboardLink {
  title: string;
  description: string;
  path: string;
  icon: string;
  group: 'clinical' | 'management';
  roles: ReadonlyArray<WebRole>;
}

// Only used to adapt the UI. Backend authorization is always authoritative.
function readKeycloakRoles(): string[] {
  const token = sessionStorage.getItem('vetpax_web_access_token');
  if (!token) return [];
  try {
    const part = token.split('.')[1];
    if (!part) return [];
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='))) as {
      realm_access?: { roles?: unknown };
      exp?: number;
    };
    if (typeof payload.exp !== 'number' || payload.exp * 1000 <= Date.now()) return [];
    return Array.isArray(payload.realm_access?.roles)
      ? payload.realm_access.roles.filter((role): role is string => typeof role === 'string')
      : [];
  } catch {
    return [];
  }
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly directory = inject(CareDirectoryService);
  private readonly clinicService = inject(ClinicService);

  stats: { label: string; value: number }[] = [];
  statsLoading = false;
  statsError = '';  private readonly realmRoles = readKeycloakRoles();

  readonly role: WebRole = this.realmRoles.includes('clinic_administrator')
    ? 'clinic_administrator'
    : this.realmRoles.includes('veterinarian')
      ? 'veterinarian'
      : this.realmRoles.includes('owner')
        ? 'owner'
        : 'unassigned';

  readonly links: DashboardLink[] = [
    { title: 'Pacientes', description: 'Consultar pacientes, historial y evolución clínica.', path: '/patients', icon: '🐾', group: 'clinical', roles: ['veterinarian'] },
    { title: 'Agenda', description: 'Consultar citas y organizar las atenciones.', path: '/agenda', icon: '📅', group: 'clinical', roles: ['veterinarian'] },
    { title: 'Medicación', description: 'Consultar y gestionar tratamientos prescritos.', path: '/medication', icon: '💊', group: 'clinical', roles: ['veterinarian'] },
    { title: 'Nutrición', description: 'Consultar y gestionar planes alimentarios.', path: '/nutrition', icon: '🥣', group: 'clinical', roles: ['veterinarian'] },
    { title: 'Clínica', description: 'Administrar perfil, horarios y asignaciones de veterinarios.', path: '/clinic', icon: '🏥', group: 'management', roles: ['clinic_administrator'] },
  ];
  ngOnInit(): void {
    this.loadStats();
  }

  private loadStats(): void {
    if (!this.isVeterinarian && !this.isAdministrator) return;
    this.statsLoading = true;
    this.statsError = '';

    this.directory
      .listClinics()
      .pipe(
        switchMap((clinics) => {
          if (!clinics.length) {
            return of({
              clinics,
              patients: [] as PatientSummary[],
              vets: [] as ClinicVeterinarian[],
            });
          }
          const clinicId = clinics[0].clinicId;
          return forkJoin({
            patients: this.isVeterinarian
              ? this.directory.listPatients(clinicId)
              : of([] as PatientSummary[]),
            vets: this.isAdministrator
              ? this.clinicService.veterinarians(clinicId)
              : of([] as ClinicVeterinarian[]),
          }).pipe(map((r) => ({ clinics, ...r })));
        }),
        finalize(() => (this.statsLoading = false)),
      )
      .subscribe({
        next: ({ clinics, patients, vets }) => {
          this.stats = this.isAdministrator
            ? [
                { label: 'Clínicas', value: clinics.length },
                { label: 'Veterinarios asignados', value: vets.length },
              ]
            : [
                { label: 'Clínicas disponibles', value: clinics.length },
                { label: 'Pacientes en la clínica', value: patients.length },
              ];
        },
        error: (e: HttpErrorResponse) => {
          this.statsError =
            e.status === 401
              ? 'La sesión expiró. Inicia sesión nuevamente.'
              : e.status === 403
                ? 'Tu usuario no tiene una clínica asignada.'
                : 'No se pudo conectar con la API.';
        },
      });
  }
  get visibleLinks(): DashboardLink[] { return this.links.filter(link => link.roles.includes(this.role)); }
  get clinicalLinks(): DashboardLink[] { return this.visibleLinks.filter(link => link.group === 'clinical'); }
  get managementLinks(): DashboardLink[] { return this.visibleLinks.filter(link => link.group === 'management'); }
  get isVeterinarian(): boolean { return this.role === 'veterinarian'; }
  get isAdministrator(): boolean { return this.role === 'clinic_administrator'; }
  get roleLabel(): string {
    if (this.isVeterinarian) return 'Veterinario';
    if (this.isAdministrator) return 'Administrador de clínica';
    return this.role === 'owner' ? 'Propietario' : 'Rol sin acceso Web';
  }
  get greeting(): string {
    return this.isAdministrator ? 'Gestiona tu clínica, todo en un solo lugar'
      : 'Tu clínica, todo en un solo lugar';
  }

  // A route's presence is not permission to use it: we filter by role first.
  hasRoute(path: string): boolean {
    const firstSegment = path.replace(/^\//, '').split('/')[0];
    return this.router.config.some(
      (route) =>
        route.path === firstSegment ||
        route.children?.some((child) => child.path === firstSegment),
    );
    }
}
