import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../environments/environment';
import { ClinicalAttentionInput, ClinicalEvolution, ClinicDirectory, ClinicPatientsResponse } from './clinical.models';

@Injectable({ providedIn: 'root' })
export class ClinicalService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly api = environment.apiBaseUrl;

  private options(): { headers: HttpHeaders } {
    const token = this.auth.accessToken;
    return { headers: token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders() };
  }

  clinics(): Observable<ClinicDirectory> {
    return this.http.get<ClinicDirectory>(`${this.api}/clinics`, {
      ...this.options(), params: new HttpParams().set('page', '1').set('pageSize', '50'),
    });
  }

  patients(clinicId: string): Observable<ClinicPatientsResponse> {
    return this.http.get<ClinicPatientsResponse>(
      `${this.api}/clinics/${encodeURIComponent(clinicId)}/patients`, this.options(),
    );
  }

  evolution(petId: string, clinicId: string): Observable<ClinicalEvolution> {
    return this.http.get<ClinicalEvolution>(
      `${this.api}/pets/${encodeURIComponent(petId)}/evolution`, {
        ...this.options(), params: new HttpParams().set('clinicId', clinicId),
      },
    );
  }

  registerAttention(
    petId: string, clinicId: string, attention: ClinicalAttentionInput, appointmentId?: string,
  ): Observable<unknown> {
    let params = new HttpParams().set('clinicId', clinicId);
    if (appointmentId?.trim()) params = params.set('appointmentId', appointmentId.trim());
    return this.http.post(
      `${this.api}/pets/${encodeURIComponent(petId)}/clinical-records`, attention,
      { ...this.options(), params },
    );
  }
}
