import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AppointmentAgenda,
  AppointmentDetail,
  ClinicDirectoryPage,
  RescheduleAppointment,
} from './appointment.models';

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private readonly http = inject(HttpClient);
  private readonly appointmentsUrl = `${environment.apiBaseUrl}/appointments`;

  clinics(): Observable<ClinicDirectoryPage> {
    const params = new HttpParams().set('page', 1).set('pageSize', 50);
    return this.http.get<ClinicDirectoryPage>(`${environment.apiBaseUrl}/clinics`, { params });
  }

  agenda(clinicId: string, from: string, to: string): Observable<AppointmentAgenda> {
    const params = new HttpParams().set('clinicId', clinicId).set('from', from).set('to', to);
    return this.http.get<AppointmentAgenda>(`${this.appointmentsUrl}/agenda`, { params });
  }

  detail(appointmentId: string): Observable<AppointmentDetail> {
    return this.http.get<AppointmentDetail>(`${this.appointmentsUrl}/${appointmentId}`);
  }

  cancel(appointmentId: string): Observable<AppointmentDetail> {
    return this.http.patch<AppointmentDetail>(`${this.appointmentsUrl}/${appointmentId}`, {
      operation: 'cancel',
    });
  }

  reschedule(appointmentId: string, payload: RescheduleAppointment): Observable<AppointmentDetail> {
    return this.http.patch<AppointmentDetail>(`${this.appointmentsUrl}/${appointmentId}`, payload);
  }
}
