import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

// customer registration page with otp verification
// multi-step form with email validation via external webhook
@Component({
    selector: 'app-customer-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
    templateUrl: './customer-register.page.html'
})
export class CustomerRegisterPage implements OnInit {
    // inject angular services
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private http = inject(HttpClient); // for otp webhook call

    // ui state for multi-step form
    currentStep = signal(1);
    isLoading = signal(false);
    errorMessage = signal('');
    // captcha math challenge numbers
    num1 = signal(0);
    num2 = signal(0);

    // otp verification state for email validation
    isOtpSent = signal(false);
    isOtpVerified = signal(false);
    isOtpLoading = signal(false);
    otpErrorMessage = signal('');
    sentOtp = signal(''); // otp from webhook response to verify against
    otpInput = signal(''); // user entered otp

    // registration form with validation rules
    registrationForm = this.fb.group({
        name: ['', [Validators.required]],
        emailId: ['', [Validators.required, Validators.email]],
        // password must have 8+ chars, number, special char
        password: ['', [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/)
        ]],
        mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
        captchaInput: ['', [Validators.required]]
    });

    // password validation helpers for ui indicators
    get hasMinLength(): boolean {
        return (this.password?.value?.length || 0) >= 8;
    }

    get hasNumber(): boolean {
        return /[0-9]/.test(this.password?.value || '');
    }

    get hasSpecialChar(): boolean {
        return /[!@#$%^&*(),.?":{}|<>]/.test(this.password?.value || '');
    }

    // init captcha on page load
    ngOnInit() {
        this.generateCaptcha();
    }

    // generate random math problem for bot prevention
    generateCaptcha() {
        this.num1.set(Math.floor(Math.random() * 10) + 1);
        this.num2.set(Math.floor(Math.random() * 10) + 1);
        this.registrationForm.get('captchaInput')?.reset();
    }

    // verify user entered correct captcha sum
    isCaptchaCorrect(): boolean {
        const answer = parseInt(this.registrationForm.get('captchaInput')?.value || '0');
        return answer === (this.num1() + this.num2());
    }

    // form field getters for easy access in template
    get email() { return this.registrationForm.get('emailId'); }
    get name() { return this.registrationForm.get('name'); }
    get password() { return this.registrationForm.get('password'); }
    get mobile() { return this.registrationForm.get('mobileNumber'); }

    // move to next step after validating current step
    nextStep() {
        // step 1 needs name email and otp verification
        if (this.currentStep() === 1) {
            if (this.name?.valid && this.email?.valid) {
                // make sure otp was sent before proceeding
                if (!this.isOtpSent()) {
                    this.otpErrorMessage.set('Please send and enter the OTP first.');
                    return;
                }

                // verify otp matches what webhook sent
                if (this.otpInput().trim() === this.sentOtp().trim()) {
                    this.isOtpVerified.set(true);
                    this.otpErrorMessage.set('');
                    this.currentStep.set(2); // move to step 2
                } else {
                    this.otpErrorMessage.set('Invalid OTP. Please check and try again.');
                }
            } else {
                // mark fields as touched to show validation errors
                this.registrationForm.markAllAsTouched();
            }
        }
    }

    // send otp to user email via n8n webhook
    sendOtp() {
        if (this.email?.invalid) {
            this.otpErrorMessage.set('Please enter a valid email address first.');
            return;
        }

        this.isOtpLoading.set(true);
        this.otpErrorMessage.set('');

        // prepare payload for webhook
        const payload = {
            name: this.name?.value,
            email: this.email?.value
        };

        // call external n8n webhook to send email with otp
        this.http.post('https://nextglidesol.app.n8n.cloud/webhook/send-otp', payload).subscribe({
            next: (res: any) => {
                // webhook returns otp in response for verification
                this.isOtpSent.set(true);
                this.sentOtp.set(res.otp);
                this.isOtpLoading.set(false);
            },
            error: (err) => {
                this.otpErrorMessage.set('Failed to send OTP. Please try again.');
                this.isOtpLoading.set(false);
            }
        });
    }

    // verify otp matches sent otp real-time
    verifyOtp() {
        if (this.otpInput() === this.sentOtp()) {
            this.isOtpVerified.set(true);
            this.otpErrorMessage.set('');
        } else {
            this.otpErrorMessage.set('Invalid OTP.');
        }
    }

    // go back to previous step
    prevStep() {
        this.currentStep.set(1);
    }

    // submit registration to backend after all validations pass
    onSubmit() {
        // check form valid and otp verified
        if (this.registrationForm.valid && this.isOtpVerified()) {
            // final captcha check before submitting
            if (!this.isCaptchaCorrect()) {
                this.errorMessage.set('Incorrect captcha answer.');
                return;
            }
            this.isLoading.set(true);
            // call auth service which posts to backend register endpoint
            // backend creates user in db via identity system
            this.authService.register(this.registrationForm.value).subscribe({
                next: () => {
                    // redirect to login after successful registration
                    this.router.navigate(['/customer/login']);
                },
                error: (err) => {
                    // show backend error message
                    this.errorMessage.set(err.error?.message || 'Registration failed. Please try again.');
                    this.isLoading.set(false);
                    // generate new captcha on error
                    this.generateCaptcha();
                }
            });
        } else {
            // show validation errors
            this.registrationForm.markAllAsTouched();
        }
    }
}
