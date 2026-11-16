import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AgendaAppointment, AppointmentDetail, ClinicDirectoryItem } from './appointment.models';
import { AppointmentService } from './appointment.service';
import { formatRange, formatShort, fromApiDate, weekdayShort } from '../shared/date-es';

export interface AgendaBlock {
  appointment: AgendaAppointment;
  top: number;
  height: number;
  left: number;
  width: number;
}

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  templateUrl: './agenda.component.html',
  styleUrl: './agenda.component.css',
})
export class AgendaComponent implements OnInit {
  private readonly appointments = inject(AppointmentService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  clinics: ClinicDirectoryItem[] = [];
  selectedClinicId = '';
  weekStart = this.mondayOf(new Date());
  agenda: AgendaAppointment[] = [];
  selectedAppointment: AppointmentDetail | null = null;
  loading = true;
  detailLoading = false;
  saving = false;
  errorMessage = '';
  editingSchedule = false;

  readonly rescheduleForm = this.fb.nonNullable.group({
    date: ['', Validators.required],
    startTime: ['', Validators.required],
  });

  get weekDays(): Date[] {
    return Array.from({ length: 7 }, (_, index) => this.addDays(this.weekStart, index));
  }

  readonly hourHeight = 64;
  view: 'calendar' | 'list' = 'calendar';
  columns: AgendaBlock[][] = [];
  hours: number[] = [];
  private gridStart = 8;

  readonly weekdayShort = weekdayShort;
  readonly formatShort = formatShort;

  get rangeLabel(): string { return formatRange(this.weekStart, this.weekEnd); }
  get bodyHeight(): number { return this.hours.length * this.hourHeight; }
  get pendingCount(): number { return this.agenda.filter((a) => this.isPending(a.status)).length; }
  get listDays(): { day: Date; items: AgendaAppointment[] }[] {
    return this.weekDays.map((day) => ({ day, items: this.appointmentsFor(day) })).filter((d) => d.items.length);
  }

  dayTitle(day: Date): string {
    return new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(day);
  }

  private minutes(value: string): number {
    const [h, m] = value.split(':').map(Number);
    return h * 60 + (m || 0);
  }

  private rebuild(): void {
    const starts = this.agenda.map((a) => Math.floor(this.minutes(a.startTime) / 60));
    const ends = this.agenda.map((a) => Math.ceil(this.minutes(a.endTime) / 60));
    this.gridStart = Math.min(8, ...starts);
    const gridEnd = Math.max(18, ...ends);
    this.hours = Array.from({ length: gridEnd - this.gridStart }, (_, i) => this.gridStart + i);
    this.columns = this.weekDays.map((day) => this.layout(day));
  }

  private layout(day: Date): AgendaBlock[] {
    const items = this.appointmentsFor(day);
    const laneEnds: number[] = [];
    const placed = items.map((appointment) => {
      const start = this.minutes(appointment.startTime);
      const end = Math.max(this.minutes(appointment.endTime), start + 30);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); } else laneEnds[lane] = end;
      return { appointment, start, end, lane };
    });
    const lanes = Math.max(1, laneEnds.length);
    return placed.map(({ appointment, start, end, lane }) => ({
      appointment,
      top: ((start - this.gridStart * 60) / 60) * this.hourHeight,
      height: Math.max(36, ((end - start) / 60) * this.hourHeight - 4),
      left: (lane / lanes) * 100,
      width: 100 / lanes,
    }));
  }

  get weekEnd(): Date {
    return this.addDays(this.weekStart, 6);
  }

  ngOnInit(): void {
    this.appointments.clinics().subscribe({
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
    this.closeDetail();
    this.loadAgenda();
  }

  previousWeek(): void {
    this.weekStart = this.addDays(this.weekStart, -7);
    this.loadAgenda();
  }

  nextWeek(): void {
    this.weekStart = this.addDays(this.weekStart, 7);
    this.loadAgenda();
  }

  today(): void {
    this.weekStart = this.mondayOf(new Date());
    this.loadAgenda();
  }

  appointmentsFor(day: Date): AgendaAppointment[] {
    const date = this.toApiDate(day);
    return this.agenda
      .filter((appointment) => appointment.date === date)
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
  }

  openDetail(appointmentId: string): void {
    this.detailLoading = true;
    this.editingSchedule = false;
    this.appointments.detail(appointmentId).subscribe({
      next: (appointment) => {
        this.selectedAppointment = appointment;
        this.rescheduleForm.setValue({
          date: appointment.date,
          startTime: appointment.startTime.slice(0, 5),
        });
        this.detailLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.detailLoading = false;
        this.notifyError(error);
      },
    });
  }

  closeDetail(): void {
    this.selectedAppointment = null;
    this.editingSchedule = false;
  }

  cancelAppointment(): void {
    const appointment = this.selectedAppointment;
    if (!appointment || this.saving || !window.confirm('¿Cancelar esta cita veterinaria?')) return;
    this.saving = true;
    this.appointments.cancel(appointment.appointmentId).subscribe({
      next: () => {
        this.saving = false;
        this.closeDetail();
        this.loadAgenda();
        this.snackBar.open('Cita cancelada correctamente.', 'Cerrar', {
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

  saveReschedule(): void {
    const appointment = this.selectedAppointment;
    if (!appointment || this.rescheduleForm.invalid || this.saving) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }
    this.saving = true;
    const value = this.rescheduleForm.getRawValue();
    this.appointments
      .reschedule(appointment.appointmentId, {
        operation: 'reschedule',
        date: value.date,
        startTime: `${value.startTime}:00`,
      })
      .subscribe({
        next: (updated) => {
          this.selectedAppointment = updated;
          this.editingSchedule = false;
          this.saving = false;
          this.loadAgenda(false);
          this.snackBar.open('Cita reprogramada correctamente.', 'Cerrar', {
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

  isPending(status: string): boolean {
    return status.toLowerCase() === 'pending';
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Programada',
      attended: 'Atendida',
      cancelled: 'Cancelada',
    };
    return labels[status.toLowerCase()] ?? status;
  }

  statusClass(status: string): string {
    return status.toLowerCase();
  }

  isToday(day: Date): boolean {
    return this.toApiDate(day) === this.toApiDate(new Date());
  }

  formatTime(value: string): string {
    return value.slice(0, 5);
  }

  private loadAgenda(showLoader = true): void {
    if (!this.selectedClinicId) return;
    if (showLoader) this.loading = true;
    this.errorMessage = '';
    this.appointments
      .agenda(this.selectedClinicId, this.toApiDate(this.weekStart), this.toApiDate(this.weekEnd))
      .subscribe({
        next: (agenda) => {
          this.agenda = agenda.appointments;
          this.rebuild();
          this.loading = false;
        },
        error: (error: HttpErrorResponse) => this.handleError(error),
      });
  }

  private mondayOf(value: Date): Date {
    const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
    const day = date.getDay() || 7;
    date.setDate(date.getDate() - day + 1);
    return date;
  }

  private addDays(value: Date, days: number): Date {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
  }

  private toApiDate(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    if (error.status === 403)
      return 'La agenda solo está disponible para veterinarios vinculados a la clínica.';
    if (error.status === 404) return 'La cita solicitada ya no está disponible.';
    if (error.status === 409) return 'El nuevo horario entra en conflicto con otra cita.';
    return typeof error.error?.message === 'string'
      ? error.error.message
      : 'No fue posible consultar la agenda.';
  }
}
