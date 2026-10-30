import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { ClinicProfile } from './clinic.models';
import { ClinicService } from './clinic.service';

describe('ClinicService', () => {
  let service: ClinicService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClinicService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ClinicService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the clinic directory with supported pagination', () => {
    service.list().subscribe((page) => expect(page.items[0].name).toBe('VetPax Clinic'));

    const request = http.expectOne(`${environment.apiBaseUrl}/clinics?page=1&pageSize=50`);
    expect(request.request.method).toBe('GET');
    request.flush({
      page: 1,
      pageSize: 50,
      totalCount: 1,
      items: [
        {
          clinicId: 'clinic-1',
          name: 'VetPax Clinic',
          address: 'Lima',
          phone: null,
          contactEmail: null,
        },
      ],
    });
  });

  it('updates only fields supported by the clinic profile contract', () => {
    const payload = {
      name: 'VetPax Clinic',
      address: 'Lima',
      phone: null,
      contactEmail: 'clinic@vetpax.com',
      openingHours: [{ dayOfWeek: 1, openTime: '08:00:00', closeTime: '18:00:00' }],
    };
    service
      .update('clinic-1', payload)
      .subscribe((clinic) => expect(clinic.name).toBe(payload.name));

    const request = http.expectOne(`${environment.apiBaseUrl}/clinics/clinic-1`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(payload);
    request.flush({
      clinicId: 'clinic-1',
      updatedAt: new Date().toISOString(),
      ...payload,
    } satisfies ClinicProfile);
  });
});
