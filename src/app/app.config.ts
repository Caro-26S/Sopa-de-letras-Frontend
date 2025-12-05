import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withFetch } from '@angular/common/http';

// 1. Importar las clases necesarias de @stomp/rx-stomp
import { RxStomp } from '@stomp/rx-stomp';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes), 
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),

    // 2. Añadir el RxStomp a los providers
    {
      provide: RxStomp,
      useValue: new RxStomp(), // Crear una instancia de RxStomp
    }
  ]
};