import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

// admin login page for admin users only
// simpler than customer login no captcha needed
@Component({
    selector: 'app-admin-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './admin-login.page.html'
})
export class AdminLoginPage {
    // inject services
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    // ui state signals
    isLoading = signal(false);
    errorMessage = signal('');

    // simple login form with email password
    loginForm = this.fb.group({
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
    });

    // submit login to backend via auth service
    onSubmit() {
        if (this.loginForm.valid) {
            this.isLoading.set(true);
            // call backend auth controller to verify credentials
            this.authService.login(this.loginForm.value).subscribe({
                next: (res) => {
                    // check role from backend response
                    const role = res.role || res.Role || res.auth_role;
                    // only allow admin role to access admin dashboard
                    if (role === 'Admin') {
                        this.router.navigate(['/admin/dashboard']);
                    } else {
                        // logout if wrong role for security
                        this.authService.logout();
                        this.errorMessage.set('Invalid admin user.');
                        this.isLoading.set(false);
                    }
                },
                error: (err) => {
                    // show error from backend
                    this.errorMessage.set(err.error?.message || 'Invalid admin credentials.');
                    this.isLoading.set(false);
                }
            });
        }
    }
}
