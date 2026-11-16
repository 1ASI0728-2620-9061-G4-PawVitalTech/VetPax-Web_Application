const LOCALE = 'es-PE';

export function toApiDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

export function addDays(value: Date, days: number): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate() + days);
}

export function fromApiDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatLong(value: Date): string {
  const text = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' }).format(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatShort(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(date).replace(/\./g, '');
}

export function weekdayShort(value: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { weekday: 'short' }).format(value).replace('.', '').toUpperCase();
}

export function formatRange(from: Date, to: Date): string {
  const f = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' });
  const y = new Intl.DateTimeFormat(LOCALE, { year: 'numeric' }).format(to);
  return `${f.format(from)} al ${f.format(to)}, ${y}`;
}
