import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

/**
 * Allows the route only when the session carries one of the given realm roles.
 * Informational only: the API is the authority and answers 403 when needed.
 */
export const roleGuard =
  (...roles: string[]): CanActivateFn =>
  () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthenticated) return router.createUrlTree(['/sign-in']);
    return roles.some((role) => auth.hasRole(role)) ? true : router.createUrlTree(['/dashboard']);
  };
