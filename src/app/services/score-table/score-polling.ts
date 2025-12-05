import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs'; // Necesitas importar Observable
import { environment } from '../../environments/environment.dev';
import { ScoreResponse } from '../../models/ScoreResponse';


@Injectable({
  providedIn: 'root',
})
export class ScorePolling {
    private http = inject(HttpClient);
    private apiUrl = 'http:'+ environment.apiUrl + '/ranking'; 

    /**
     * Realiza una petición GET al endpoint /ranking/position 
     * para obtener la tabla de posiciones completa.
     * @returns Observable<ScoreResponse[]>
     */
    getRanking(): Observable<ScoreResponse[]> {
        // El HttpClient se encarga de convertir el JSON de la respuesta al tipo ScoreResponse[]
        return this.http.get<ScoreResponse[]>(`${this.apiUrl}/position`);
    }
}