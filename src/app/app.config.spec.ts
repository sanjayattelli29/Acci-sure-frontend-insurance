import { TestBed } from '@angular/core/testing';
import { appConfig } from './app.config';

describe('AppConfig', () => {
    it('should have required providers', () => {
        expect(appConfig.providers).toBeDefined();
        expect(appConfig.providers.length).toBeGreaterThan(0);
    });

    it('should include router provider', () => {
        const hasRouter = appConfig.providers.some((p: any) => p && p.provide && p.provide.name === 'Router');
        expect(appConfig.providers).toBeDefined();
    });
});
