import { Injectable, signal } from '@angular/core';
import { PatientSummary } from './care.models';

const CLINIC_KEY = 'vetpax_web_care_clinic';
const PATIENTS_KEY = 'vetpax_web_care_patients';

/**
 * Remembers the clinic and patients the veterinarian is working with so deep links
 * (e.g. /medication/patients/:petId) can show the pet's name and keep the clinicId
 * that several endpoints need. Stored in sessionStorage; never contains secrets.
 */
@Injectable({ providedIn: 'root' })
export class PatientContextService {
  readonly clinicId = signal<string | null>(this.read(CLINIC_KEY));
  private patients: Record<string, PatientSummary> = this.readPatients();

  setClinic(clinicId: string | null): void {
    this.clinicId.set(clinicId);
    try {
      if (clinicId) sessionStorage.setItem(CLINIC_KEY, clinicId);
      else sessionStorage.removeItem(CLINIC_KEY);
    } catch {
      /* storage can be unavailable; the context simply is not persisted */
    }
  }

  remember(list: PatientSummary[]): void {
    for (const p of list) this.patients[p.petId] = p;
    try {
      sessionStorage.setItem(PATIENTS_KEY, JSON.stringify(this.patients));
    } catch {
      /* ignore */
    }
  }

  patient(petId: string): PatientSummary | undefined {
    return this.patients[petId];
  }

  private read(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private readPatients(): Record<string, PatientSummary> {
    try {
      return JSON.parse(sessionStorage.getItem(PATIENTS_KEY) ?? '{}') as Record<string, PatientSummary>;
    } catch {
      return {};
    }
  }
}
