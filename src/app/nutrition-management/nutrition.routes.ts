import { Routes } from '@angular/router';
import { MAT_DATE_LOCALE } from '@angular/material/core';
import { roleGuard } from '../core/auth/role.guard';
import { CareShellComponent } from '../shared/care/care-shell.component';

export const NUTRITION_ROUTES: Routes = [
  {
    path: '',
    component: CareShellComponent,
    canActivate: [roleGuard('veterinarian')],
    providers: [{ provide: MAT_DATE_LOCALE, useValue: 'es-PE' }],
    children: [
      {
        path: '',
        loadComponent: () => import('./presentation/nutrition-patients.page').then((m) => m.NutritionPatientsPage),
      },
      {
        path: 'patients/:petId',
        data: { mode: 'active' },
        loadComponent: () => import('./presentation/feeding-plan.page').then((m) => m.FeedingPlanPage),
      },
      {
        path: 'patients/:petId/new',
        loadComponent: () => import('./presentation/feeding-plan-form.page').then((m) => m.FeedingPlanFormPage),
      },
      {
        path: 'plans/:planId',
        data: { mode: 'byId' },
        loadComponent: () => import('./presentation/feeding-plan.page').then((m) => m.FeedingPlanPage),
      },
      {
        path: 'plans/:planId/edit',
        loadComponent: () => import('./presentation/feeding-plan-form.page').then((m) => m.FeedingPlanFormPage),
      },
    ],
  },
];
