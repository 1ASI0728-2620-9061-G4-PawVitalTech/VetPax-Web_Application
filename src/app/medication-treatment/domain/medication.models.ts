import { DayOfWeek } from '../../shared/care/care.models';

export interface MedicationSchedule {
  scheduleId?: string;
  localTime: string; // HH:mm
  daysOfWeek: DayOfWeek[];
  amount: number;
  unit: string;
}

export interface MedicationPlan {
  planId: string;
  petId?: string;
  clinicId?: string;
  clinicalAttentionId?: string;
  medicationName: string;
  route: string;
  instructions: string;
  startDate: string; // yyyy-MM-dd
  /** Empty when the treatment has no end date (the API allows it). */
  endDate: string;
  timeZoneId: string;
  /** Status text as returned by the API (e.g. Active, Completed, Cancelled). */
  status: string;
  remindersEnabled?: boolean;
  schedules: MedicationSchedule[];
}

export interface MedicationDose {
  doseId: string;
  scheduleId?: string;
  scheduledAtUtc?: string;
  status: string;
  administeredAtUtc?: string;
}

/** Body of POST /pets/{petId}/medication-plans (contract in section 7.5 of the backend prompt). */
export interface PrescribeMedicationRequest {
  clinicId: string;
  clinicalAttentionId?: string;
  medicationName: string;
  route: string;
  instructions?: string;
  startDate: string;
  endDate?: string;
  timeZoneId: string;
  schedules: { localTime: string; daysOfWeek: DayOfWeek[]; amount: number; unit: string }[];
}

/** Body of PATCH /medication-plans/{planId}. */
export type MedicationPlanChange =
  | { operation: 'changeSchedules'; schedules: PrescribeMedicationRequest['schedules'] }
  | { operation: 'complete' }
  | { operation: 'cancel' };

export function isPlanClosed(status: string): boolean {
  return ['completed', 'cancelled', 'canceled'].includes(status.toLowerCase());
}
