import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { MedicationApiService } from './medication-api.service';

describe('MedicationApiService (HTTP contract)', () => {
  let service: MedicationApiService;
  let http: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MedicationApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('prescribes through POST /pets/{petId}/medication-plans', () => {
    const body = { clinicId: 'c', medicationName: 'X', route: 'Oral', startDate: '2026-11-10', timeZoneId: 'America/Lima', schedules: [] };
    service.prescribe('pet-1', body).subscribe();
    const req = http.expectOne(`${base}/pets/pet-1/medication-plans`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ planId: 'p1' });
  });

  it('sends the supported PATCH operations', () => {
    service.change('p1', { operation: 'cancel' }).subscribe();
    const req = http.expectOne(`${base}/medication-plans/p1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ operation: 'cancel' });
    req.flush({});
  });

  it('queries doses with date-only from/to', () => {
    service.doses('p1', '2026-11-10', '2026-11-13').subscribe((d) => expect(d).toEqual([]));
    const req = http.expectOne((r) => r.url === `${base}/medication-plans/p1/doses` && r.params.get('from') === '2026-11-10' && r.params.get('to') === '2026-11-13');
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
