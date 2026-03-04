import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomerRegisterPage } from './customer-register.page';

describe('CustomerRegisterPage', () => {
    let component: CustomerRegisterPage;
    let fixture: ComponentFixture<CustomerRegisterPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CustomerRegisterPage, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(CustomerRegisterPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have an invalid form when empty', () => {
        expect(component.registrationForm.valid).toBe(false);
    });

    it('should start at step 1', () => {
        expect(component.currentStep()).toBe(1);
    });

    it('should move to step 2 if step 1 is valid and OTP verified', () => {
        component.registrationForm.get('name')?.setValue('Test User');
        component.registrationForm.get('emailId')?.setValue('test@test.com');
        component.isOtpSent.set(true);
        component.sentOtp.set('123456');
        component.otpInput.set('123456');

        component.nextStep();
        expect(component.currentStep()).toBe(2);
    });

    it('should not move to step 2 if OTP is incorrect', () => {
        component.registrationForm.get('name')?.setValue('Test User');
        component.registrationForm.get('emailId')?.setValue('test@test.com');
        component.isOtpSent.set(true);
        component.sentOtp.set('123456');
        component.otpInput.set('wrong');

        component.nextStep();
        expect(component.currentStep()).toBe(1);
        expect(component.otpErrorMessage()).toContain('Invalid');
    });

    it('should validate captcha correctly', () => {
        component.num1.set(5);
        component.num2.set(5);
        component.registrationForm.get('captchaInput')?.setValue('10');
        expect(component.isCaptchaCorrect()).toBeTrue();
    });

    it('should generate captcha on init', () => {
        const spy = spyOn(component, 'generateCaptcha');
        component.ngOnInit();
        expect(spy).toHaveBeenCalled();
    });

    it('should validate mobile number format (10 digits)', () => {
        const mobile = component.registrationForm.get('mobileNumber');
        mobile?.setValue('123');
        expect(mobile?.valid).toBeFalse();
        mobile?.setValue('1234567890');
        expect(mobile?.valid).toBeTrue();
    });

    it('should validate password complexity', () => {
        const pwd = component.registrationForm.get('password');
        pwd?.setValue('simple');
        expect(pwd?.valid).toBeFalse();
        pwd?.setValue('Complex123!');
        expect(pwd?.valid).toBeTrue();
    });

    it('should show indicator for min length password', () => {
        component.registrationForm.get('password')?.setValue('12345678');
        expect(component.hasMinLength).toBeTrue();
    });

    it('should show indicator for number in password', () => {
        component.registrationForm.get('password')?.setValue('test1');
        expect(component.hasNumber).toBeTrue();
    });

    it('should show indicator for special char in password', () => {
        component.registrationForm.get('password')?.setValue('test!');
        expect(component.hasSpecialChar).toBeTrue();
    });

    it('should allow going back to step 1', () => {
        component.currentStep.set(2);
        component.prevStep();
        expect(component.currentStep()).toBe(1);
    });

    it('should set isLoading on valid submit', () => {
        component.registrationForm.patchValue({
            name: 'Test',
            emailId: 'test@test.com',
            password: 'Complex123!',
            mobileNumber: '1234567890',
            captchaInput: '2'
        });
        component.num1.set(1);
        component.num2.set(1);
        component.isOtpVerified.set(true);

        spyOn((component as any).authService, 'register').and.returnValue({
            subscribe: () => { }
        } as any);

        component.onSubmit();
        expect(component.isLoading()).toBeTrue();
    });

    it('should verify OTP correctly', () => {
        component.sentOtp.set('654321');
        component.otpInput.set('654321');
        component.verifyOtp();
        expect(component.isOtpVerified()).toBeTrue();
    });
});
