import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebSocketConnection } from '../../services/connection/web-socket-connection';

@Component({
  selector: 'app-score-websocket-tester',
  template: `
    <h2>Tester de WebSocket Nativo</h2>
    <p>Estado de la última respuesta: <strong>{{ latestResponse }}</strong></p>
    <button (click)="sendTestScore()">Enviar Puntaje de Prueba</button>
    <button (click)="wsService.disconnect()">Desconectar</button>
  `,
  // Nota: Si usas Angular 20, considera usar imports: [ScoreNativeWebSocketService] si es un componente standalone
})
export class ScoreWebsocketTesterComponent implements OnInit, OnDestroy {
  latestResponse: string = 'Conectando...';

  // Inyección del servicio
  constructor(public wsService: WebSocketConnection) {}

  ngOnInit(): void {
    // 1. Conectar al iniciar el componente
    this.wsService.connect();

    // 2. Suscribirse a las respuestas del servidor
    this.wsService.getScoreResponse().subscribe(response => {
      this.latestResponse = response.message;
      console.log('Respuesta del Servidor (Nativo):', response.message);
    });
  }

  sendTestScore(): void {
    const testMessage = { message: `Puntaje enviado: ${new Date().toLocaleTimeString()}` };
    this.wsService.sendScore(testMessage);
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
  }
}