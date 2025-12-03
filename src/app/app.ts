import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ScoreWebsocketTesterComponent } from './components/score-websocket-tester-component/score-websocket-tester-component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ScoreWebsocketTesterComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('Sopa-de-Letras');
}
