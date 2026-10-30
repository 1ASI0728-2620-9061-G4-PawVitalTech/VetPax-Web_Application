import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { AppointmentService } from './appointment.service';

describe('AppointmentService', () => {
  let service: AppointmentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AppointmentService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AppointmentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('requests the veterinarian agenda for the selected week', () => {
    service
      .agenda('clinic-1', '2026-10-26', '2026-11-01')
      .subscribe((agenda) => expect(agenda.appointments).toEqual([]));

    const request = http.expectOne(
      (candidate) =>
        candidate.url === `${environment.apiBaseUrl}/appointments/agenda` &&
        candidate.params.get('clinicId') === 'clinic-1' &&
        candidate.params.get('from') === '2026-10-26' &&
        candidate.params.get('to') === '2026-11-01',
    );
    expect(request.request.method).toBe('GET');
    request.flush({ clinicId: 'clinic-1', from: '2026-10-26', to: '2026-11-01', appointments: [] });
  });

  it('sends the supported reschedule operation', () => {
    const payload = { operation: 'reschedule' as const, date: '2026-11-02', startTime: '10:30:00' };
    service.reschedule('appointment-1', payload).subscribe();

    const request = http.expectOne(`${environment.apiBaseUrl}/appointments/appointment-1`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual(payload);
    request.flush({});
  });
});
