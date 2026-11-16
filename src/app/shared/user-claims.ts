/** Reads display information from the access token (no network call). */
function decode(part: string): string {
  const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return decodeURIComponent(
    Array.from(atob(padded), (c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join(''),
  );
}

export function userDisplayName(token: string | null | undefined): string {
  if (!token) return '';
  try {
    const claims = JSON.parse(decode(token.split('.')[1] ?? '')) as Record<string, unknown>;
    const str = (key: string): string => (typeof claims[key] === 'string' ? (claims[key] as string).trim() : '');
    const full = str('name') || [str('given_name'), str('family_name')].filter(Boolean).join(' ');
    return full || str('preferred_username') || str('email').split('@')[0];
  } catch {
    return '';
  }
}
