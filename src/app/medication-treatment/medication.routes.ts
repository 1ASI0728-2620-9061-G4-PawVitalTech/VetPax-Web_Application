import { Routes } from '@angular/router';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { roleGuard } from '../core/auth/role.guard';
import { CareShellComponent } from '../shared/care/care-shell.component';

export const MEDICATION_ROUTES: Routes = [
  {
    path: '',
    component: CareShellComponent,
    canActivate: [roleGuard('veterinarian')],
    providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
    children: [
      {
        path: '',
        loadComponent: () => import('./presentation/medication-patients.page').then((m) => m.MedicationPatientsPage),
      },
      {
        path: 'patients/:petId',
        loadComponent: () => import('./presentation/medication-plans.page').then((m) => m.MedicationPlansPage),
      },
      {
        path: 'patients/:petId/new',
        loadComponent: () => import('./presentation/medication-plan-form.page').then((m) => m.MedicationPlanFormPage),
      },
      {
        path: 'plans/:planId',
        loadComponent: () => import('./presentation/medication-plan-detail.page').then((m) => m.MedicationPlanDetailPage),
      },
    ],
  },
];
