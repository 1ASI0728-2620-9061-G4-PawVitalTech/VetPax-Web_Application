import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  title = 'VetPax';

  constructor(translate: TranslateService) {
    const saved = localStorage.getItem('app-lang');
    const browser = translate.getBrowserLang();
    const lang = saved || (browser === 'en' ? 'en' : 'es');
    translate.addLangs(['es', 'en']);
    translate.setFallbackLang('es');
    translate.use(lang);
  }
}
