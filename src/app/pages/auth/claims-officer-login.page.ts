import { Component, signal, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

// claims officer login page
// authenticates officers who review and approve claims
@Component({
    selector: 'app-claims-officer-login',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './claims-officer-login.page.html'
})
export class ClaimsOfficerLoginPage {
    // inject services
    private fb = inject(FormBuilder);
    private authService = inject(AuthService);
    private router = inject(Router);

    // ui state
    isLoading = signal(false);
    errorMessage = signal('');

    // simple login form
    loginForm = this.fb.group({
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required]]
    });

    // login via backend auth api
    onSubmit() {
        if (this.loginForm.valid) {
            this.isLoading.set(true);
            // backend checks credentials in db via identity
            this.authService.login(this.loginForm.value).subscribe({
                next: (res) => {
                    // verify role is claim officer
                    const role = res.role || res.Role || res.auth_role;
                    if (role === 'ClaimOfficer') {
                        this.router.navigate(['/claims-officer/dashboard']);
                    } else {
                        // logout if not claim officer
                        this.authService.logout();
                        this.errorMessage.set('Invalid claims officer user.');
                        this.isLoading.set(false);
                    }
                },
                error: (err) => {
                    this.errorMessage.set(err.error?.message || 'Invalid claims officer credentials.');
                    this.isLoading.set(false);
                }
            });
        }
    }
}
