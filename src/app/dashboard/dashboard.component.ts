import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth/auth.service';

interface DashboardLink {
  title: string;
  description: string;
  path: string;
  icon: string;
  group: 'clinical' | 'management';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly links: DashboardLink[] = [
    { title: 'Pacientes', description: 'Consultar pacientes, historial y evolución clínica.', path: '/patients', icon: '🐾', group: 'clinical' },
    { title: 'Agenda', description: 'Consultar citas y organizar las atenciones.', path: '/agenda', icon: '📅', group: 'clinical' },
    { title: 'Medicación', description: 'Consultar y gestionar tratamientos prescritos.', path: '/medication', icon: '💊', group: 'clinical' },
    { title: 'Nutrición', description: 'Consultar y gestionar planes alimentarios.', path: '/nutrition', icon: '🥣', group: 'clinical' },
    { title: 'Clínica', description: 'Administrar información y horarios de la clínica.', path: '/clinic', icon: '🏥', group: 'management' },
  ];

  get clinicalLinks(): DashboardLink[] {
    return this.links.filter(link => link.group === 'clinical');
  }

  get managementLinks(): DashboardLink[] {
    return this.links.filter(link => link.group === 'management');
  }

  // Modules are developed in separate branches. Do not navigate to a missing route:
  // Angular's wildcard route would otherwise return the user to sign-in.
  hasRoute(path: string): boolean {
    const firstSegment = path.replace(/^\//, '').split('/')[0];
    return this.router.config.some(route => route.path === firstSegment);
  }

  logout(): void {
    this.auth.logout();
  }
}
