/** Contracts verified against VetPax-Backend ClinicResources and GetClinicalEvolutionResult. */
export interface ClinicItem {
  clinicId?: string;
  id?: string;
  name?: string;
}

export interface ClinicDirectory {
  items: ClinicItem[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
}

/** The veterinarian patient endpoint does not currently include breed or ownerName. */
export interface Patient {
  petId: string;
  name: string;
  species: string;
  lastAttentionDate: string | null;
  breed?: string;
  sex?: string;
  birthDate?: string;
}

export interface ClinicPatientsResponse {
  clinicId: string;
  message: string | null;
  patients: Patient[];
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

export interface EvolutionEntry {
  attentionDate: string;
  indicatorName: string;
  value: number;
  unit: string;
}

export interface ClinicalEvolution {
  petId: string;
  hasSufficientData: boolean;
  entries: EvolutionEntry[];
  message?: string | null;
}

export const patientId = (patient: Patient): string => patient.petId;
export const clinicId = (clinic: ClinicItem): string => clinic.clinicId || clinic.id || '';
