import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Subscription } from 'rxjs';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { WebSocketConnection } from '../../services/connection/web-socket-connection';
import { ScoreResponse } from '../../models/ScoreResponse';
import { ScoreMessage } from '../../models/ScoreMessage';
import { Inject, PLATFORM_ID } from '@angular/core';

type Cell = {
  r: number;
  c: number;
  letter: string;
  found?: boolean;
  selected?: boolean;
};

type PlacedWord = {
  word: string;
  start: { r: number; c: number };
  dir: { dr: number; dc: number };
  coords: { r: number; c: number }[];
  found: boolean;
};

@Component({
  selector: 'app-wordsearch',
  imports: [CommonModule, HttpClientModule],
  templateUrl: './word-search.html',
  styleUrls: ['./word-search.css'],
  host: { ngSkipHydration: '' }
})
export class WordSearch implements OnInit, OnDestroy {
  // GRID fijo 12x12
  readonly SIZE = 12;
  grid: Cell[][] = [];

  // Palabras (traídas de la API; luego se toman 10 válidas)
  allWords: string[] = [];
  wordsToFind: PlacedWord[] = [];

  // Selección por arrastre
  selecting = false;
  currentSelection: Cell[] = [];

  // Timer & score
  timer = 0;
  timerId: any = null;
  score = 0; // Puntaje total (sumará 10 por palabra encontrada)

  // UI/estado
  loading = false;
  message = '';
  socketSub!: Subscription;
  apiSub!: Subscription;

  // Direcciones posibles (8)
  directions = [
    { dr: 0, dc: 1 },
    { dr: 1, dc: 0 },
    { dr: 0, dc: -1 },
    { dr: -1, dc: 0 },
    { dr: 1, dc: 1 },
    { dr: -1, dc: -1 },
    { dr: 1, dc: -1 },
    { dr: -1, dc: 1 },
  ];

  // fallback words (in case the API doesn't return enough valid words)
  fallbackWords = [
    'GATO','PERRO','CASA','LIBRO','LUNA','SOL','MAR','ARBOl'.toUpperCase(),
    'AMIGO','RAPIDO','NUBE','FLOR','SONIDO','MESA','SILLA','VENTANA'
  ];

  constructor(
    private http: HttpClient,
    private socket: WebSocketConnection,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.initEmptyGrid();
    // Nos suscribimos a respuestas del servidor STOMP (si las hay)
    this.socketSub = this.socket.getScoreResponse().subscribe((resp: ScoreResponse) => {
      if (resp) {
        // muestra server message si lo recibe
        console.log('Respuesta STOMP:', resp.message);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopTimer();
    this.socketSub?.unsubscribe();
    this.socket.disconnect();
  }

  // ---------------------------
  // Grid y palabras
  // ---------------------------
  initEmptyGrid() {
    this.grid = Array.from({ length: this.SIZE }, (_, r) =>
      Array.from({ length: this.SIZE }, (_, c) => ({ r, c, letter: '', found: false, selected: false }))
    );
  }

  async startGame() {
    this.loading = true;
    this.resetState();

    // conectar socket (nativo)
    if (isPlatformBrowser(this.platformId)) {
      try {
        this.socket.connect();
      } catch (e) {
        console.warn('No se pudo conectar al WebSocket:', e);
      }
    }

    // traer 15 palabras y filtrar
    try {
      const url = 'https://random-word-api.herokuapp.com/word?number=15&lang=es';

      const response = await this.http.get<string[]>(url).toPromise();
      const list = Array.isArray(response) ? response : [];

      // Validar: solo letras (incluye ñ, acentos), mínimo 3 caracteres
      const validWords = list
        .map(w => (typeof w === 'string' ? w.trim() : ''))
        .filter(w => /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ]+$/.test(w) && w.length >= 3)
        .map(w => w.toUpperCase());

      this.allWords = validWords;

    } catch (error) {
      console.warn('Error consultando la API:', error);
      this.allWords = [];
    }

    // Si no alcanzan 10, completar con fallback
    const needed = 10;
    if (this.allWords.length < needed) {
      const faltan = needed - this.allWords.length;
      const filler = this.fallbackWords
        .map(s => s.toUpperCase())
        .filter(s => !this.allWords.includes(s))
        .slice(0, faltan);
      this.allWords = [...this.allWords, ...filler];
    }

    // Si vienen más de 10, tomar 10 aleatorias
    if (this.allWords.length > needed) {
      this.shuffleArray(this.allWords);
      this.allWords = this.allWords.slice(0, needed);
    }

    // Colocar palabras en la grilla
    this.initEmptyGrid();
    this.wordsToFind = [];
    for (const w of this.allWords) {
      const placed = this.tryPlaceWord(w);
      if (!placed) {
        console.warn('No se pudo colocar palabra:', w);
      }
    }
    this.fillEmptyWithRandom();

    // iniciar timer
    this.startTimer();
    this.loading = false;
  }

  resetState() {
    this.stopTimer();
    this.timer = 0;
    this.score = 0;
    this.currentSelection = [];
    this.wordsToFind = [];
    this.initEmptyGrid();
    this.message = '';
    // limpiar found
    this.grid.forEach(row => row.forEach(cell => { cell.found = false; cell.selected = false; }));
  }

  // intenta colocar una palabra en la parrilla
  tryPlaceWord(word: string): boolean {
    const MAX_TRIES = 200;
    const upper = word.toUpperCase();
    for (let t = 0; t < MAX_TRIES; t++) {
      const dir = this.directions[Math.floor(Math.random() * this.directions.length)];
      const r = Math.floor(Math.random() * this.SIZE);
      const c = Math.floor(Math.random() * this.SIZE);
      const endR = r + dir.dr * (upper.length - 1);
      const endC = c + dir.dc * (upper.length - 1);
      if (endR < 0 || endR >= this.SIZE || endC < 0 || endC >= this.SIZE) continue;

      // verificar conflicto
      let ok = true;
      for (let i = 0; i < upper.length; i++) {
        const rr = r + dir.dr * i;
        const cc = c + dir.dc * i;
        const existing = this.grid[rr][cc].letter;
        if (existing && existing !== '' && existing !== upper[i]) {
          ok = false; break;
        }
      }
      if (!ok) continue;

      // colocar
      const coords: { r: number; c: number }[] = [];
      for (let i = 0; i < upper.length; i++) {
        const rr = r + dir.dr * i;
        const cc = c + dir.dc * i;
        this.grid[rr][cc].letter = upper[i];
        coords.push({ r: rr, c: cc });
      }
      this.wordsToFind.push({ word: upper, start: { r, c }, dir, coords, found: false });
      return true;
    }
    return false;
  }

  fillEmptyWithRandom() {
    const alphabet = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'; // incluir Ñ
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        if (!this.grid[r][c].letter || this.grid[r][c].letter === '') {
          const ch = alphabet[Math.floor(Math.random() * alphabet.length)];
          this.grid[r][c].letter = ch;
        }
      }
    }
  }

  // ---------------------------
  // Selección por arrastre (método A)
  // ---------------------------
  onCellDown(cell: Cell, event: MouseEvent | TouchEvent) {
    event.preventDefault();
    this.selecting = true;
    this.clearTemporarySelection();
    this.addToSelection(cell);
  }

  onCellEnter(cell: Cell, event?: MouseEvent | TouchEvent) {
    if (!this.selecting) return;
    const last = this.currentSelection[this.currentSelection.length - 1];
    if (last && last.r === cell.r && last.c === cell.c) return;
    this.addToSelection(cell);
  }

  onCellUp() {
    if (!this.selecting) return;
    this.selecting = false;
    const wordStr = this.currentSelection.map(ch => ch.letter).join('');
    const reversed = wordStr.split('').reverse().join('');
    const foundEntry = this.wordsToFind.find(p => !p.found && (p.word === wordStr || p.word === reversed));
    if (foundEntry) {
      // marcar como encontrado
      foundEntry.found = true;
      foundEntry.coords.forEach(coord => this.grid[coord.r][coord.c].found = true);
      // sumar puntaje (ej: 10 pts por palabra encontrada)
      this.score += 10;
      // enviar evento STOMP
      const msg: ScoreMessage = { message: `WORD=${foundEntry.word};TIME=${this.timer}` };
      this.socket.sendScore(msg);
      // notificar usuario
      this.message = `Encontrada: ${foundEntry.word}`;
    } else {
      // limpiar selección temporal
      this.clearTemporarySelection();
    }
    this.currentSelection = [];
    // si todas encontradas, detener timer
    if (this.wordsToFind.every(w => w.found)) {
      this.stopTimer();
      this.message = `¡Juego completado! Tiempo: ${this.timer}s - Puntaje: ${this.score}`;
    }
  }

  addToSelection(cell: Cell) {
    this.currentSelection.push(cell);
    this.grid[cell.r][cell.c].selected = true;
  }

  clearTemporarySelection() {
    for (let r = 0; r < this.SIZE; r++) {
      for (let c = 0; c < this.SIZE; c++) {
        this.grid[r][c].selected = false;
      }
    }
  }

  // ---------------------------
  // Resolver automáticamente (resalta todas)
  // ---------------------------
  autoSolve() {
    for (const pw of this.wordsToFind) {
      if (!pw.found) {
        pw.found = true;
        pw.coords.forEach(coord => this.grid[coord.r][coord.c].found = true);
        // enviar evento STOMP por cada palabra
        const msg: ScoreMessage = { message: `WORD=${pw.word};TIME=${this.timer}` };
        this.socket.sendScore(msg);
      }
    }
    this.stopTimer();
    this.message = `Resuelto automáticamente. Puntaje: ${this.score}`;
  }

  // ---------------------------
  // Timer
  // ---------------------------
  startTimer() {
    if (this.timerId) return;
    this.timerId = setInterval(() => {
      this.timer++;
    }, 1000);
  }

  stopTimer() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  // ---------------------------
  // Helpers UI
  // ---------------------------
  isFound(word: string) {
    const entry = this.wordsToFind.find(w => w.word === word);
    return !!entry && entry.found;
  }

  // shuffle in-place
  shuffleArray<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
