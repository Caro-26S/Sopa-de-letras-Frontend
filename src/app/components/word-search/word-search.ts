import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { WebSocketConnection } from '../../services/connection/web-socket-connection';
import { ScoreResponse } from '../../models/ScoreResponse';
import { ScoreMessage } from '../../models/ScoreMessage';

@Component({
  selector: 'app-wordsearch',
  imports: [],
  templateUrl: './word-search.html',
  styleUrls: ['./word-search.css'],
})
export class WordSearch implements OnInit, OnDestroy {

  grid: string[][] = [];
  words: string[] = ['ANGULAR', 'SOCKET', 'SPRING', 'JAVA', 'PUZZLE'];
  foundWords: Set<string> = new Set();

  timer = 0;
  intervalId: any;

  socketSubscription!: Subscription;

  constructor(private socketService: WebSocketConnection) {}

  ngOnInit() {
    this.generateGrid();
    this.startTimer();

    this.socketService.connectAndSubscribe();

    this.socketSubscription = this.socketService.getScoreResponse().subscribe(
      (response: ScoreResponse | null) => {
        if (response) {
          console.log('Respuesta desde Spring Boot:', response.message);
        }
      }
    );
  }

  ngOnDestroy() {
    clearInterval(this.intervalId);

    if (this.socketSubscription) {
      this.socketSubscription.unsubscribe();
    }

    this.socketService.disconnect();
  }

  generateGrid() {
    const size = 12;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    this.grid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () =>
        letters[Math.floor(Math.random() * letters.length)]
      )
    );
  }

  startTimer() {
    this.intervalId = setInterval(() => {
      this.timer++;
    }, 1000);
  }

  markWordAsFound(word: string) {
    if (!this.words.includes(word)) return;

    this.foundWords.add(word);

    // 🔥 ScoreMessage EXACTO de tu interfaz
    const scoreMessage: ScoreMessage = {
      message: `WORD=${word};TIME=${this.timer}`
    };

    console.log("Enviando mensaje:", scoreMessage.message);
    this.socketService.sendScore(scoreMessage);
  }

  isFound(word: string): boolean {
    return this.foundWords.has(word);
  }
}
