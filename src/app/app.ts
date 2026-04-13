import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslatorComponent } from './components/translator/translator';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TranslatorComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('asl-frontend');
}
