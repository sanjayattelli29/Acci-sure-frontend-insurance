import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClaimService } from '../../services/claim.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-claim-details',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './claim-details.page.html',
    styleUrls: ['./details.page.css']
})
export class ClaimDetailsPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private claimService = inject(ClaimService);
    private authService = inject(AuthService);

    claim = signal<any>(null);
    isLoading = signal(true);

    ngOnInit() {
        this.loadClaimDetails();
    }

    loadClaimDetails() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/customer/dashboard']);
            return;
        }

        this.claimService.getMyClaims().subscribe({
            next: (claims) => {
                const c = claims.find((item: any) => item.id === id);
                if (!c) {
                    this.router.navigate(['/customer/dashboard']);
                    return;
                }
                this.claim.set(c);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    goBack() {
        this.router.navigate(['/customer/dashboard']);
    }
}
