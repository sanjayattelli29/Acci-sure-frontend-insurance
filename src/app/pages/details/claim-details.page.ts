import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ClaimService } from '../../services/claim.service';
import { AuthService } from '../../services/auth.service';

// claim details page shows full claim info
// customers can view claim status documents timeline
@Component({
    selector: 'app-claim-details',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './claim-details.page.html',
    styleUrls: ['./details.page.css']
})
export class ClaimDetailsPage implements OnInit {
    // inject services for claims
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private claimService = inject(ClaimService);
    private authService = inject(AuthService);

    // claim data from backend
    claim = signal<any>(null);
    isLoading = signal(true);

    // load claim on init
    ngOnInit() {
        this.loadClaimDetails();
    }

    // fetch claim details from backend db
    loadClaimDetails() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/customer/dashboard']);
            return;
        }

        // get all claims then find this one
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

    // navigate back to dashboard
    goBack() {
        this.router.navigate(['/customer/dashboard']);
    }
}
