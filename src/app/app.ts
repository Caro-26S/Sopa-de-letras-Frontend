import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { WordSearch } from './components/word-search/word-search';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, WordSearch],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Sopa-de-Letras');
}
