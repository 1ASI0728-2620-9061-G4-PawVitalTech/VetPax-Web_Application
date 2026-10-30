import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

const ACCESS_TOKEN_KEY = 'vetpax_web_access_token';
const EXPIRY_KEY = 'vetpax_web_token_expires_at';
const OAUTH_STATE_KEY = 'vetpax_web_oauth_state';
const OAUTH_VERIFIER_KEY = 'vetpax_web_oauth_verifier';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private get realmUrl(): string {
    return `${environment.keycloakUrl}/realms/${environment.keycloakRealm}/protocol/openid-connect`;
  }

  private get redirectUri(): string {
    return `${window.location.origin}/auth/callback`;
  }

  get isAuthenticated(): boolean {
    const token = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    const expiresAt = Number(sessionStorage.getItem(EXPIRY_KEY) || '0');
    return Boolean(token && expiresAt > Date.now());
  }

  get accessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  }

  /** Starts the secure browser login. The user enters their password in Keycloak. */
  async startLogin(email?: string): Promise<void> {
    const state = randomBase64Url(32);
    const verifier = randomBase64Url(32);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const challenge = base64Url(new Uint8Array(hash));
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    sessionStorage.setItem(OAUTH_VERIFIER_KEY, verifier);

    const params = new URLSearchParams({
      client_id: environment.keycloakClientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: 'openid profile email',
      state,
      code_challenge: challenge,
      code_challenge_method: 'S256',
    });
    if (email) params.set('login_hint', email.trim());
    window.location.assign(`${this.realmUrl}/auth?${params.toString()}`);
  }

  /** Exchanges an authorization code for a real Keycloak access token. */
  async completeLogin(code: string, returnedState: string): Promise<void> {
    const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY);
    const verifier = sessionStorage.getItem(OAUTH_VERIFIER_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_VERIFIER_KEY);

    if (!code || !returnedState || !expectedState || returnedState !== expectedState || !verifier) {
      throw new Error('Respuesta de autenticación inválida. Intenta iniciar sesión otra vez.');
    }

    const body = new HttpParams()
      .set('grant_type', 'authorization_code')
      .set('client_id', environment.keycloakClientId)
      .set('code', code)
      .set('code_verifier', verifier)
      .set('redirect_uri', this.redirectUri);

    const response = await firstValueFrom(
      this.http.post<KeycloakTokenResponse>(`${this.realmUrl}/token`, body),
    );
    if (!response.access_token || response.token_type.toLowerCase() !== 'bearer') {
      throw new Error('Keycloak no devolvió un token de acceso válido.');
    }

    sessionStorage.setItem(ACCESS_TOKEN_KEY, response.access_token);
    sessionStorage.setItem(EXPIRY_KEY, String(Date.now() + response.expires_in * 1000 - 15000));
    await this.router.navigateByUrl('/dashboard', { replaceUrl: true });
  }

  /** Public backend registration endpoint (creates a pet-owner account). */
  register(payload: { firstName: string; lastName: string; email: string; password: string }): Observable<unknown> {
    return this.http.post(`${environment.apiBaseUrl}/auth/register`, payload);
  }

  logout(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    sessionStorage.removeItem(OAUTH_VERIFIER_KEY);
    void this.router.navigateByUrl('/sign-in');
  }
}

function randomBase64Url(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
