import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler } from '@angular/core';
import { TitleStrategy, provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { routes } from './app.routes';
import { CustomErrorHandler } from './core/errors/error.handler';
import { provideIcons } from './core/icons';
import { TranslatedTitleStrategy } from './core/i18n/title.strategy';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    provideIcons(),
    { provide: ErrorHandler, useClass: CustomErrorHandler },
    { provide: TitleStrategy, useClass: TranslatedTitleStrategy },
  ]
};
