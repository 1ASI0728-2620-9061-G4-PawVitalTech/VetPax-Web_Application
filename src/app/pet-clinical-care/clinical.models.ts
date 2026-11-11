/** The backend contract is the source of truth. Fields not documented are optional. */
export interface ClinicItem {
  clinicId?: string;
  id?: string;
  name?: string;
}
export interface ClinicDirectory {
  items: ClinicItem[];
  page?: number;
  totalCount?: number;
}
export interface Patient {
  petId?: string;
  id?: string;
  name?: string;
  species?: string;
  breed?: string;
  sex?: string;
  birthDate?: string;
  ownerName?: string;
}
export interface ClinicalIndicator {
  name: string;
  value: number;
  unit: string;
}
export interface ClinicalAttentionInput {
  attentionDate: string;
  reason: string;
  diagnosis: string;
  treatmentSummary: string;
  observations: string;
  indicators: ClinicalIndicator[];
}
export interface ClinicalEvolution {
  hasSufficientData?: boolean;
  indicators?: unknown[];
  [key: string]: unknown;
}
export const patientId = (patient: Patient): string => patient.petId || patient.id || '';
export const clinicId = (clinic: ClinicItem): string => clinic.clinicId || clinic.id || '';
