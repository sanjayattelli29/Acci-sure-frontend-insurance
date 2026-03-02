import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-customer-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink],
    templateUrl: './customer-register.page.html'
})
export class CustomerRegisterPage implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);
    private http = inject(HttpClient);

    currentStep = signal(1);
    isLoading = signal(false);
    errorMessage = signal('');
    num1 = signal(0);
    num2 = signal(0);

    // OTP Verification State
    isOtpSent = signal(false);
    isOtpVerified = signal(false);
    isOtpLoading = signal(false);
    otpErrorMessage = signal('');
    sentOtp = signal(''); // Store the OTP from webhook response
    otpInput = signal('');

    registrationForm = this.fb.group({
        name: ['', [Validators.required]],
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(/^(?=.*[0-9])(?=.*[!@#$%^&*(),.?":{}|<>]).*$/)
        ]],
        mobileNumber: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
        captchaInput: ['', [Validators.required]]
    });

    get hasMinLength(): boolean {
        return (this.password?.value?.length || 0) >= 8;
    }

    get hasNumber(): boolean {
        return /[0-9]/.test(this.password?.value || '');
    }

    get hasSpecialChar(): boolean {
        return /[!@#$%^&*(),.?":{}|<>]/.test(this.password?.value || '');
    }

    ngOnInit() {
        this.generateCaptcha();
    }

    generateCaptcha() {
        this.num1.set(Math.floor(Math.random() * 10) + 1);
        this.num2.set(Math.floor(Math.random() * 10) + 1);
        this.registrationForm.get('captchaInput')?.reset();
    }

    isCaptchaCorrect(): boolean {
        const answer = parseInt(this.registrationForm.get('captchaInput')?.value || '0');
        return answer === (this.num1() + this.num2());
    }

    get email() { return this.registrationForm.get('emailId'); }
    get name() { return this.registrationForm.get('name'); }
    get password() { return this.registrationForm.get('password'); }
    get mobile() { return this.registrationForm.get('mobileNumber'); }

    nextStep() {
        if (this.currentStep() === 1) {
            if (this.name?.valid && this.email?.valid) {
                if (!this.isOtpSent()) {
                    this.otpErrorMessage.set('Please send and enter the OTP first.');
                    return;
                }

                // Verify OTP before moving to Step 2
                // AFTER
if (this.otpInput().trim() === this.sentOtp().trim()) {
                    this.isOtpVerified.set(true);
                    this.otpErrorMessage.set('');
                    this.currentStep.set(2);
                } else {
                    this.otpErrorMessage.set('Invalid OTP. Please check and try again.');
                }
            } else {
                this.registrationForm.markAllAsTouched();
            }
        }
    }

    sendOtp() {
        if (this.email?.invalid) {
            this.otpErrorMessage.set('Please enter a valid email address first.');
            return;
        }

        this.isOtpLoading.set(true);
        this.otpErrorMessage.set('');

        const payload = {
            name: this.name?.value,
            email: this.email?.value
        };

        // Trigger n8n webhook (using test path as per user edit)
        this.http.post('https://nextglidesol.app.n8n.cloud/webhook/send-otp', payload).subscribe({
            next: (res: any) => {
                this.isOtpSent.set(true);
                this.sentOtp.set(res.otp); // Capture OTP from response
                this.isOtpLoading.set(false);
                // We stay in Step 1 now
            },
            error: (err) => {
                this.otpErrorMessage.set('Failed to send OTP. Please try again.');
                this.isOtpLoading.set(false);
            }
        });
    }

    verifyOtp() {
        // This is now integrated into nextStep() or can be used for real-time feedback
        if (this.otpInput() === this.sentOtp()) {
            this.isOtpVerified.set(true);
            this.otpErrorMessage.set('');
        } else {
            this.otpErrorMessage.set('Invalid OTP.');
        }
    }

    prevStep() {
        this.currentStep.set(1);
    }

    onSubmit() {
        if (this.registrationForm.valid && this.isOtpVerified()) {
            if (!this.isCaptchaCorrect()) {
                this.errorMessage.set('Incorrect captcha answer.');
                return;
            }
            this.isLoading.set(true);
            this.authService.register(this.registrationForm.value).subscribe({
                next: () => {
                    this.router.navigate(['/customer/login']); // Go to login after registration
                },
                error: (err) => {
                    this.errorMessage.set(err.error?.message || 'Registration failed. Please try again.');
                    this.isLoading.set(false);
                    this.generateCaptcha();
                }
            });
        } else {
            this.registrationForm.markAllAsTouched();
        }
    }
}
