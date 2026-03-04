import { Component, signal, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

// customer login page component
// handles login form with captcha validation before backend auth
@Component({
    selector: 'app-customer-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './customer-login.page.html'
})
export class CustomerLoginPage implements OnInit {
    // inject angular services
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    // ui state signals for reactive updates
    isLoading = signal(false);
    errorMessage = signal('');
    // captcha numbers for math challenge
    num1 = signal(0);
    num2 = signal(0);

    // reactive form for login with validation rules
    loginForm = this.fb.group({
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]],
        captchaInput: ['', [Validators.required]]
    });

    // generate captcha challenge on page load
    ngOnInit() {
        this.generateCaptcha();
    }

    // create random math problem for captcha
    generateCaptcha() {
        this.num1.set(Math.floor(Math.random() * 10) + 1);
        this.num2.set(Math.floor(Math.random() * 10) + 1);
        this.loginForm.get('captchaInput')?.reset();
    }

    // check if user entered correct captcha answer
    isCaptchaCorrect(): boolean {
        const answer = parseInt(this.loginForm.get('captchaInput')?.value || '0');
        return answer === (this.num1() + this.num2());
    }

    // submit login form to backend via auth service
    onSubmit() {
        // check form validity first
        if (this.loginForm.valid) {
            // verify captcha before calling backend
            if (!this.isCaptchaCorrect()) {
                this.errorMessage.set('Incorrect captcha answer.');
                return;
            }
            // show loading spinner
            this.isLoading.set(true);
            // call auth service which hits backend auth controller
            this.authService.login(this.loginForm.value).subscribe({
                next: (res) => {
                    // get role from backend response
                    const role = res.role || res.Role || res.auth_role;
                    // verify user is customer before allowing access
                    if (role === 'Customer') {
                        this.router.navigate(['/customer/dashboard']);
                    } else {
                        // logout if role mismatch for security
                        this.authService.logout();
                        this.errorMessage.set('Invalid user for this login portal.');
                        this.isLoading.set(false);
                    }
                },
                error: (err) => {
                    // show backend error message
                    this.errorMessage.set(err.error?.message || 'Invalid email or password.');
                    this.isLoading.set(false);
                }
            });
        }
    }
}
