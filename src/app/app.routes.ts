import { Routes } from '@angular/router';
import { authGuard } from './auth/auth.guard';
import { AuthCallbackComponent } from './auth/auth-callback.component';
import { SignInComponent } from './public/pages/signin.component/signin.component';
import { SignUpComponent } from './public/pages/signup.component/signup.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
  { path: '', redirectTo: 'sign-in', pathMatch: 'full' },
  { path: 'sign-in', component: SignInComponent },
  { path: 'sign-up', component: SignUpComponent },
  { path: 'auth/callback', component: AuthCallbackComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: 'sign-in' },
];
