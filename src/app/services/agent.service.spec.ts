import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AgentService } from './agent.service';

describe('AgentService', () => {
    let service: AgentService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AgentService]
        });
        service = TestBed.inject(AgentService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have getMyRequests method', () => {
        expect(service.getMyRequests).toBeDefined();
    });

    it('should have reviewRequest method', () => {
        expect(service.reviewRequest).toBeDefined();
    });

    it('should have getCommissionStats method', () => {
        expect(service.getCommissionStats).toBeDefined();
    });

    it('should have getAnalytics method', () => {
        expect(service.getAnalytics).toBeDefined();
    });

    it('should have sendAgentEmail method', () => {
        expect(service.sendAgentEmail).toBeDefined();
    });

    it('should use the correct base API URL', () => {
        expect((service as any).apiUrl).toBe('https://localhost:7140/api/Agent');
    });

    it('should return an observable from getMyRequests', () => {
        const result = service.getMyRequests();
        expect(result).toBeTruthy();
    });

    it('should return an observable from getAnalytics', () => {
        const result = service.getAnalytics();
        expect(result).toBeTruthy();
    });

    it('should return an observable from getCommissionStats', () => {
        const result = service.getCommissionStats();
        expect(result).toBeTruthy();
    });

    it('should return an observable from reviewRequest', () => {
        const result = service.reviewRequest('1', 'Approved');
        expect(result).toBeTruthy();
    });
});
