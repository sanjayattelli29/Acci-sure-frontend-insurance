import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminLoginPage } from './admin-login.page';

describe('AdminLoginPage', () => {
    let component: AdminLoginPage;
    let fixture: ComponentFixture<AdminLoginPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AdminLoginPage, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(AdminLoginPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have an invalid form when empty', () => {
        expect(component.loginForm.valid).toBe(false);
    });

    it('should mark email as required', () => {
        const email = component.loginForm.get('emailId');
        email?.setValue('');
        expect(email?.valid).toBeFalse();
        expect(email?.hasError('required')).toBeTrue();
    });

    it('should mark password as required', () => {
        const password = component.loginForm.get('password');
        password?.setValue('');
        expect(password?.valid).toBeFalse();
        expect(password?.hasError('required')).toBeTrue();
    });

    it('should validate email format', () => {
        const email = component.loginForm.get('emailId');
        email?.setValue('not-an-email');
        expect(email?.hasError('email')).toBeTrue();
        email?.setValue('admin@test.com');
        expect(email?.hasError('email')).toBeFalse();
    });

    it('should have isLoading as false initially', () => {
        expect(component.isLoading()).toBeFalse();
    });

    it('should set isLoading to true when onSubmit is called with valid form', () => {
        component.loginForm.patchValue({
            emailId: 'admin@test.com',
            password: 'password'
        });

        // Mock the auth service to prevent real HTTP
        spyOn((component as any).authService, 'login').and.returnValue({
            subscribe: () => { }
        } as any);

        component.onSubmit();
        expect(component.isLoading()).toBeTrue();
    });

    it('should not call authService if form is invalid', () => {
        const spy = spyOn((component as any).authService, 'login');
        component.onSubmit();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should have default error message as empty', () => {
        expect(component.errorMessage()).toBe('');
    });
});
