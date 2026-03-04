import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// main entry point for angular app
// bootstraps the root app component with config
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
