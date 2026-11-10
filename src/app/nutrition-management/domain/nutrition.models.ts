import { DayOfWeek } from '../../shared/care/care.models';

export interface FeedingSchedule {
  scheduleId?: string;
  localTime: string; // HH:mm
  daysOfWeek: DayOfWeek[];
  quantity: number;
  unit: string;
}

/** Content of one revision of a feeding plan (the current one is also the plan's own content). */
export interface FeedingContent {
  foodName: string;
  recommendations: string;
  startDate: string; // yyyy-MM-dd
  /** Empty when the plan has no end date. */
  endDate: string;
  timeZoneId: string;
  schedules: FeedingSchedule[];
}

export interface FeedingRevision extends FeedingContent {
  revision?: number;
  createdAt?: string;
}

export interface FeedingPlan extends FeedingContent {
  planId: string;
  petId?: string;
  clinicId?: string;
  active: boolean;
  remindersEnabled?: boolean;
  revision?: number;
  revisions: FeedingRevision[];
}

/** Body of POST /pets/{petId}/feeding-plans. PUT /feeding-plans/{id} takes the same body without clinicId. */
export interface FeedingPlanRequest {
  clinicId: string;
  foodName: string;
  recommendations?: string;
  startDate: string;
  endDate?: string;
  timeZoneId: string;
  schedules: { localTime: string; daysOfWeek: DayOfWeek[]; quantity: number; unit: string }[];
}

export type FeedingPlanUpdateRequest = Omit<FeedingPlanRequest, 'clinicId'>;