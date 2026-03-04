import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule, RouterTestingModule],
            providers: [AuthService]
        });
        service = TestBed.inject(AuthService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return null for user when not logged in', () => {
        spyOn(service, 'isLoggedIn').and.returnValue(false);
        expect(service.getCurrentUser()).toBeNull();
    });

    it('should have logout method', () => {
        expect(service.logout).toBeDefined();
    });

    it('should clear storage on logout', () => {
        localStorage.setItem('auth_token', 'mock-token');
        service.logout();
        expect(localStorage.getItem('auth_token')).toBeNull();
    });

    it('should return token from localStorage', () => {
        localStorage.setItem('auth_token', 'test-token');
        expect(service.getToken()).toBe('test-token');
    });

    it('should handle missing token gracefully', () => {
        localStorage.removeItem('auth_token');
        expect(service.getToken()).toBeNull();
    });

    it('should return true for isLoggedIn when token exists', () => {
        localStorage.setItem('auth_token', 'exists');
        expect(service.isLoggedIn()).toBeTrue();
    });

    it('should return false for isLoggedIn when token is missing', () => {
        localStorage.removeItem('auth_token');
        expect(service.isLoggedIn()).toBeFalse();
    });

    it('should set current role in localStorage', () => {
        service.setCurrentRole('Admin');
        expect(localStorage.getItem('auth_role')).toBe('Admin');
    });

    it('should get current role from localStorage', () => {
        localStorage.setItem('auth_role', 'Agent');
        expect(service.getUserRole()).toBe('Agent');
    });

    it('should construct user object from localStorage', () => {
        localStorage.setItem('user_id', '123');
        localStorage.setItem('user_name', 'Sanjay');
        localStorage.setItem('user_email', 'sanjay@test.com');
        localStorage.setItem('auth_role', 'Customer');

        const user = service.getUser();
        expect(user.id).toBe('123');
        expect(user.name).toBe('Sanjay');
        expect(user.email).toBe('sanjay@test.com');
        expect(user.role).toBe('Customer');
    });

    it('should have a base API URL defined', () => {
        expect((service as any).apiUrl).toContain('localhost');
    });

    it('should have register method defined', () => {
        expect(service.register).toBeDefined();
    });

    it('should have login method defined', () => {
        expect(service.login).toBeDefined();
    });
});
