import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment.dev';
import { RxStomp, RxStompConfig } from '@stomp/rx-stomp'; // Importa la librería
import { ScoreResponse } from '../../models/ScoreResponse';
import { ScoreMessage } from '../../models/ScoreMessage';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class WebSocketConnection {
    // La URL usa 'ws' (WebSocket) en lugar de 'http' y apunta al endpoint de WebSocket
    // Usamos 'ws' o 'wss' (para SSL) y el endpoint de WebSocket, NO el endpoint STOMP completo
    private readonly BASE_WS_URL = `ws:${environment.apiUrl}/websocket`;
    private readonly SUBSCRIBE_TOPIC = '/list/score'; 
    private readonly SEND_DESTINATION = '/app/score';
    
    // Inyectamos el servicio de RxStomp (proporcionado en app.config.ts)
    constructor(
      private rxStompService: RxStomp,
      @Inject(PLATFORM_ID) private platformId: Object
    ) {
        if (isPlatformBrowser(this.platformId)) {
            // Configuramos la conexión solo si estamos en el navegador
            this.configureStomp();
        } else {
            console.warn('SSR: Conexión WebSocket omitida en el servidor.');
        }
    }

    /**
     * Define la configuración de STOMP, incluyendo la URL, heart-beats y conexión.
     */
    private configureStomp(): void {
        const stompConfig: RxStompConfig = {
            // URL de conexión (usa la librería SockJS para compatibilidad)
            // StompService manejará el WebSocket nativo o SockJS automáticamente
            brokerURL: this.BASE_WS_URL, 
            
            // Reintentos de conexión
            reconnectDelay: 500,
            
            // Heart-beats (opcional, ayuda a mantener la conexión viva)
            heartbeatIncoming: 10000, 
            heartbeatOutgoing: 10000,
            
            // Opcional: headers de conexión (si los necesitas para autenticación)
            connectHeaders: {
                // 'login': 'guest',
                // 'passcode': 'guest'
            }
        };

        this.rxStompService.configure(stompConfig);
        this.rxStompService.activate(); // Inicia la conexión
    }

    /**
     * Obtiene un Observable para suscribirse a las respuestas de puntaje desde el servidor.
     * @returns Observable<ScoreResponse>
     */
    public getScoreResponse(): Observable<ScoreResponse> {
        // La librería maneja la suscripción STOMP después de la conexión
        return this.rxStompService.watch(this.SUBSCRIBE_TOPIC).pipe(
            map(message => {
                // El cuerpo del mensaje de STOMP se extrae automáticamente
                // y necesitamos parsear el JSON
                return JSON.parse(message.body) as ScoreResponse;
            })
        );
    }

    /**
     * Envía un mensaje al controlador de Spring Boot.
     */
    public sendScore(scoreMessage: ScoreMessage): void {
        const body = JSON.stringify(scoreMessage);
        
        // La librería construye el frame SEND correctamente con headers y terminador nulo
        this.rxStompService.publish({
            destination: this.SEND_DESTINATION,
            body: body,
            headers: {
                'content-type': 'application/json',
                // Otros headers opcionales...
            }
        });
        console.log('WebSocket: Mensaje STOMP enviado a', this.SEND_DESTINATION);
    }

    public disconnect(): void {
        this.rxStompService.deactivate();
        console.log('WebSocket desconectado.');
    }
}