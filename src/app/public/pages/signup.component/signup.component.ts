import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { LanguageSwitcherComponent } from '../../../language-switcher/language-switcher.component';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [RouterModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule, MatIconModule, TranslateModule, LanguageSwitcherComponent],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.css'],
})
export class SignUpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly translate = inject(TranslateService);
  readonly signUpForm = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    terms: [false, Validators.requiredTrue],
  });
  isLoading = false;
  hidePassword = true;
  errorMessage = '';

  async onSubmit(): Promise<void> {
    if (this.signUpForm.invalid || this.isLoading) {
      this.signUpForm.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    this.errorMessage = '';
    const { firstName, lastName, email, password } = this.signUpForm.getRawValue();
    try {
      await firstValueFrom(this.auth.register({ firstName, lastName, email, password }));
      // Registration creates an account, not a user session. Authenticate via Keycloak.
      await this.auth.startLogin(email);
    } catch (error: unknown) {
      this.isLoading = false;
      const status = error && typeof error === 'object' && 'status' in error ? error.status : null;
      const key = status === 409 ? 'sign-up.email-exists' : status === 400
        ? 'sign-up.invalid-data' : 'sign-up.error';
      this.errorMessage = this.translate.instant(key);
      console.error('Registration or login start failed', error);
    }
  }
  get f() { return this.signUpForm.controls; }
}
