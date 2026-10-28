import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: '<main class="blank-dashboard" aria-label="Dashboard VetPax"></main>',
  styles: [`.blank-dashboard { display:block; width:100%; min-height:100vh; background:#fff; }`],
})
export class DashboardComponent {}
