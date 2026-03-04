import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PolicyService } from '../../services/policy.service';
import { ClaimService } from '../../services/claim.service';
import { ChatService } from '../../services/chat.service';

import { RouterModule } from '@angular/router';
import { NotificationPanelComponent } from '../../components/notification-panel/notification-panel.component';
import { GooglePlacesInputComponent } from '../../components/incident-location/incident-location.component';
import { LocationMapComponent } from '../../components/location-map/location-map.component';

// customer dashboard main page component
// handles policy buying, claim raising, viewing policies and claims
// multi view single page component with lots of functionality
@Component({
    selector: 'app-customer-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NotificationPanelComponent, GooglePlacesInputComponent, LocationMapComponent],
    templateUrl: './customer-dashboard.page.html',
    styleUrls: ['./customer-dashboard.page.css']
})
export class CustomerDashboardPage implements OnInit {
    // inject all required services
    private authService = inject(AuthService);
    private policyService = inject(PolicyService);
    private claimService = inject(ClaimService);
    private chatService = inject(ChatService);
    private router = inject(Router);

    // get current logged in user from localstorage
    user = this.authService.getUser();
    // active view state for switching between sections
    activeView = signal<'dashboard' | 'my-policies' | 'buy-policy' | 'raise-claim' | 'my-claims' | 'policy-details' | 'claim-details' | 'chat'>('dashboard');
    // sidebar toggle for mobile
    sidebarOpen = signal<boolean>(false);

    // sub-view state for detail pages
    selectedPolicyId = signal<string | null>(null);
    selectedClaimId = signal<string | null>(null);
    detailedPolicy = signal<any | null>(null);
    detailedClaim = signal<any | null>(null);
    detailedClaimsForPolicy = signal<any[]>([]);
    isSubmittingClaim = signal<boolean>(false);
    isPaying = signal<boolean>(false);

    // data arrays from backend
    config: any = null; // policy configuration
    myPolicies: any[] = []; // user's policies
    myClaims: any[] = []; // user's claims
    myChats = signal<any[]>([]); // chat rooms

    // calculated totals for dashboard cards
    totalCoverage = signal<number>(0);
    totalClaimsPaid = signal<number>(0);
    remainingBalance = signal<number>(0);
    requestedClaimAmount = signal<number>(0);
    approvedClaimAmount = signal<number>(0);

    // policy selection state for buy flow
    selectedCategory: any = null;
    selectedTier: any = null;

    // policy application form data
    applicationForm: any = {
        applicant: {
            fullName: '',
            age: 18,
            profession: 'SoftwareEmployee',
            alcoholHabit: 'nonDrinker',
            smokingHabit: 'nonSmoker',
            travelKmPerMonth: 0
        },
        paymentMode: 'yearly',
        nominee: {
            nomineeName: '',
            nomineeEmail: '',
            nomineePhone: '',
            nomineeBankAccountNumber: ''
        },
        familyMembers: [] // for family policies
    };

    // calculated premium from backend
    calculatedPremium = signal<number>(0);
    isSubmitting = signal<boolean>(false);

    // ai chat helper state for policy assistance
    isChatOpen = signal<boolean>(false);
    chatMessages = signal<any[]>([]);
    currentChatPolicy = signal<any | null>(null);
    isChatLoading = signal<boolean>(false);
    chatUserMessage = signal<string>('');

    // policy detail modal legacy state
    showPolicyDetailModal = signal(false);
    selectedPolicy = signal<any | null>(null);

    // This function loads all required data when the component initializes including configuration, policies, claims and chat list from the backend services.
    ngOnInit() {
        this.loadConfig();
        this.loadMyPolicies();
        this.loadMyClaims();
        this.loadChatList();
    }

    // This function fetches the policy configuration data from the backend database which contains all available policy categories, tiers and benefits information.
    loadConfig() {
        this.policyService.getConfiguration().subscribe({
            next: (config) => {
                this.config = config;
                console.log('Policy Configuration loaded:', config);
            }
        });
    }

    // This function loads all policies associated with the current logged in user from the backend and recalculates the dashboard totals.
    loadMyPolicies() {
        this.policyService.getMyPolicies().subscribe({
            next: (policies) => {
                this.myPolicies = policies;
                this.calculateTotals(); // recalc dashboard totals
                console.log('User policies loaded:', policies);
            }
        });
    }

    // This function loads all insurance claims submitted by the current user from the backend using the claim service and updates the dashboard statistics.
    loadMyClaims() {
        this.claimService.getMyClaims().subscribe({
            next: (claims) => {
                this.myClaims = claims;
                this.calculateTotals(); // recalc totals
                console.log('User claims loaded:', claims);
            }
        });
    }

    // This function retrieves all active chat conversations between the customer and insurance agents from the backend chat service.
    loadChatList() {
        this.chatService.getChatList().subscribe({
            next: (chats) => this.myChats.set(chats),
            error: (err) => console.error('Failed to load chat list', err)
        });
    }

    // This function calculates the total coverage amount, total claims paid, remaining balance and claim amounts by aggregating data from all policies and claims.
    calculateTotals() {
        let coverage = 0;
        let claims = 0;
        let requested = 0;
        let approved = 0;

        // sum up coverage from active policies
        this.myPolicies.forEach(p => {
            if (p.status === 'Active') {
                coverage += p.totalCoverageAmount || 0;
            }
        });

        // sum up claim amounts by status
        this.myClaims.forEach(c => {
            requested += c.requestedAmount || 0;
            if (c.status === 'Approved' || c.status === 'Paid') {
                claims += c.approvedAmount || 0;
                approved += c.approvedAmount || 0;
            }
        });

        // update signals for reactive ui
        this.totalCoverage.set(coverage);
        this.totalClaimsPaid.set(claims);
        this.remainingBalance.set(coverage - claims);
        this.requestedClaimAmount.set(requested);
        this.approvedClaimAmount.set(approved);
    }

    // This function allows users to navigate between different sections of the dashboard like policies, claims, buy policy and chat by updating the active view.
    switchView(view: 'dashboard' | 'my-policies' | 'buy-policy' | 'raise-claim' | 'my-claims' | 'chat') {
        this.activeView.set(view);
        // reset selections when entering buy policy
        if (view === 'buy-policy') {
            this.selectedCategory = null;
            this.selectedTier = null;
        }
        // reload chats when entering chat view
        if (view === 'chat') {
            this.loadChatList();
        }
    }

    // This function navigates to the chat page for a specific policy and initializes a new chat session with an agent if it doesn't already exist.
    navigateToChat(chat: any) {
        // if new chat init it first via backend
        if (chat.id && chat.id.startsWith('new_')) {
            const initData = {
                policyId: chat.policyId,
                customerId: chat.customerId,
                agentId: chat.agentId
            };
            this.chatService.initChat(initData).subscribe({
                next: (res) => {
                    this.router.navigate(['/chat', chat.policyId]);
                },
                error: (err) => alert('Failed to initialize chat: ' + (err.error?.message || 'Server error'))
            });
        } else {
            // existing chat just navigate
            this.router.navigate(['/chat', chat.policyId]);
        }
    }

    // This function checks whether the user already has an active policy in a specific category to prevent purchasing duplicate policies.
    hasActivePolicy(categoryId: string): boolean {
        return this.myPolicies.some(p => p.policyCategory === categoryId && p.status === 'Active');
    }

    // This function handles the user selection of a policy category such as individual or family and resets the tier selection and family members list.
    selectCategory(category: any) {
        this.selectedCategory = category;
        this.selectedTier = null;
        this.applicationForm.familyMembers = [];
    }

    // This function handles the user selection of a specific tier within the chosen policy category like silver, gold or platinum and triggers premium calculation.
    selectTier(tier: any) {
        this.selectedTier = tier;
        this.updatePremium(); // calc premium when tier selected
    }

    // This function adds a new family member entry to the policy application form allowing up to three family members for family policy types.
    addFamilyMember() {
        if (this.applicationForm.familyMembers.length < 3) {
            this.applicationForm.familyMembers.push({ fullName: '', relation: 'Spouse' });
        }
    }

    // This function removes a family member from the application form at the specified index position.
    removeFamilyMember(index: number) {
        this.applicationForm.familyMembers.splice(index, 1);
    }

    // This function recalculates the insurance premium based on user inputs and risk factors by sending the data to the backend pricing engine.
    updatePremium() {
        if (!this.selectedCategory || !this.selectedTier) return;

        // build request with category tier and personal details
        const request = {
            policyCategory: this.selectedCategory.categoryId,
            tierId: this.selectedTier.tierId,
            applicant: this.selectedCategory.categoryId === 'INDIVIDUAL' ? this.applicationForm.applicant : null,
            primaryApplicant: this.selectedCategory.categoryId === 'FAMILY' ? this.applicationForm.applicant : null,
            familyMembers: this.applicationForm.familyMembers,
            paymentMode: this.applicationForm.paymentMode
        };

        // backend calculates premium using pricing engine
        this.policyService.calculatePremium(request).subscribe({
            next: (res) => this.calculatedPremium.set(res.premium)
        });
    }

    // This function submits the completed policy application to the backend which creates a pending policy record in the database for agent review and approval.
    submitApplication() {
        this.isSubmitting.set(true);
        const request = {
            policyCategory: this.selectedCategory.categoryId,
            tierId: this.selectedTier.tierId,
            applicant: this.selectedCategory.categoryId === 'INDIVIDUAL' ? this.applicationForm.applicant : null,
            primaryApplicant: this.selectedCategory.categoryId === 'FAMILY' ? this.applicationForm.applicant : null,
            familyMembers: this.applicationForm.familyMembers,
            paymentMode: this.applicationForm.paymentMode,
            nominee: this.applicationForm.nominee
        };

        // backend saves application to db and triggers notification
        this.policyService.applyForPolicy(request).subscribe({
            next: () => {
                alert('Policy Application Submitted Successfully! It will be reviewed by an agent soon.');
                this.isSubmitting.set(false);
                this.loadMyPolicies(); // refresh policies list
                this.switchView('my-policies');
            },
            error: (err) => {
                console.error('Application failed:', err);
                this.isSubmitting.set(false);
                const errorMessage = err.error?.message || err.error?.Message || 'Server error';
                alert('Failed to submit application: ' + errorMessage);
            }
        });
    }

    // This function opens the detailed view of a specific policy by loading its complete information including associated claims from the database.
    openPolicyDetails(polId: string) {
        const pol = this.myPolicies.find(p => p.id === polId);
        if (!pol) return;

        // Parse JSON data
        try {
            pol.fullDetails = JSON.parse(pol.applicationDataJson);
        } catch (e) {
            pol.fullDetails = {};
        }

        this.detailedPolicy.set(pol);
        this.detailedClaimsForPolicy.set(this.myClaims.filter(c => c.policyApplicationId === polId));
        this.selectedPolicyId.set(polId);
        this.activeView.set('policy-details');
    }

    // This function processes the premium payment for a policy from the detailed policy view and activates the policy upon successful payment.
    payPremiumFromDetails() {
        const pol = this.detailedPolicy();
        if (!pol) return;

        if (!confirm(`Confirm payment of ₹${pol.calculatedPremium} for ${pol.tierId} policy?`)) return;

        this.isPaying.set(true);
        this.policyService.processPayment(pol.id, pol.calculatedPremium).subscribe({
            next: () => {
                this.isPaying.set(false);
                alert('Payment Successful! Your policy is now ACTIVE.');
                this.loadMyPolicies();
                this.openPolicyDetails(pol.id); // Refresh view
            },
            error: (err) => {
                this.isPaying.set(false);
                alert('Payment failed: ' + (err.error?.message || 'Processing error'));
            }
        });
    }

    // This function opens the detailed view of a specific insurance claim showing all information about the claim including status and associated policy details.
    openClaimDetails(claimId: string) {
        const claim = this.myClaims.find(c => c.id === claimId);
        if (!claim) return;
        this.detailedClaim.set(claim);
        this.selectedClaimId.set(claimId);
        this.activeView.set('claim-details');
    }

    // This function processes the premium payment for a selected policy from the modal view and closes the modal after successful payment.
    payPremium() {
        const pol = this.selectedPolicy();
        if (!pol) return;

        if (!confirm(`Confirm payment of ₹${pol.calculatedPremium} for ${pol.tierId} policy?`)) return;

        this.isPaying.set(true);
        this.policyService.processPayment(pol.id, pol.calculatedPremium).subscribe({
            next: (res) => {
                this.isPaying.set(false);
                this.showPolicyDetailModal.set(false);
                alert('Payment Successful! Your policy is now ACTIVE.');
                this.loadMyPolicies(); // Refresh
            },
            error: (err) => {
                this.isPaying.set(false);
                alert('Payment failed: ' + (err.error?.message || 'Processing error'));
            }
        });
    }

    // claim raising section
    selectedPolicyForClaim = signal<any | null>(null);
    // claim form data
    claimForm: any = {
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
    claimFiles: File[] = []; // uploaded documents
    hasFirReport = signal<boolean>(false);
    hasHospitalBill = signal<boolean>(false);
    selectedLocationCoords = signal<{ lat: number, lng: number } | null>(null);

    // This function initializes the claim submission form for a selected policy by resetting all form fields and navigating to the raise claim view.
    initiateClaim(pol: any) {
        this.selectedPolicyForClaim.set(pol);
        this.claimForm.affectedMemberName = '';
        this.claimForm.affectedMemberRelation = '';
        this.claimFiles = [];
        this.hasFirReport.set(false);
        this.hasHospitalBill.set(false);
        this.selectedLocationCoords.set(null);
        this.switchView('raise-claim');
    }

    // This function handles the file upload event when users select supporting documents like medical reports and bills for their insurance claims.
    onFileChange(event: any, type: 'fir' | 'bill' | 'others' = 'others') {
        if (event.target.files.length > 0) {
            const files = Array.from(event.target.files) as File[];
            this.claimFiles = [...this.claimFiles, ...files];
            
            if (type === 'fir') this.hasFirReport.set(true);
            if (type === 'bill') this.hasHospitalBill.set(true);
        }
    }

    // This function submits a new insurance claim to the backend by sending the claim form data along with uploaded supporting documents as multipart form data.
    submitClaim() {
        if (!this.selectedPolicyForClaim()) return;

        this.isSubmitting.set(true);
        // build formdata for multipart upload with files
        const formData = new FormData();
        formData.append('policyApplicationId', this.selectedPolicyForClaim()!.id);
        formData.append('incidentDate', this.claimForm.incidentDate);
        formData.append('incidentType', this.claimForm.incidentType);
        formData.append('incidentLocation', this.claimForm.incidentLocation);
        formData.append('description', this.claimForm.description);
        formData.append('hospitalName', this.claimForm.hospitalName);
        formData.append('hospitalizationRequired', this.claimForm.hospitalizationRequired.toString());
        formData.append('requestedAmount', this.claimForm.requestedAmount.toString());

        // add family member info if family policy
        if (this.selectedPolicyForClaim()!.policyCategory === 'FAMILY') {
            formData.append('affectedMemberName', this.claimForm.affectedMemberName);
            formData.append('affectedMemberRelation', this.claimForm.affectedMemberRelation);
        }

        // attach uploaded files
        this.claimFiles.forEach(file => {
            formData.append('documents', file, file.name);
        });

        // post to backend which saves claim and files to db
        this.claimService.raiseClaim(formData).subscribe({
            next: () => {
                alert('Claim Raised Successfully! Admin will assign an officer to review it.');
                this.isSubmitting.set(false);
                this.loadMyClaims(); // refresh claims list
                this.switchView('my-claims');
            },
            error: (err) => {
                this.isSubmitting.set(false);
                alert('Failed to raise claim: ' + (err.error?.message || 'Server error'));
            }
        });
    }

    // This function handles the location selection from the Google Places autocomplete and updates the incident location with address and coordinates.
    onLocationSelected(data: any) {
        if (typeof data === 'string') {
            this.claimForm.incidentLocation = data;
        } else {
            this.claimForm.incidentLocation = data.address;
            this.selectedLocationCoords.set({ lat: data.lat, lng: data.lng });
        }
        console.log('Location updated in dashboard form:', data);
    }

    // This function updates the hospital name in the claim form when the user selects a hospital from the autocomplete dropdown.
    onHospitalChanged(name: string) {
        this.claimForm.hospitalName = name;
        console.log('Hospital updated in dashboard form:', name);
    }

    // This function logs out the current user by calling the authentication service logout method which clears the session and redirects to login page.
    logout() {
        this.authService.logout();
    }

    // This function opens the AI chat assistant helper for a specific policy tier and sends an initial greeting message to start the conversation.
    openChatHelper(tier: any) {
        if (!this.selectedCategory) return;

        const policyData = {
            policyId: tier.tierId,
            policyName: tier.tierName,
            category: this.selectedCategory.categoryName,
            coverageAmount: tier.baseCoverageAmount,
            premium: tier.basePremiumAmount,
            benefits: tier.benefits
        };

        this.currentChatPolicy.set(policyData);
        this.chatMessages.set([]);
        this.isChatOpen.set(true);
        this.isChatLoading.set(true);

        // Initial trigger
        const initialText = "Hi"; // To trigger the first response from AI
        this.sendChatMessage(initialText, true);
    }

    // This function sends a chat message to the AI policy assistant by posting the customer details, policy information and message to the backend AI service.
    sendChatMessage(messageText?: string, isInitial: boolean = false) {
        const text = messageText || this.chatUserMessage();
        if (!text && !isInitial) return;

        if (!isInitial) {
            this.chatMessages.update((msgs: any[]) => [...msgs, { role: 'user', content: text }]);
            this.chatUserMessage.set('');
        }

        this.isChatLoading.set(true);

        // Fetch fresh user data to ensure all fields are current
        const freshUser = this.authService.getUser();

        const payload = {
            customer: {
                id: freshUser.id,
                name: freshUser.name,
                email: freshUser.email,
                phone: freshUser.phone
            },
            policy: this.currentChatPolicy(),
            message: text,
            question: text // Included as a fallback for n8n AI Agent nodes
        };

        console.log('[ChatHelper] Sending payload to n8n:', JSON.stringify(payload));

        this.policyService.sendChatQuestion(payload).subscribe({
            next: (res) => {
                this.isChatLoading.set(false);


                // const aiReply = res.reply || res.answer || "I'm' sorry, I couldn't get a response. Please try again.";
                let aiReply = res.reply || res.answer ||
                    "I'm sorry, I couldn't get a response. Please try again.";

                // Remove markdown special characters like *, -, _, `, #
                aiReply = aiReply
                    .replace(/[*_`#>-]/g, '')     // remove markdown symbols
                    .replace(/\n{2,}/g, '\n')     // remove extra line breaks
                    .trim();

                this.chatMessages.update((msgs: any[]) => [
                    ...msgs,
                    { role: 'bot', content: aiReply }
                ]);



                // this.chatMessages.update((msgs: any[]) => [...msgs, { role: 'bot', content: aiReply }]);

                // Scroll to bottom logic would go here if using ViewChild
            },
            error: (err) => {
                this.isChatLoading.set(false);
                this.chatMessages.update((msgs: any[]) => [...msgs, { role: 'bot', content: "Error: Could not reach the policy assistant." }]);
            }
        });
    }

    // This function closes the AI chat assistant dialog by setting the chat open state to false.
    closeChat() {
        this.isChatOpen.set(false);
    }
}
