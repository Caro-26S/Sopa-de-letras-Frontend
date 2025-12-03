import { Inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ScoreResponse } from '../../models/ScoreResponse';
import { ScoreMessage } from '../../models/ScoreMessage';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment.dev';
import { Sign } from 'crypto';

@Injectable({
  providedIn: 'root',
})
export class WebSocketConnection {
  // La URL usa 'ws' (WebSocket) en lugar de 'http' y apunta al endpoint STOMP
  private readonly WS_URL = `ws:${environment.apiUrl}/websocket`;
  private readonly SUBSCRIBE_TOPIC = '/list/score'; // Tópico de suscripción (ej. @SendTo)
  private readonly SEND_DESTINATION = '/app/score'; // Destino de envío (ej. @MessageMapping)
  
  private socket!: WebSocket;
  private messageIdCounter = 1; // Contador para IDs de mensajes STOMP
  
  // Subject para emitir las respuestas del servidor al componente
  private scoreResponseSubject = new Subject<ScoreResponse>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Obtiene un Observable para suscribirse a las respuestas de puntaje.
   */
  public getScoreResponse(): Observable<ScoreResponse> {
    return this.scoreResponseSubject.asObservable();
  }

  /**
   * Conecta al WebSocket y maneja los eventos del protocolo STOMP.
   */
  public connect(): void {
    if (!isPlatformBrowser(this.platformId)) {
      console.warn('SSR: Conexión WebSocket omitida en el servidor.');
      return;
    }
    
    console.log('Intentando conectar a WebSocket nativo...');
    
    // 1. Inicializar la conexión nativa
    this.socket = new WebSocket(this.WS_URL);

    this.socket.onopen = () => {
      console.log('WebSocket: Conectado. Enviando frame CONNECT STOMP.');
      // 2. Enviar el primer frame STOMP (CONNECT) al servidor
      const connectFrame = 'CONNECT\naccept-version:1.2\nheart-beat:10000,10000\n\n\u0000';
      this.socket.send(connectFrame);
      
      // 3. Suscribirse al tópico después de la conexión STOMP
      this.subscribeToScore();
    };

    this.socket.onmessage = (event) => {
      const message = event.data;
      if (message.startsWith('MESSAGE')) {
        this.handleStompMessage(message);
      }
      // Se ignoran frames de CONNECTED, HEARTBEAT, etc. por simplicidad
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };

    this.socket.onclose = () => {
      console.log('WebSocket: Desconectado.');
    };
  }

  /**
   * Crea y envía el frame STOMP SUBSCRIBE.
   */
  private subscribeToScore(): void {
    const subscribeFrame = `SUBSCRIBE\nid:sub-${this.messageIdCounter++}\ndestination:${this.SUBSCRIBE_TOPIC}\n\n\u0000`;
    this.socket.send(subscribeFrame);
    console.log(`WebSocket: Suscrito a ${this.SUBSCRIBE_TOPIC}`);
  }

  /**
   * Procesa el frame STOMP MESSAGE recibido y extrae el cuerpo JSON.
   */
  private handleStompMessage(stompMessage: string): void {
    // El cuerpo JSON está después de la línea vacía y antes del terminador \u0000
    const bodyIndex = stompMessage.indexOf('\n\n');
    if (bodyIndex === -1) return;

    const body = stompMessage.substring(bodyIndex + 2, stompMessage.length - 1);
    
    try {
      const response: ScoreResponse = JSON.parse(body);
      this.scoreResponseSubject.next(response);
    } catch (e) {
      console.error('Error al parsear JSON del mensaje STOMP:', e, body);
    }
  }

  /**
   * Envía un mensaje al controlador de Spring Boot usando el protocolo STOMP.
   */
  public sendScore(scoreMessage: ScoreMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      const body = JSON.stringify(scoreMessage);
      
      // Crear el frame STOMP SEND
      const sendFrame = `SEND\ndestination:${this.SEND_DESTINATION}\ncontent-type:application/json\ncontent-length:${body.length}\n\n${body}\u0000`;
      
      this.socket.send(sendFrame);
      console.log('WebSocket: Mensaje STOMP enviado a', this.SEND_DESTINATION);
    } else {
      console.warn('WebSocket no está conectado o listo para enviar.');
    }
  }
  
  public disconnect(): void {
    if (this.socket) {
      // Opcionalmente, enviar un frame DISCONNECT STOMP
      this.socket.send('DISCONNECT\n\n\u0000');
      this.socket.close();
      console.log('WebSocket desconectado.');
    }
  }
}