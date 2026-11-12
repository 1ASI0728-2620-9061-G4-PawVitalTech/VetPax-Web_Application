import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AuthCallbackComponent } from './auth/auth-callback.component';
import { SignInComponent } from './public/pages/signin.component/signin.component';
import { SignUpComponent } from './public/pages/signup.component/signup.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AgendaComponent } from './appointment-management/agenda.component';
import { ClinicComponent } from './clinic-management/clinic.component';

export const routes: Routes = [
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
  { path: 'sign-in', component: SignInComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'agenda', component: AgendaComponent, canActivate: [authGuard] },
  { path: 'clinic', component: ClinicComponent, canActivate: [authGuard] },
  {
    path: 'medication',
    canActivate: [authGuard],
    loadChildren: () =>
      import('./medication-treatment/medication.routes').then(
        (m) => m.MEDICATION_ROUTES,
      ),
  },
  {
    path: 'nutrition',
    canActivate: [authGuard],
    loadChildren: () => import('./nutrition-management/nutrition.routes').then((m) => m.NUTRITION_ROUTES),
  },
  { path: '**', redirectTo: 'sign-in' },
];
