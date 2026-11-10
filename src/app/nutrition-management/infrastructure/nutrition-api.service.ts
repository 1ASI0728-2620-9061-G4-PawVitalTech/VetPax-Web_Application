import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { asRecord, parseDays, pickBool, pickNum, pickStr, toHHmm } from '../../shared/care/care.utils';
import { FeedingContent, FeedingPlan, FeedingPlanRequest, FeedingPlanUpdateRequest, FeedingRevision, FeedingSchedule } from '../domain/nutrition.models';

export function mapFeedingSchedule(item: unknown): FeedingSchedule {
  const r = asRecord(item);
  return {
    scheduleId: pickStr(r, 'scheduleId', 'id'),
    localTime: toHHmm(pickStr(r, 'localTime', 'time')),
    daysOfWeek: parseDays(r['daysOfWeek']),
    quantity: pickNum(r, 'quantity', 'amount') ?? 0,
    unit: pickStr(r, 'unit') ?? '',
  };
}

function mapContent(r: Record<string, unknown>): FeedingContent {
  return {
    foodName: pickStr(r, 'foodName', 'food') ?? '',
    recommendations: pickStr(r, 'recommendations') ?? '',
    startDate: (pickStr(r, 'startDate') ?? '').substring(0, 10),
    endDate: (pickStr(r, 'endDate') ?? '').substring(0, 10),
    timeZoneId: pickStr(r, 'timeZoneId', 'timeZone') ?? 'America/Lima',
    schedules: Array.isArray(r['schedules']) ? (r['schedules'] as unknown[]).map(mapFeedingSchedule) : [],
  };
}

/** Tolerant mapper (aliases accepted); `active` is derived from isActive/active/status. */
export function mapFeedingPlan(body: unknown): FeedingPlan {
  const r = asRecord(body);
  const status = pickStr(r, 'status')?.toLowerCase();
  const active = pickBool(r, 'isActive', 'active') ?? (status ? status === 'active' : true);
  const revisions: FeedingRevision[] = Array.isArray(r['revisions'])
    ? (r['revisions'] as unknown[]).map((item) => {
        const rr = asRecord(item);
        return { ...mapContent(rr), revision: pickNum(rr, 'version', 'revisionNumber', 'revision'), createdAt: pickStr(rr, 'replacedAtUtc', 'createdAtUtc', 'createdAt') };
      })
    : [];
  return {
    ...mapContent(r),
    planId: pickStr(r, 'planId', 'id', 'feedingPlanId') ?? '',
    petId: pickStr(r, 'petId'),
    clinicId: pickStr(r, 'clinicId'),
    active,
    remindersEnabled: pickBool(r, 'remindersEnabled', 'reminderEnabled'),
    revision: pickNum(r, 'version', 'currentRevision', 'revisionNumber', 'revision'),
    revisions,
  };
}

/** Outbound adapter for NutritionManagement. Endpoints are `feeding-plans`, not `nutrition-plans`. */
@Injectable({ providedIn: 'root' })
export class NutritionApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  prescribe(petId: string, request: FeedingPlanRequest): Observable<FeedingPlan> {
    return this.http.post<unknown>(`${this.base}/pets/${petId}/feeding-plans`, request).pipe(map(mapFeedingPlan));
  }

  /** 404 means the pet has no active plan (expected after deactivation). */
  active(petId: string): Observable<FeedingPlan> {
    return this.http.get<unknown>(`${this.base}/pets/${petId}/feeding-plans/active`).pipe(map(mapFeedingPlan));
  }

  get(planId: string): Observable<FeedingPlan> {
    return this.http.get<unknown>(`${this.base}/feeding-plans/${planId}`).pipe(map(mapFeedingPlan));
  }

  /** Creates a new revision; history is preserved by the backend. */
  revise(planId: string, request: FeedingPlanUpdateRequest): Observable<FeedingPlan> {
    return this.http.put<unknown>(`${this.base}/feeding-plans/${planId}`, request).pipe(map(mapFeedingPlan));
  }

  deactivate(planId: string): Observable<unknown> {
    return this.http.patch(`${this.base}/feeding-plans/${planId}/deactivate`, null);
  }
}
