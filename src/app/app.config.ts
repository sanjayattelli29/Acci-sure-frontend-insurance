import { ApplicationConfig, provideBrowserGlobalErrorListeners, ErrorHandler } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { ChunkErrorHandler } from './services/chunk-error-handler.provider';

// main app configuration for angular standalone app
// sets up routing, http client, interceptors, error handlers
export const appConfig: ApplicationConfig = {
  providers: [
    // custom error handler for chunk loading failures
    { provide: ErrorHandler, useClass: ChunkErrorHandler },
    // enable global error listeners
    provideBrowserGlobalErrorListeners(),
    // setup routing with defined routes
    provideRouter(routes),
    // setup http client with auth interceptor to add jwt token
    provideHttpClient(
      withInterceptors([authInterceptor])
    )
  ]
};
