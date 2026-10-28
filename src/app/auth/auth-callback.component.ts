import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  imports: [RouterLink],
  template: `
    <main class="callback" role="status">
      @if (errorMessage) {
        <p>{{ errorMessage }}</p>
        <a routerLink="/sign-in">Volver al inicio de sesión</a>
      } @else {
        <p>Completando inicio de sesión seguro...</p>
      }
    </main>
  `,
  styles: [`.callback { min-height:100vh; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; font-family:Arial,sans-serif; }`],
})
export class AuthCallbackComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  errorMessage = '';

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const reason = params.get('error_description') || params.get('error');
    if (reason) {
      this.errorMessage = 'No se pudo completar la autenticación. Intenta nuevamente.';
      return;
    }
    try {
      await this.auth.completeLogin(params.get('code') || '', params.get('state') || '');
    } catch (error) {
      console.error('OAuth callback failed', error);
      this.errorMessage = 'No se pudo validar la sesión con Keycloak. Revisa la configuración y vuelve a intentarlo.';
    }
  }
}
