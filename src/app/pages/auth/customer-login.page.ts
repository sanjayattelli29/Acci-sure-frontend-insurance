import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-customer-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './customer-login.page.html'
})
export class CustomerLoginPage implements OnInit {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    isLoading = signal(false);
    errorMessage = signal('');
    num1 = signal(0);
    num2 = signal(0);

    loginForm = this.fb.group({
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        captchaInput: ['', [Validators.required]]
    });

    ngOnInit() {
        this.generateCaptcha();
    }

    generateCaptcha() {
        this.num1.set(Math.floor(Math.random() * 10) + 1);
        this.num2.set(Math.floor(Math.random() * 10) + 1);
        this.loginForm.get('captchaInput')?.reset();
    }

    isCaptchaCorrect(): boolean {
        const answer = parseInt(this.loginForm.get('captchaInput')?.value || '0');
        return answer === (this.num1() + this.num2());
    }

    onSubmit() {
        if (this.loginForm.valid) {
            if (!this.isCaptchaCorrect()) {
                this.errorMessage.set('Incorrect captcha answer.');
                return;
            }
            this.isLoading.set(true);
            this.authService.login(this.loginForm.value).subscribe({
                next: (res) => {
                    const role = res.role || res.Role || res.auth_role;
                    if (role === 'Customer') {
                        this.router.navigate(['/customer/dashboard']);
                    } else {
                        this.authService.logout();
                        this.errorMessage.set('Invalid user for this login portal.');
                        this.isLoading.set(false);
                    }
                },
                error: (err) => {
                    this.errorMessage.set(err.error?.message || 'Invalid email or password.');
                    this.isLoading.set(false);
                }
            });
        }
    }
}
