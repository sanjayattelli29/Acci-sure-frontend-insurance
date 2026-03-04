import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

// agent login page for insurance agents
// handles login and role verification before dashboard access
@Component({
    selector: 'app-agent-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './agent-login.page.html'
})
export class AgentLoginPage {
    // inject services
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    // ui state
    isLoading = signal(false);
    errorMessage = signal('');

    // login form
    loginForm = this.fb.group({
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
    });

    // submit to backend auth controller
    onSubmit() {
        if (this.loginForm.valid) {
            this.isLoading.set(true);
            // backend verifies credentials against db
            this.authService.login(this.loginForm.value).subscribe({
                next: (res) => {
                    // check role matches agent
                    const role = res.role || res.Role || res.auth_role;
                    if (role === 'Agent') {
                        this.router.navigate(['/agent/dashboard']);
                    } else {
                        // clear token if role mismatch
                        this.authService.logout();
                        this.errorMessage.set('Invalid agent user.');
                        this.isLoading.set(false);
                    }
                },
                error: (err) => {
                    this.errorMessage.set(err.error?.message || 'Invalid agent credentials.');
                    this.isLoading.set(false);
                }
            });
        }
    }
}
