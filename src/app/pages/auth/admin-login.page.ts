import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-admin-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './admin-login.page.html'
})
export class AdminLoginPage {
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    isLoading = signal(false);
    errorMessage = signal('');

    loginForm = this.fb.group({
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
    });

    onSubmit() {
        if (this.loginForm.valid) {
            this.isLoading.set(true);
            this.authService.login(this.loginForm.value).subscribe({
                next: (res) => {
                    const role = res.role || res.Role || res.auth_role;
                    if (role === 'Admin') {
                        this.router.navigate(['/admin/dashboard']);
                    } else {
                        this.authService.logout();
                        this.errorMessage.set('Invalid admin user.');
                        this.isLoading.set(false);
                    }
                },
                error: (err) => {
                    this.errorMessage.set(err.error?.message || 'Invalid admin credentials.');
                    this.isLoading.set(false);
                }
            });
        }
    }
}
