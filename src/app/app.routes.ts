
import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AuthCallbackComponent } from './auth/auth-callback.component';
import { SignInComponent } from './public/pages/signin.component/signin.component';
import { SignUpComponent } from './public/pages/signup.component/signup.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AgendaComponent } from './appointment-management/agenda.component';
import { ClinicComponent } from './clinic-management/clinic.component';
import { AuthenticatedLayoutComponent } from './shared/layout/authenticated-layout.component';

export const routes: Routes = [
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
  { path: 'sign-in', component: SignInComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },

  {
    path: '',
    canActivate: [authGuard],
    component: AuthenticatedLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'agenda', component: AgendaComponent },
      { path: 'clinic', component: ClinicComponent },
      {
        path: 'medication',
        loadChildren: () =>
          import('./medication-treatment/medication.routes').then((m) => m.MEDICATION_ROUTES),
      },
      {
        path: 'nutrition',
        loadChildren: () =>
          import('./nutrition-management/nutrition.routes').then((m) => m.NUTRITION_ROUTES),
      },
      {
        path: 'patients',
        loadComponent: () =>
          import('./pet-clinical-care/patients.component').then((m) => m.PatientsComponent),
      },
      {
        path: 'patients/:petId',
        loadComponent: () =>
          import('./pet-clinical-care/patient-detail.component').then((m) => m.PatientDetailComponent),
      },
      {
        path: 'patients/:petId/attention',
        loadComponent: () =>
          import('./pet-clinical-care/attention.component').then((m) => m.AttentionComponent),
      },
    ],
  },

  { path: '**', redirectTo: 'sign-in' },
];
