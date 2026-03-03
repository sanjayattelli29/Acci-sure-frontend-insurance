import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PolicyService } from '../../services/policy.service';
import { ClaimService } from '../../services/claim.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { GooglePlacesInputComponent } from '../../components/incident-location/incident-location.component';

@Component({
    selector: 'app-policy-details',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, GooglePlacesInputComponent],
    templateUrl: './policy-details.page.html',
    styleUrls: ['./details.page.css']
})
export class PolicyDetailsPage implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private policyService = inject(PolicyService);
    private claimService = inject(ClaimService);
    private authService = inject(AuthService);

    policy = signal<any>(null);
    claims = signal<any[]>([]);
    payments = signal<any[]>([]);
    isLoading = signal(true);

    // Claim Form
    showClaimModal = signal(false);
    isSubmittingClaim = signal(false);
    claimForm = {
        incidentDate: '',
        incidentType: 'Accidental Injury',
        incidentLocation: '',
        description: '',
        hospitalName: '',
        hospitalizationRequired: false,
        requestedAmount: 0,
        affectedMemberName: '',
        affectedMemberRelation: ''
    };
    claimFiles: File[] = [];

    ngOnInit() {
        this.loadPolicyDetails();
    }

    loadPolicyDetails() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/customer/dashboard']);
            return;
        }

        this.policyService.getMyPolicies().subscribe({
            next: (policies) => {
                const pol = policies.find((p: any) => p.id === id);
                if (!pol) {
                    this.router.navigate(['/customer/dashboard']);
                    return;
                }

                // Parse JSON data
                try {
                    pol.fullDetails = JSON.parse(pol.applicationDataJson);
                } catch (e) {
                    pol.fullDetails = {};
                }

                this.policy.set(pol);
                this.loadClaims(id);
                this.isLoading.set(false);
            },
            error: () => this.isLoading.set(false)
        });
    }

    loadClaims(policyId: string) {
        this.claimService.getMyClaims().subscribe({
            next: (claims) => {
                this.claims.set(claims.filter((c: any) => c.policyApplicationId === policyId));
            }
        });
    }

    openClaimModal() {
        this.showClaimModal.set(true);
    }

    onFileChange(event: any) {
        if (event.target.files.length > 0) {
            this.claimFiles = Array.from(event.target.files);
        }
    }

    submitClaim() {
        const pol = this.policy();
        if (!pol) return;

        this.isSubmittingClaim.set(true);
        const formData = new FormData();
        formData.append('policyApplicationId', pol.id);
        formData.append('incidentDate', this.claimForm.incidentDate);
        formData.append('incidentType', this.claimForm.incidentType);
        formData.append('incidentLocation', this.claimForm.incidentLocation);
        formData.append('description', this.claimForm.description);
        formData.append('hospitalName', this.claimForm.hospitalName);
        formData.append('hospitalizationRequired', this.claimForm.hospitalizationRequired.toString());
        formData.append('requestedAmount', this.claimForm.requestedAmount.toString());

        if (pol.policyCategory === 'FAMILY') {
            formData.append('affectedMemberName', this.claimForm.affectedMemberName);
            formData.append('affectedMemberRelation', this.claimForm.affectedMemberRelation);
        }

        this.claimFiles.forEach(file => {
            formData.append('documents', file, file.name);
        });

        this.claimService.raiseClaim(formData).subscribe({
            next: () => {
                alert('Claim Raised Successfully!');
                this.isSubmittingClaim.set(false);
                this.showClaimModal.set(false);
                this.loadClaims(pol.id);
            },
            error: (err) => {
                this.isSubmittingClaim.set(false);
                alert('Failed to raise claim: ' + (err.error?.message || 'Server error'));
            }
        });
    }

    onLocationSelected(address: string) {
        this.claimForm.incidentLocation = address;
        console.log('Location updated in form:', address);
    }

    onHospitalChanged(name: string) {
        this.claimForm.hospitalName = name;
        console.log('Hospital updated in form:', name);
    }

    goBack() {
        this.router.navigate(['/customer/dashboard']);
    }
}
