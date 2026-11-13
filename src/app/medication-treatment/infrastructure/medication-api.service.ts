import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { asRecord, parseDays, pickBool, pickNum, pickStr, toHHmm } from '../../shared/care/care.utils';
import { MedicationDose, MedicationPlan, MedicationPlanChange, MedicationSchedule, PrescribeMedicationRequest } from '../domain/medication.models';

export function mapMedicationSchedule(item: unknown): MedicationSchedule {
  const r = asRecord(item);
  return {
    scheduleId: pickStr(r, 'scheduleId', 'id'),
    localTime: toHHmm(pickStr(r, 'localTime', 'time')),
    daysOfWeek: parseDays(r['daysOfWeek']),
    amount: pickNum(r, 'amount', 'quantity') ?? 0,
    unit: pickStr(r, 'unit') ?? '',
  };
}

/** Tolerant mapper: field names are confirmed against Swagger, so a few aliases are accepted. */
export function mapMedicationPlan(body: unknown): MedicationPlan {
  const r = asRecord(body);
  return {
    planId: pickStr(r, 'planId', 'id', 'medicationPlanId') ?? '',
    petId: pickStr(r, 'petId'),
    clinicId: pickStr(r, 'clinicId'),
    clinicalAttentionId: pickStr(r, 'clinicalAttentionId'),
    medicationName: pickStr(r, 'medicationName', 'name') ?? '',
    route: pickStr(r, 'route') ?? '',
    instructions: pickStr(r, 'instructions') ?? '',
    startDate: (pickStr(r, 'startDate') ?? '').substring(0, 10),
    endDate: (pickStr(r, 'endDate') ?? '').substring(0, 10),
    timeZoneId: pickStr(r, 'timeZoneId', 'timeZone') ?? 'America/Lima',
    status: pickStr(r, 'status') ?? 'Active',
    remindersEnabled: pickBool(r, 'remindersEnabled', 'reminderEnabled'),
    schedules: Array.isArray(r['schedules']) ? (r['schedules'] as unknown[]).map(mapMedicationSchedule) : [],
  };
}

export function mapMedicationDose(body: unknown): MedicationDose {
  const r = asRecord(body);
  return {
    doseId: pickStr(r, 'doseId', 'id') ?? '',
    scheduleId: pickStr(r, 'scheduleId'),
    scheduledAtUtc: pickStr(r, 'scheduledAtUtc', 'scheduledAt', 'scheduledForUtc', 'dueAtUtc'),
    status: pickStr(r, 'status') ?? 'Pending',
    administeredAtUtc: pickStr(r, 'administeredAtUtc', 'administeredAt'),
  };
}

function listOf(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  const r = asRecord(body);
  for (const key of ['items', 'plans', 'doses']) if (Array.isArray(r[key])) return r[key] as unknown[];
  return [];
}

/** Outbound adapter for the MedicationTreatment bounded context (veterinarian side). */
@Injectable({ providedIn: 'root' })
export class MedicationApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  prescribe(petId: string, request: PrescribeMedicationRequest): Observable<MedicationPlan> {
    return this.http.post<unknown>(`${this.base}/pets/${petId}/medication-plans`, request).pipe(map(mapMedicationPlan));
  }

  listByPet(petId: string): Observable<MedicationPlan[]> {
    return this.http.get<unknown>(`${this.base}/pets/${petId}/medication-plans`).pipe(map((b) => listOf(b).map(mapMedicationPlan)));
  }

  get(planId: string): Observable<MedicationPlan> {
    return this.http.get<unknown>(`${this.base}/medication-plans/${planId}`).pipe(map(mapMedicationPlan));
  }

  change(planId: string, change: MedicationPlanChange): Observable<unknown> {
    return this.http.patch(`${this.base}/medication-plans/${planId}`, change);
  }

  /** from/to are yyyy-MM-dd; date-only strings bind to DateOnly, DateTime and DateTimeOffset alike. */
  doses(planId: string, from: string, to: string): Observable<MedicationDose[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<unknown>(`${this.base}/medication-plans/${planId}/doses`, { params }).pipe(map((b) => listOf(b).map(mapMedicationDose)));
  }
}
