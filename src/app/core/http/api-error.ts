import { HttpErrorResponse } from '@angular/common/http';

export interface ApiErrorInfo {
  status: number;
  /** i18n key describing the error class. */
  key: string;
  /** Server detail (ProblemDetails) – shown for 400/409 where it explains the business rule. */
  detail?: string;
}

/** Translates an unknown thrown value into something the UI can show. */
export function describeApiError(error: unknown): ApiErrorInfo {
  if (!(error instanceof HttpErrorResponse)) return { status: 0, key: 'care.errors.unknown' };
  // ProblemDetails (medication/nutrition) uses `detail`; Clinic Management answers { message }.
  const body = error.error as { detail?: unknown; message?: unknown } | string | null;
  const detail =
    typeof body === 'object' && body !== null
      ? typeof body.detail === 'string'
        ? body.detail
        : typeof body.message === 'string'
          ? body.message
          : undefined
      : undefined;

  switch (error.status) {
    case 0:
      return { status: 0, key: 'care.errors.network' };
    case 400:
      return { status: 400, key: 'care.errors.bad-request', detail };
    case 401:
      return { status: 401, key: 'care.errors.unauthorized' };
    case 403:
      return { status: 403, key: 'care.errors.forbidden' };
    case 404:
      return { status: 404, key: 'care.errors.not-found' };
    case 409:
      return { status: 409, key: 'care.errors.conflict', detail };
    default:
      return { status: error.status, key: 'care.errors.server' };
  }
}
