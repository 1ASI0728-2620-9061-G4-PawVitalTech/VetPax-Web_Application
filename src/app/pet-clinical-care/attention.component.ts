import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ClinicalService } from './clinical.service';

@Component({
  selector: 'app-clinical-attention',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './attention.component.html',
  styleUrl: './clinical.css',
})
export class AttentionComponent implements OnInit {
  private readonly builder = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ClinicalService);
  petId = '';
  clinicId = '';
  name = '';
  saving = false;
  error = '';
  readonly form = this.builder.nonNullable.group({
    attentionDate: ['', Validators.required],
    reason: ['', [Validators.required, Validators.maxLength(500)]],
    diagnosis: ['', Validators.required],
    treatmentSummary: ['', Validators.required],
    observations: [''],
    appointmentId: [''],
    indicators: this.builder.array<FormGroup>([]),
  });

  get indicators(): FormArray { return this.form.controls.indicators; }

  ngOnInit(): void {
    this.petId = this.route.snapshot.paramMap.get('petId') || '';
    this.clinicId = this.route.snapshot.queryParamMap.get('clinicId') || '';
    this.name = this.route.snapshot.queryParamMap.get('name') || 'Paciente';
    // datetime-local takes local wall time. Convert to UTC on submit.
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    this.form.controls.attentionDate.setValue(local.toISOString().slice(0, 16));
  }

  addIndicator(): void {
    this.indicators.push(this.builder.nonNullable.group({
      name: ['', Validators.required],
      value: [0, Validators.required],
      unit: ['', Validators.required],
    }));
  }

  removeIndicator(index: number): void { this.indicators.removeAt(index); }

  submit(): void {
    if (this.form.invalid || !this.clinicId || this.saving) {
      this.form.markAllAsTouched();
      if (!this.clinicId) this.error = 'Falta la clínica. Abre este formulario desde el listado de pacientes.';
      return;
    }
    const raw = this.form.getRawValue();
    const date = new Date(raw.attentionDate);
    if (Number.isNaN(date.getTime())) { this.error = 'La fecha de atención no es válida.'; return; }
    this.saving = true;
    this.error = '';
    this.api.registerAttention(this.petId, this.clinicId, {
      attentionDate: date.toISOString(),
      reason: raw.reason.trim(),
      diagnosis: raw.diagnosis.trim(),
      treatmentSummary: raw.treatmentSummary.trim(),
      observations: raw.observations.trim(),
      indicators: raw.indicators.map(i => ({ name: i.name.trim(), value: Number(i.value), unit: i.unit.trim() })),
    }, raw.appointmentId).pipe(finalize(() => this.saving = false)).subscribe({
      next: () => void this.router.navigate(['/patients', this.petId], {
        queryParams: { clinicId: this.clinicId, name: this.name },
      }),
      error: err => {
        this.error = err.status === 403 ? 'No tienes autorización para registrar atenciones en esta clínica.'
          : err.status === 400 ? 'Revisa los campos y las reglas del backend (fecha, clínica y paciente).'
          : 'No se pudo registrar la atención. Comprueba la conexión con la API.';
      },
    });
  }
}
