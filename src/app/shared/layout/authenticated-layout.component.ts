import { Component, signal, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

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
    return this.roleLabel.charAt(0);
  }

  protected toggleSidebar(): void {
    this.collapsed.update((value) => !value);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
