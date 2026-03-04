import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AdminService } from './admin.service';

describe('AdminService', () => {
    let service: AdminService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AdminService]
        });
        service = TestBed.inject(AdminService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should fetch all users', () => {
        expect(service.getAllUsers).toBeDefined();
    });

    it('should fetch agents', () => {
        expect(service.getAgents).toBeDefined();
    });

    it('should get admin stats', () => {
        expect(service.getAdminStats).toBeDefined();
    });

    it('should have getClaimOfficers method', () => {
        expect(service.getClaimOfficers).toBeDefined();
    });

    it('should have createAgent method', () => {
        expect(service.createAgent).toBeDefined();
    });

    it('should have createClaimOfficer method', () => {
        expect(service.createClaimOfficer).toBeDefined();
    });

    it('should have deleteUser method', () => {
        expect(service.deleteUser).toBeDefined();
    });

    it('should have getPolicyRequests method', () => {
        expect(service.getPolicyRequests).toBeDefined();
    });

    it('should have getAgentsWithLoad method', () => {
        expect(service.getAgentsWithLoad).toBeDefined();
    });

    it('should have assignAgent method', () => {
        expect(service.assignAgent).toBeDefined();
    });

    it('should have getAllClaims method', () => {
        expect(service.getAllClaims).toBeDefined();
    });

    it('should have getUnifiedPayments method', () => {
        expect(service.getUnifiedPayments).toBeDefined();
    });

    it('should have sendAdminEmail method', () => {
        expect(service.sendAdminEmail).toBeDefined();
    });

    it('should use the correct base API URL', () => {
        expect((service as any).apiUrl).toBe('https://localhost:7140/api/Admin');
    });

    it('should return an observable from getAllUsers', () => {
        const result = service.getAllUsers();
        expect(result).toBeTruthy();
    });

    it('should return an observable from getAdminStats', () => {
        const result = service.getAdminStats();
        expect(result).toBeTruthy();
    });
});
