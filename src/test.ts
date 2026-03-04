// This file is required by karma.conf.js and loads recursively all the .spec and framework files

import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';

// Initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Global Mocks
(window as any).IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock SignalR
(window as any).signalR = {
  HubConnectionBuilder: class {
    withUrl() { return this; }
    withAutomaticReconnect() { return this; }
    build() {
      return {
        start: () => Promise.resolve(),
        stop: () => Promise.resolve(),
        on: () => {},
        off: () => {},
        invoke: () => Promise.resolve(),
        send: () => Promise.resolve()
      };
    }
  },
  HubConnectionState: {
    Connected: 'Connected',
    Disconnected: 'Disconnected'
  },
  HttpTransportType: {
    WebSockets: 1
  },
  LogLevel: {
    None: 0,
    Information: 4
  }
};
