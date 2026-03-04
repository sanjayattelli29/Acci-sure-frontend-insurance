import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PolicyService } from './policy.service';

describe('PolicyService', () => {
    let service: PolicyService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [PolicyService]
        });
        service = TestBed.inject(PolicyService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have getConfiguration method', () => {
        expect(service.getConfiguration).toBeDefined();
    });

    it('should have calculatePremium method', () => {
        expect(service.calculatePremium).toBeDefined();
    });

    it('should have applyForPolicy method', () => {
        expect(service.applyForPolicy).toBeDefined();
    });

    it('should have getMyPolicies method', () => {
        expect(service.getMyPolicies).toBeDefined();
    });

    it('should have processPayment method', () => {
        expect(service.processPayment).toBeDefined();
    });

    it('should have getAgentCustomers method', () => {
        expect(service.getAgentCustomers).toBeDefined();
    });

    it('should have sendChatQuestion method', () => {
        expect(service.sendChatQuestion).toBeDefined();
    });

    it('should use the correct base API URL', () => {
        expect((service as any).apiUrl).toBe('https://localhost:7140/api/Policy');
    });

    it('should return an observable from getConfiguration', () => {
        const result = service.getConfiguration();
        expect(result).toBeTruthy();
    });

    it('should return an observable from getMyPolicies', () => {
        const result = service.getMyPolicies();
        expect(result).toBeTruthy();
    });
});
