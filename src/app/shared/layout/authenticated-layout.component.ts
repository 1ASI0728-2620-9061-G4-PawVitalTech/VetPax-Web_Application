import { Component, signal, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ClinicContextService } from '../clinic-context.service';
import { userDisplayName } from '../user-claims';

interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  roles: readonly string[];
}

@Component({
  selector: 'app-authenticated-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule],
  templateUrl: './authenticated-layout.component.html',
  styleUrl: './authenticated-layout.component.css',
})
export class AuthenticatedLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly clinicContext = inject(ClinicContextService);

  protected readonly clinicName = signal('');
  protected readonly userName = userDisplayName(this.auth.accessToken);

  constructor() {
    if (this.auth.hasRole('veterinarian') || this.auth.hasRole('clinic_administrator')) {
      this.clinicContext.clinics().subscribe({
        next: (clinics) => this.clinicName.set(clinics[0]?.name ?? ''),
        error: () => undefined,
      });
    }
  }

  protected get canSearch(): boolean {
    return this.auth.hasRole('veterinarian');
  }

  protected search(value: string): void {
    const q = value.trim();
    void this.router.navigate(['/patients'], { queryParams: q ? { q } : {} });
  }

  protected readonly collapsed = signal(
    typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches,
  );

  private readonly navigation: NavigationItem[] = [
    { label: 'Pacientes', path: '/patients', icon: '🐾', roles: ['veterinarian'] },
    { label: 'Agenda', path: '/agenda', icon: '📅', roles: ['veterinarian'] },
    { label: 'Medicación', path: '/medication', icon: '💊', roles: ['veterinarian'] },
    { label: 'Nutrición', path: '/nutrition', icon: '🥣', roles: ['veterinarian'] },
    { label: 'Clínica', path: '/clinic', icon: '🏥', roles: ['clinic_administrator'] },
  ];

  protected readonly visibleNavigation = this.navigation.filter((item) =>
    item.roles.some((role) => this.auth.hasRole(role)),
  );

  protected get roleLabel(): string {
    if (this.auth.hasRole('clinic_administrator')) return 'Administrador de clínica';
    if (this.auth.hasRole('veterinarian')) return 'Veterinario';
    if (this.auth.hasRole('owner')) return 'Propietario';
    return 'Usuario';
  }

  protected get roleInitial(): string {
    return (this.userName || this.roleLabel).charAt(0).toUpperCase();
  }

  protected toggleSidebar(): void {
    this.collapsed.update((value) => !value);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
