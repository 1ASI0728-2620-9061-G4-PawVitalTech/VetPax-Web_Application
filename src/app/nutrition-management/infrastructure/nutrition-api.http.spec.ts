import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { environment } from '../../../environments/environment';
import { NutritionApiService } from './nutrition-api.service';

describe('NutritionApiService (HTTP contract)', () => {
  let service: NutritionApiService;
  let http: HttpTestingController;
  const base = environment.apiBaseUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(NutritionApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses feeding-plans endpoints, not nutrition-plans', () => {
    service.active('pet-1').subscribe();
    http.expectOne(`${base}/pets/pet-1/feeding-plans/active`).flush({ planId: 'f1' });
  });

  it('revises with PUT and without clinicId', () => {
    const body = { foodName: 'A', startDate: '2026-11-10', timeZoneId: 'America/Lima', schedules: [] };
    service.revise('f1', body).subscribe();
    const req = http.expectOne(`${base}/feeding-plans/f1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).not.toHaveProperty('clinicId');
    req.flush({ planId: 'f1' });
  });

  it('deactivates with PATCH', () => {
    service.deactivate('f1').subscribe();
    const req = http.expectOne(`${base}/feeding-plans/f1/deactivate`);
    expect(req.request.method).toBe('PATCH');
    req.flush(null);
  });
});
