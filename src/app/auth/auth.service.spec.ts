import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService, buildKeycloakAuthorizationUrl } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };

  beforeEach(() => {
    sessionStorage.clear();
    router.navigateByUrl.mockClear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('stores the access token after completing the authorization code flow', async () => {
    sessionStorage.setItem('vetpax_web_oauth_state', 'expected-state');
    sessionStorage.setItem('vetpax_web_oauth_verifier', 'verifier');

    const completion = service.completeLogin('authorization-code', 'expected-state');
    const request = http.expectOne(
      `${environment.keycloakUrl}/realms/${environment.keycloakRealm}/protocol/openid-connect/token`,
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body.get('code')).toBe('authorization-code');
    expect(request.request.body.get('code_verifier')).toBe('verifier');
    request.flush({
      access_token: 'access-token',
      expires_in: 300,
      token_type: 'Bearer',
    });

    await completion;

    expect(sessionStorage.getItem('vetpax_web_access_token')).toBe('access-token');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard', { replaceUrl: true });
  });

  it('forces credential entry and preserves the requested email in the authorization URL', () => {
    const url = new URL(
      buildKeycloakAuthorizationUrl(
        'https://identity.example/realms/vetpax/protocol/openid-connect',
        'vetpax-dev',
        'https://web.example/auth/callback',
        'oauth-state',
        'pkce-challenge',
        ' owner@example.com ',
      ),
    );

    expect(url.pathname).toBe('/realms/vetpax/protocol/openid-connect/auth');
    expect(url.searchParams.get('client_id')).toBe('vetpax-dev');
    expect(url.searchParams.get('redirect_uri')).toBe('https://web.example/auth/callback');
    expect(url.searchParams.get('state')).toBe('oauth-state');
    expect(url.searchParams.get('code_challenge')).toBe('pkce-challenge');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('prompt')).toBe('login');
    expect(url.searchParams.get('login_hint')).toBe('owner@example.com');
  });
});
