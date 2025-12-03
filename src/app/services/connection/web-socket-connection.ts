import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { BehaviorSubject, Observable } from 'rxjs';
import { ScoreResponse } from '../../models/ScoreResponse';
import { ScoreMessage } from '../../models/ScoreMessage';

@Injectable({
  providedIn: 'root',
})
export class WebSocketConnection {
  private stompClient: any;
  // Usaremos un BehaviorSubject para la respuesta del servidor (ScoreResponse)
  private scoreResponseSubject: BehaviorSubject<ScoreResponse | null> = new BehaviorSubject<ScoreResponse | null>(null);

  // La URL debe coincidir con la de tu servidor Spring Boot y el endpoint de STOMP
  // Asumiendo que Spring Boot se ejecuta en el puerto 8080 (típico)
  private readonly WEBSOCKET_ENDPOINT = 'http://localhost:9090/websocket';
  private readonly SUBSCRIBE_TOPIC = '/list/score'; // El @SendTo de tu controlador
  private readonly SEND_DESTINATION = '/app/score'; // El @MessageMapping de tu controlador

  constructor(private httpClient: HttpClient) {
    this.initConnenctionSocket();
  }

  /**
   * Inicializa la conexión STOMP sobre SockJS.
   */
  initConnenctionSocket() {
    console.log('Iniciando conexión WebSocket...');
    const socket = new SockJS(this.WEBSOCKET_ENDPOINT);
    this.stompClient = Stomp.over(socket);
  }

  /**
   * Establece la conexión y se suscribe al tópico de puntaje.
   */
  connectAndSubscribe(): void {
    this.stompClient.connect({}, (frame: any) => {
      console.log('Conectado: ' + frame);

      // Suscripción al tópico definido por @SendTo("/list/score")
      this.stompClient.subscribe(this.SUBSCRIBE_TOPIC, (response: any) => {
        const scoreResponse: ScoreResponse = JSON.parse(response.body);
        console.log('Respuesta del servidor recibida:', scoreResponse);
        this.scoreResponseSubject.next(scoreResponse);
      });

    }, (error: any) => {
        console.error('Error de conexión:', error);
    });
  }

  /**
   * Envía un mensaje de puntaje al controlador de Spring Boot.
   * @param message El objeto ScoreMessage a enviar.
   */
  sendScore(message: ScoreMessage): void {
    if (this.stompClient && this.stompClient.connected) {
      console.log('Enviando mensaje a:', this.SEND_DESTINATION);
      this.stompClient.send(
        this.SEND_DESTINATION,
        {},
        JSON.stringify(message)
      );
    } else {
      console.error('STOMP client no conectado. Por favor, llama a connectAndSubscribe() primero.');
    }
  }

  /**
   * Retorna un Observable para escuchar las respuestas del servidor.
   */
  getScoreResponse(): Observable<ScoreResponse | null> {
    return this.scoreResponseSubject.asObservable();
  }

  disconnect(): void {
    if (this.stompClient) {
      this.stompClient.disconnect();
      console.log("Desconectado.");
    }
  }

}