import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomerLoginPage } from './customer-login.page';

describe('CustomerLoginPage', () => {
    let component: CustomerLoginPage;
    let fixture: ComponentFixture<CustomerLoginPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CustomerLoginPage, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(CustomerLoginPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have an invalid form when empty', () => {
        expect(component.loginForm.valid).toBe(false);
    });

    it('should validate captcha correctly', () => {
        component.num1.set(5);
        component.num2.set(5);
        component.loginForm.get('captchaInput')?.setValue('10');
        expect(component.isCaptchaCorrect()).toBe(true);
    });

    it('should generate new captcha on init', () => {
        const spy = spyOn(component, 'generateCaptcha');
        component.ngOnInit();
        expect(spy).toHaveBeenCalled();
    });

    it('should mark email as invalid if incorrect format', () => {
        const email = component.loginForm.get('emailId');
        email?.setValue('invalid-email');
        expect(email?.valid).toBeFalse();
        expect(email?.hasError('email')).toBeTrue();
    });

    it('should mark email as valid if correct format', () => {
        const email = component.loginForm.get('emailId');
        email?.setValue('test@example.com');
        expect(email?.valid).toBeTrue();
    });

    it('should mark password as required', () => {
        const password = component.loginForm.get('password');
        password?.setValue('');
        expect(password?.valid).toBeFalse();
        expect(password?.hasError('required')).toBeTrue();
    });

    it('should mark captcha as required', () => {
        const captcha = component.loginForm.get('captchaInput');
        captcha?.setValue('');
        expect(captcha?.valid).toBeFalse();
        expect(captcha?.hasError('required')).toBeTrue();
    });

    it('should set isLoading to true during onSubmit with valid form', () => {
        component.loginForm.get('emailId')?.setValue('test@test.com');
        component.loginForm.get('password')?.setValue('password');
        component.num1.set(1);
        component.num2.set(1);
        component.loginForm.get('captchaInput')?.setValue('2');

        // Mock the login call to avoid real HTTP
        spyOn((component as any).authService, 'login').and.returnValue({
            subscribe: () => { }
        } as any);

        component.onSubmit();
        expect(component.isLoading()).toBeTrue();
    });

    it('should not call login if form is invalid', () => {
        const spy = spyOn((component as any).authService, 'login');
        component.onSubmit();
        expect(spy).not.toHaveBeenCalled();
    });

    it('should show error message if captcha is incorrect', () => {
        component.loginForm.get('emailId')?.setValue('test@test.com');
        component.loginForm.get('password')?.setValue('password');
        component.loginForm.get('captchaInput')?.setValue('999'); // Wrong

        component.onSubmit();
        expect(component.errorMessage()).toBe('Incorrect captcha answer.');
    });

    it('should have default error message as empty', () => {
        expect(component.errorMessage()).toBe('');
    });

    it('should have isLoading as false by default', () => {
        expect(component.isLoading()).toBeFalse();
    });

    it('should increment captcha values within 1-10 range', () => {
        component.generateCaptcha();
        expect(component.num1()).toBeGreaterThanOrEqual(1);
        expect(component.num1()).toBeLessThanOrEqual(10);
        expect(component.num2()).toBeGreaterThanOrEqual(1);
        expect(component.num2()).toBeLessThanOrEqual(10);
    });
});
