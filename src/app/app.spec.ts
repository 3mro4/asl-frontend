import { Component } from '@angular/core';
import { TranslatorComponent } from './components/translator/translator';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TranslatorComponent],
  templateUrl: './app.html',
})
export class AppComponent {}