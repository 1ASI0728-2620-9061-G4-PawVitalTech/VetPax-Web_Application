import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import {
  ClinicDirectoryItem,
  ClinicProfile,
  ClinicVeterinarian,
  OpeningHours,
} from './clinic.models';
import { ClinicService } from './clinic.service';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
type OpeningHoursForm = FormGroup<{
  dayOfWeek: FormControl<number>;
  openTime: FormControl<string>;
  closeTime: FormControl<string>;
}>;

@Component({
  selector: 'app-clinic',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './clinic.component.html',
  styleUrl: './clinic.component.css',
})
export class ClinicComponent implements OnInit {
  private readonly clinicService = inject(ClinicService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly days = DAYS;
  clinics: ClinicDirectoryItem[] = [];
  clinic: ClinicProfile | null = null;
  veterinarians: ClinicVeterinarian[] = [];
  selectedClinicId = '';
  loading = true;
  saving = false;
  editing = false;
  errorMessage = '';
  readonly canManage = this.auth.hasRole('clinic_administrator');

  readonly profileForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    address: ['', Validators.required],
    phone: [''],
    contactEmail: ['', Validators.email],
    openingHours: this.fb.array<OpeningHoursForm>([]),
  });
  readonly veterinarianForm = this.fb.nonNullable.group({
    veterinarianId: [
      '',
      [
        Validators.required,
        Validators.pattern(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
      ],
    ],
  });

  get openingHours(): FormArray {
    return this.profileForm.controls.openingHours;
  }

  ngOnInit(): void {
    this.clinicService.list().subscribe({
      next: (page) => {
        this.clinics = page.items;
        if (this.clinics.length) this.selectClinic(this.clinics[0].clinicId);
        else this.loading = false;
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  selectClinic(clinicId: string): void {
    this.selectedClinicId = clinicId;
    this.loading = true;
    this.errorMessage = '';
    this.editing = false;
    forkJoin({
      clinic: this.clinicService.get(clinicId),
      veterinarians: this.clinicService.veterinarians(clinicId),
    }).subscribe({
      next: ({ clinic, veterinarians }) => {
        this.clinic = clinic;
        this.veterinarians = veterinarians;
        this.resetForm(clinic);
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  startEditing(): void {
    if (!this.clinic || !this.canManage) return;
    this.resetForm(this.clinic);
    this.editing = true;
  }

  cancelEditing(): void {
    this.editing = false;
    if (this.clinic) this.resetForm(this.clinic);
  }

  save(): void {
    if (!this.clinic || this.profileForm.invalid || this.saving) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const raw = this.profileForm.getRawValue();
    this.clinicService
      .update(this.clinic.clinicId, {
        name: raw.name.trim(),
        address: raw.address.trim(),
        phone: raw.phone.trim() || null,
        contactEmail: raw.contactEmail.trim() || null,
        openingHours: raw.openingHours,
      })
      .subscribe({
        next: (clinic) => {
          this.clinic = clinic;
          this.editing = false;
          this.saving = false;
          this.snackBar.open('Clínica actualizada correctamente.', 'Cerrar', {
            duration: 3500,
            panelClass: 'success-snackbar',
          });
        },
        error: (error: HttpErrorResponse) => {
          this.saving = false;
          this.notifyError(error);
        },
      });
  }

  linkVeterinarian(): void {
    if (!this.clinic || this.veterinarianForm.invalid || this.saving) {
      this.veterinarianForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const veterinarianId = this.veterinarianForm.controls.veterinarianId.value.trim();
    this.clinicService.linkVeterinarian(this.clinic.clinicId, veterinarianId).subscribe({
      next: () => {
        this.saving = false;
        this.veterinarianForm.reset();
        this.refreshVeterinarians();
        this.snackBar.open('Veterinario vinculado correctamente.', 'Cerrar', {
          duration: 3500,
          panelClass: 'success-snackbar',
        });
      },
      error: (error: HttpErrorResponse) => {
        this.saving = false;
        this.notifyError(error);
      },
    });
  }

  dayName(day: number): string {
    return DAYS[day] ?? `Día ${day}`;
  }

  trackVeterinarian(_: number, veterinarian: ClinicVeterinarian): string {
    return veterinarian.veterinarianId;
  }

  logout(): void {
    this.auth.logout();
  }

  private refreshVeterinarians(): void {
    if (!this.clinic) return;
    this.clinicService.veterinarians(this.clinic.clinicId).subscribe({
      next: (veterinarians) => (this.veterinarians = veterinarians),
      error: (error: HttpErrorResponse) => this.notifyError(error),
    });
  }

  private resetForm(clinic: ClinicProfile): void {
    this.profileForm.patchValue({
      name: clinic.name,
      address: clinic.address,
      phone: clinic.phone ?? '',
      contactEmail: clinic.contactEmail ?? '',
    });
    this.openingHours.clear();
    for (const hours of clinic.openingHours) this.openingHours.push(this.hoursGroup(hours));
  }

  private hoursGroup(hours: OpeningHours): OpeningHoursForm {
    return this.fb.nonNullable.group({
      dayOfWeek: [hours.dayOfWeek, Validators.required],
      openTime: [hours.openTime, Validators.required],
      closeTime: [hours.closeTime, Validators.required],
    });
  }

  private handleError(error: HttpErrorResponse): void {
    this.loading = false;
    this.errorMessage = this.errorText(error);
  }

  private notifyError(error: HttpErrorResponse): void {
    this.snackBar.open(this.errorText(error), 'Cerrar', {
      duration: 5000,
      panelClass: 'error-snackbar',
    });
  }

  private errorText(error: HttpErrorResponse): string {
    if (error.status === 403) return 'No tienes permiso para gestionar esta clínica.';
    if (error.status === 404) return 'La clínica solicitada no existe.';
    return typeof error.error?.message === 'string'
      ? error.error.message
      : 'No fue posible obtener la información de la clínica.';
  }
}
