import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClinicSummary, Paged, PatientSummary } from './care.models';
import { asRecord, pickStr } from './care.utils';

/**
 * Read-only access to ClinicManagement data that the care screens need
 * (which clinic am I working in, which patients does it have).
 * Owned by Clinic Management; this adapter only reads.
 */
@Injectable({ providedIn: 'root' })
export class CareDirectoryService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  /** GET /clinics?page=1&pageSize=50 (pageSize is validated 1..50 by the API). */
  listClinics(): Observable<ClinicSummary[]> {
    const params = new HttpParams().set('page', 1).set('pageSize', 50);
    return this.http.get<unknown>(`${this.base}/clinics`, { params }).pipe(
      map((body) => {
        const raw = asRecord(body);
        const items = Array.isArray(raw['items']) ? raw['items'] : Array.isArray(body) ? body : [];
        return (items as unknown[])
          .map((item): ClinicSummary | null => {
            const r = asRecord(item);
            const clinicId = pickStr(r, 'clinicId', 'id');
            return clinicId ? { clinicId, name: pickStr(r, 'name') ?? clinicId } : null;
          })
          .filter((c): c is ClinicSummary => c !== null);
      }),
    );
  }

  /** GET /clinics/{clinicId}/patients (veterinarian, authorized clinic only). */
  listPatients(clinicId: string): Observable<PatientSummary[]> {
    return this.http.get<unknown>(`${this.base}/clinics/${clinicId}/patients`).pipe(
      map((body) => {
        const raw = asRecord(body);
        // API: { clinicId, message, patients: [{ petId, name, species, lastAttentionDate }] }
        const items = Array.isArray(raw['patients']) ? raw['patients'] : Array.isArray(body) ? body : [];
        return (items as unknown[])
          .map((item): PatientSummary | null => {
            const r = asRecord(item);
            const petId = pickStr(r, 'petId', 'patientId', 'id');
            if (!petId) return null;
            return {
              petId,
              name: pickStr(r, 'name', 'petName') ?? '',
              species: pickStr(r, 'species'),
              breed: pickStr(r, 'breed'),
              lastAttentionDate: pickStr(r, 'lastAttentionDate'),
            };
          })
          .filter((p): p is PatientSummary => p !== null);
      }),
    );
  }
}

export type { Paged };
