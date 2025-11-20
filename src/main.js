import '@angular/compiler';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app.component.js';
import { SerialService } from './services/serial.service.js';

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideHttpClient(),
    { provide: SerialService, useClass: SerialService }
  ]
}).catch(err => console.error(err));