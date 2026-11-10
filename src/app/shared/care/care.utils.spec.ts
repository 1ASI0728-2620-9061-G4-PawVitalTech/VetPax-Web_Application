import { describe, expect, it } from 'vitest';
import { addDays, dateInZone, parseDays, statusTone, toApiTime, toDateOnly, toHHmm, fromDateOnly } from './care.utils';

describe('care.utils', () => {
  it('formats times for the API and the UI', () => {
    expect(toApiTime('08:30')).toBe('08:30:00');
    expect(toHHmm('10:00:00')).toBe('10:00');
    expect(toHHmm(undefined)).toBe('');
  });

  it('keeps local calendar dates (no UTC shift)', () => {
    const d = new Date(2026, 10, 10, 23, 30); // 10 Nov 2026 23:30 local
    expect(toDateOnly(d)).toBe('2026-11-10');
    expect(toDateOnly(addDays(d, 1))).toBe('2026-11-11');
    expect(toDateOnly(fromDateOnly('2026-11-10')!)).toBe('2026-11-10');
  });

  it('parses days from names or .NET numbers, ordered Monday-first', () => {
    expect(parseDays(['Wednesday', 'monday'])).toEqual(['Monday', 'Wednesday']);
    expect(parseDays([0, 1])).toEqual(['Monday', 'Sunday']);
    expect(parseDays(undefined)).toEqual([]);
  });

  it('reads the calendar day in the plan time zone', () => {
    // 03:00 UTC on 11 Nov is still 10 Nov 22:00 in Lima (UTC-5)
    expect(dateInZone('2026-11-11T03:00:00Z', 'America/Lima')).toBe('2026-11-10');
  });

  it('maps statuses to tones', () => {
    expect(statusTone('Administered')).toBe('ok');
    expect(statusTone('Pending')).toBe('info');
    expect(statusTone('Cancelled')).toBe('bad');
    expect(statusTone('whatever')).toBe('muted');
  });
});
