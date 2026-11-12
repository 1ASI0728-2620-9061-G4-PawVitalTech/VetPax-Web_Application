import { Component, ViewEncapsulation, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';
import { LanguageSwitcherComponent } from '../../language-switcher/language-switcher.component';

/**
 * Temporary frame for the care screens (top bar + content area) so they work on their own
 * before the global dashboard shell exists. When feature/dashboard lands, replace this
 * component in the route definitions by the shared layout; pages do not depend on it.
 * Hosts the shared `.care-*` classes used by medication and nutrition pages.
 */
@Component({
  selector: 'app-care-shell',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, TranslateModule, LanguageSwitcherComponent],
  template: `
    <header class="care-topbar">
      <a class="care-brand" routerLink="/dashboard"><mat-icon>pets</mat-icon><span>VetPax</span></a>
      <nav class="care-nav" [attr.aria-label]="'care.nav.label' | translate">
        <a routerLink="/medication" routerLinkActive="active"><mat-icon>medication</mat-icon>{{ 'care.nav.medication' | translate }}</a>
        <a routerLink="/nutrition" routerLinkActive="active"><mat-icon>restaurant</mat-icon>{{ 'care.nav.nutrition' | translate }}</a>
      </nav>
      <span class="care-spacer"></span>
      <app-language-switcher />
      <button mat-button type="button" (click)="auth.logout()"><mat-icon>logout</mat-icon>{{ 'care.nav.logout' | translate }}</button>
    </header>
    <main class="care-main"><router-outlet /></main>
  `,
  styles: [`
    .care-topbar{min-height:76px;display:flex;align-items:center;gap:16px;padding:10px var(--workspace-gutter);background:var(--workspace-surface);border-bottom:1px solid var(--workspace-border);position:sticky;top:0;z-index:10}
    .care-brand{display:flex;align-items:center;gap:6px;font-weight:700;font-size:20px;color:var(--color-primary);text-decoration:none}
    .care-brand mat-icon{color:var(--color-secondary)}
    .care-nav{display:flex;gap:6px;margin-left:16px}
    .care-nav a{display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;color:var(--color-primary-3);text-decoration:none;font-weight:500;font-size:14px}
    .care-nav a:hover{background:var(--color-neutral-1)}
    .care-nav a.active{background:var(--color-secondary);color:#fff}
    .care-spacer{flex:1}
    .care-main{max-width:var(--workspace-content-max);margin:0 auto;padding:28px var(--workspace-gutter) 48px}
    .care-page-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:20px}
    .care-page-head h2{font-size:30px;margin:4px 0}
    .care-crumbs{font-size:13px;color:var(--color-neutral-dark)}
    .care-crumbs a{color:var(--color-secondary-2);text-decoration:none}
    .care-sub{margin:0;color:var(--color-neutral-dark);font-size:14px}
    .care-card{background:var(--workspace-surface);border:1px solid var(--workspace-border);border-radius:16px;padding:20px;margin-bottom:16px}
    .care-card h3{font-size:18px;margin:0 0 4px;display:flex;align-items:center;gap:8px}
    .care-card h3 mat-icon{color:var(--color-secondary)}
    .care-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-top:12px}
    .care-kv span{display:block;font-size:12px;color:var(--color-neutral-dark)}
    .care-kv strong{font-size:15px}
    .care-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
    .care-chip{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;background:var(--color-neutral-1);color:var(--color-primary-3)}
    .care-chip.ok{background:#dcfce7;color:#166534}.care-chip.info{background:#e0f2fe;color:#075985}
    .care-chip.warn{background:#fef3c7;color:#92400e}.care-chip.bad{background:#fee2e2;color:#991b1b}
    .care-empty{text-align:center;padding:36px 16px;color:var(--color-neutral-dark)}
    .care-empty mat-icon{font-size:40px;width:40px;height:40px;color:var(--color-neutral-3)}
    .care-error{display:flex;gap:10px;align-items:flex-start;padding:12px 16px;border-radius:12px;background:var(--color-error-subtle);color:#991b1b;margin-bottom:16px}
    .care-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:0 16px}
    .care-form-grid .wide{grid-column:1/-1}
    .care-schedule{display:grid;grid-template-columns:130px 1fr 110px 110px auto;gap:12px;align-items:start;padding:12px;border:1px solid var(--color-neutral-2);border-radius:12px;margin-bottom:10px;background:var(--color-neutral)}
    .care-days{display:flex;gap:4px;flex-wrap:wrap}
    .care-day{border:1px solid var(--color-neutral-3);background:#fff;border-radius:999px;padding:5px 10px;font-size:12px;cursor:pointer;color:var(--color-primary-3)}
    .care-day.on{background:var(--color-secondary);border-color:var(--color-secondary);color:#fff}
    .care-slot{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:12px;background:var(--color-neutral-1);margin-bottom:8px}
    .care-slot .time{font-family:monospace;font-weight:700;background:#fff;border-radius:8px;padding:4px 8px}
    table.care-table{width:100%}
    .care-table th{font-size:12px;color:var(--color-neutral-dark)}
    .care-hint{font-size:12px;color:var(--color-neutral-dark);margin:4px 0 12px}
    @media (max-width:760px){.care-schedule{grid-template-columns:1fr 1fr}.care-main{padding:20px 16px 48px}.care-page-head h2{font-size:25px}.care-nav{display:none}}
  `],
})
export class CareShellComponent {
  protected readonly auth = inject(AuthService);
}
