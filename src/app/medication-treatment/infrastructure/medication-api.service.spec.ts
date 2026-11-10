import { describe, expect, it } from 'vitest';
import { mapMedicationDose, mapMedicationPlan } from './medication-api.service';

describe('medication mappers', () => {
  it('maps a plan using the documented contract', () => {
    const plan = mapMedicationPlan({
      planId: 'p1', medicationName: 'Demo', route: 'Oral', instructions: 'x', startDate: '2026-11-10', endDate: '2026-11-12T00:00:00',
      timeZoneId: 'America/Lima', status: 'Active',
      schedules: [{ scheduleId: 's1', localTime: '10:00:00', daysOfWeek: ['Tuesday'], amount: 1, unit: 'unidad' }],
    });
    expect(plan.planId).toBe('p1');
    expect(plan.endDate).toBe('2026-11-12');
    expect(plan.schedules[0]).toMatchObject({ localTime: '10:00', amount: 1, daysOfWeek: ['Tuesday'] });
  });

  it('does not break on missing fields', () => {
    const plan = mapMedicationPlan({});
    expect(plan.schedules).toEqual([]);
    expect(plan.timeZoneId).toBe('America/Lima');
  });

  it('maps doses with alias names', () => {
    const dose = mapMedicationDose({ id: 'd1', scheduledAt: '2026-11-10T15:00:00Z', status: 'Pending' });
    expect(dose).toMatchObject({ doseId: 'd1', scheduledAtUtc: '2026-11-10T15:00:00Z', status: 'Pending' });
  });
});
