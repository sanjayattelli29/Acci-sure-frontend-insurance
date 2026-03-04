import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PolicyService } from '../../services/policy.service';
import { ClaimService } from '../../services/claim.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { GooglePlacesInputComponent } from '../../components/incident-location/incident-location.component';
import { LocationMapComponent } from '../../components/location-map/location-map.component';

// policy details page for customers
// shows policy info claims and payment history
@Component({
    selector: 'app-policy-details',
    standalone: true,
    imports: [CommonModule, RouterModule, FormsModule, GooglePlacesInputComponent, LocationMapComponent],
    templateUrl: './policy-details.page.html',
    styleUrls: ['./details.page.css']
})
export class PolicyDetailsPage implements OnInit {
    // inject services for policy and claim operations
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private policyService = inject(PolicyService);
    private claimService = inject(ClaimService);
    private authService = inject(AuthService);

    // policy data from backend
    policy = signal<any>(null);
    // claims for this policy
    claims = signal<any[]>([]);
    // payment records
    payments = signal<any[]>([]);
    isLoading = signal(true);

    // claim form modal state
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
    selectedLocationCoords = signal<{ lat: number, lng: number } | null>(null);

    // load policy on init
    ngOnInit() {
        this.loadPolicyDetails();
    }

    // fetch policy details from backend db
    loadPolicyDetails() {
        const id = this.route.snapshot.paramMap.get('id');
        if (!id) {
            this.router.navigate(['/customer/dashboard']);
            return;
        }

        // get all policies then filter for this one
        this.policyService.getMyPolicies().subscribe({
            next: (policies) => {
                const pol = policies.find((p: any) => p.id === id);
                if (!pol) {
                    this.router.navigate(['/customer/dashboard']);
                    return;
                }

                // parse application json from db
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

    // load claims for this policy from backend
    loadClaims(policyId: string) {
        this.claimService.getMyClaims().subscribe({
            next: (claims) => {
                // filter claims by policy id
                this.claims.set(claims.filter((c: any) => c.policyApplicationId === policyId));
            }
        });
    }

    // show modal to raise new claim
    openClaimModal() {
        this.selectedLocationCoords.set(null);
        this.showClaimModal.set(true);
    }

    // handle file uploads for claim documents
    onFileChange(event: any) {
        if (event.target.files.length > 0) {
            this.claimFiles = Array.from(event.target.files);
        }
    }

    // submit claim with files to backend
    submitClaim() {
        const pol = this.policy();
        if (!pol) return;

        this.isSubmittingClaim.set(true);
        // build formdata for multipart upload
        const formData = new FormData();
        formData.append('policyApplicationId', pol.id);
        formData.append('incidentDate', this.claimForm.incidentDate);
        formData.append('incidentType', this.claimForm.incidentType);
        formData.append('incidentLocation', this.claimForm.incidentLocation);
        formData.append('description', this.claimForm.description);
        formData.append('hospitalName', this.claimForm.hospitalName);
        formData.append('hospitalizationRequired', this.claimForm.hospitalizationRequired.toString());
        formData.append('requestedAmount', this.claimForm.requestedAmount.toString());

        // family policies need affected member info
        if (pol.policyCategory === 'FAMILY') {
            formData.append('affectedMemberName', this.claimForm.affectedMemberName);
            formData.append('affectedMemberRelation', this.claimForm.affectedMemberRelation);
        }

        // attach claim document files
        this.claimFiles.forEach(file => {
            formData.append('documents', file, file.name);
        });

        // send to backend claim controller to save in db
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

    // handle google places location selection
    onLocationSelected(data: any) {
        if (typeof data === 'string') {
            this.claimForm.incidentLocation = data;
        } else {
            this.claimForm.incidentLocation = data.address;
            this.selectedLocationCoords.set({ lat: data.lat, lng: data.lng });
        }
        console.log('Location updated in form:', data);
    }

    // handle hospital name input
    onHospitalChanged(name: string) {
        this.claimForm.hospitalName = name;
        console.log('Hospital updated in form:', name);
    }

    // navigate back to dashboard
    goBack() {
        this.router.navigate(['/customer/dashboard']);
    }
}
