import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ClaimService } from './claim.service';

describe('ClaimService', () => {
    let service: ClaimService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [ClaimService]
        });
        service = TestBed.inject(ClaimService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should have raiseClaim method', () => {
        expect(service.raiseClaim).toBeDefined();
    });

    it('should fetch my claims', () => {
        expect(service.getMyClaims).toBeDefined();
    });

    it('should fetch pending claims for admin', () => {
        expect(service.getPendingClaims).toBeDefined();
    });

    it('should have getClaimOfficers method', () => {
        expect(service.getClaimOfficers).toBeDefined();
    });

    it('should have assignOfficer method', () => {
        expect(service.assignOfficer).toBeDefined();
    });

    it('should have getOfficerRequests method', () => {
        expect(service.getOfficerRequests).toBeDefined();
    });

    it('should have reviewClaim method', () => {
        expect(service.reviewClaim).toBeDefined();
    });

    it('should have getAgentClaims method', () => {
        expect(service.getAgentClaims).toBeDefined();
    });

    it('should have getClaimByPolicyId method', () => {
        expect(service.getClaimByPolicyId).toBeDefined();
    });

    it('should use the correct base API URL', () => {
        expect((service as any).apiUrl).toBe('https://localhost:7140/api/Claim');
    });

    it('should return an observable from getMyClaims', () => {
        const result = service.getMyClaims();
        expect(result).toBeTruthy();
    });

    it('should return an observable from getPendingClaims', () => {
        const result = service.getPendingClaims();
        expect(result).toBeTruthy();
    });

    it('should return an observable from getClaimOfficers', () => {
        const result = service.getClaimOfficers();
        expect(result).toBeTruthy();
    });
});
