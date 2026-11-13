export const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export const TIME_ZONES = [
  'America/Lima',
  'America/Bogota',
  'America/Guayaquil',
  'America/La_Paz',
  'America/Santiago',
  'America/Argentina/Buenos_Aires',
  'America/Mexico_City',
  'Europe/Madrid',
] as const;

export interface Paged<T> {
  page: number;
  pageSize: number;
  totalCount: number;
  items: T[];
}

export interface ClinicSummary {
  clinicId: string;
  name: string;
}

export interface PatientSummary {
  petId: string;
  name: string;
  species?: string;
  breed?: string;
  lastAttentionDate?: string;
}

/** Editable row used by both medication (amount) and feeding (quantity) forms. */
export interface ScheduleDraft {
  localTime: string; // HH:mm
  daysOfWeek: DayOfWeek[];
  quantity: number | null;
  unit: string;
}
