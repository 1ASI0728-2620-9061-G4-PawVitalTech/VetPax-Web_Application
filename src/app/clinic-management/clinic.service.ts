import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ClinicDirectoryPage,
  ClinicProfile,
  ClinicVeterinarian,
  UpdateClinicProfile,
} from './clinic.models';

@Injectable({ providedIn: 'root' })
export class ClinicService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiBaseUrl}/clinics`;

  list(): Observable<ClinicDirectoryPage> {
    const params = new HttpParams().set('page', 1).set('pageSize', 50);
    return this.http.get<ClinicDirectoryPage>(this.baseUrl, { params });
  }

  get(clinicId: string): Observable<ClinicProfile> {
    return this.http.get<ClinicProfile>(`${this.baseUrl}/${clinicId}`);
  }

  update(clinicId: string, profile: UpdateClinicProfile): Observable<ClinicProfile> {
    return this.http.put<ClinicProfile>(`${this.baseUrl}/${clinicId}`, profile);
  }

  veterinarians(clinicId: string): Observable<ClinicVeterinarian[]> {
    return this.http.get<ClinicVeterinarian[]>(`${this.baseUrl}/${clinicId}/veterinarians`);
  }

  linkVeterinarian(clinicId: string, veterinarianId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${clinicId}/veterinarians`, { veterinarianId });
  }
}
