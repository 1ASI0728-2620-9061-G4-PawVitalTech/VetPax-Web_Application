import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../auth/auth.service';
import { LanguageSwitcherComponent } from '../../../language-switcher/language-switcher.component';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './signin.component.html',
  styleUrl: './signin.component.css',
})
export class SignInComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  readonly loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });
  isLoading = false;
  errorMessage = '';

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid || this.isLoading) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    try {
      await this.auth.startLogin(this.loginForm.value.email);
    } catch (error) {
      console.error('Could not start Keycloak login', error);
      this.errorMessage = 'No fue posible iniciar Keycloak.';
      this.isLoading = false;
    }
  }

  get f() { return this.loginForm.controls; }
}
