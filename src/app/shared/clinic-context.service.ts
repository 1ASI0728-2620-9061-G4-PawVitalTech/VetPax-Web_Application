import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { CareDirectoryService } from './care/care-directory.service';
import { ClinicSummary } from './care/care.models';

/** Loads the clinic list once per session so several screens do not repeat the same request. */
@Injectable({ providedIn: 'root' })
export class ClinicContextService {
  private readonly directory = inject(CareDirectoryService);
  private cached?: Observable<ClinicSummary[]>;

  clinics(): Observable<ClinicSummary[]> {
    return (this.cached ??= this.directory.listClinics().pipe(shareReplay({ bufferSize: 1, refCount: false })));
  }
}
