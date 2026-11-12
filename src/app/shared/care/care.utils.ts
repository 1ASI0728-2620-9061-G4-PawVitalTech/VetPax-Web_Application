import { DAYS_OF_WEEK, DayOfWeek } from './care.models';

type Raw = Record<string, unknown>;

export function asRecord(value: unknown): Raw {
  return typeof value === 'object' && value !== null ? (value as Raw) : {};
}

export function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

export function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/** First defined string among the candidate keys (the API contract is checked in Swagger, so be tolerant). */
export function pickStr(raw: Raw, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = str(raw[k]);
    if (v) return v;
  }
  return undefined;
}

export function pickNum(raw: Raw, ...keys: string[]): number | undefined {
  for (const k of keys) {
    const v = num(raw[k]);
    if (v !== undefined) return v;
  }
  return undefined;
}

export function pickBool(raw: Raw, ...keys: string[]): boolean | undefined {
  for (const k of keys) {
    if (typeof raw[k] === 'boolean') return raw[k] as boolean;
  }
  return undefined;
}

/** "10:00:00" | "10:00" -> "10:00" */
export function toHHmm(time: string | undefined): string {
  if (!time) return '';
  const [h = '00', m = '00'] = time.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

/** "10:00" -> "10:00:00" (format expected by the API's TimeOnly) */
export function toApiTime(hhmm: string): string {
  return hhmm.length === 5 ? `${hhmm}:00` : hhmm;
}

/** Local calendar date -> "yyyy-MM-dd" (never goes through UTC, so Lima dates do not shift). */
export function toDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "yyyy-MM-dd" (or ISO datetime) -> local Date at midnight. */
export function fromDateOnly(value: string | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.substring(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** Accepts "Monday" / "monday" / 1 (Mon) .. 0 (Sun) coming from the API. */
export function parseDays(value: unknown): DayOfWeek[] {
  if (!Array.isArray(value)) return [];
  const result: DayOfWeek[] = [];
  for (const item of value) {
    let day: DayOfWeek | undefined;
    if (typeof item === 'string') {
      day = DAYS_OF_WEEK.find((d) => d.toLowerCase() === item.toLowerCase());
    } else if (typeof item === 'number') {
      // .NET DayOfWeek: 0 = Sunday ... 6 = Saturday
      day = DAYS_OF_WEEK[(item + 6) % 7];
    }
    if (day && !result.includes(day)) result.push(day);
  }
  return DAYS_OF_WEEK.filter((d) => result.includes(d));
}

export function shortId(id: string): string {
  return id.length > 8 ? id.substring(0, 8) : id;
}

/** Formats an instant in a given IANA time zone. */
export function formatInZone(iso: string | undefined, timeZone: string, locale = 'es-PE'): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone,
    }).format(date);
  } catch {
    return date.toLocaleString(locale);
  }
}

export function formatDate(value: string | undefined, locale = 'es-PE'): string {
  const d = fromDateOnly(value);
  return d ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(d) : '—';
}

/** Maps any backend status text to a visual tone. */
export function statusTone(status: string | undefined): 'ok' | 'warn' | 'bad' | 'info' | 'muted' {
  const s = (status ?? '').toLowerCase();
  if (['active', 'administered', 'attended'].includes(s)) return 'ok';
  if (['pending', 'scheduled'].includes(s)) return 'info';
  if (['missed', 'overdue', 'expired'].includes(s)) return 'warn';
  if (['cancelled', 'canceled', 'inactive'].includes(s)) return 'bad';
  return 'muted';
}

/** Calendar date ("yyyy-MM-dd") of an instant as seen in the given time zone. */
export function dateInZone(iso: string | undefined, timeZone: string): string | undefined {
  if (!iso) return undefined;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return undefined;
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  } catch {
    return toDateOnly(date);
  }
}
