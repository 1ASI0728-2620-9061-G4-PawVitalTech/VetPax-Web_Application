import { describe, expect, it } from 'vitest';
import { mapFeedingPlan } from './nutrition-api.service';

describe('feeding plan mapper', () => {
  it('maps the plan, its schedules and revisions', () => {
    const plan = mapFeedingPlan({
      planId: 'f1', foodName: 'Alimento', recommendations: 'r', startDate: '2026-11-10', endDate: '2026-11-12', timeZoneId: 'America/Lima',
      isActive: true,
      schedules: [{ localTime: '08:00:00', daysOfWeek: ['Tuesday'], quantity: 100, unit: 'g' }],
      revisions: [{ revisionNumber: 1, foodName: 'Antes', schedules: [] }],
    });
    expect(plan.active).toBe(true);
    expect(plan.schedules[0]).toMatchObject({ localTime: '08:00', quantity: 100, unit: 'g' });
    expect(plan.revisions[0]).toMatchObject({ revision: 1, foodName: 'Antes' });
  });

  it('reads the real revision shape (version + replacedAtUtc) and optional end date', () => {
    const plan = mapFeedingPlan({
      planId: 'f2', foodName: 'A', startDate: '2026-11-10', endDate: null, status: 'Active', version: 3,
      revisions: [{ version: 2, foodName: 'B', replacedAtUtc: '2026-11-09T10:00:00Z', schedules: [] }],
    });
    expect(plan.revision).toBe(3);
    expect(plan.endDate).toBe('');
    expect(plan.revisions[0]).toMatchObject({ revision: 2, createdAt: '2026-11-09T10:00:00Z' });
  });

  it('derives active from status when there is no boolean flag', () => {
    expect(mapFeedingPlan({ planId: 'x', status: 'Inactive' }).active).toBe(false);
    expect(mapFeedingPlan({ planId: 'x', status: 'Active' }).active).toBe(true);
  });
});
