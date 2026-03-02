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

@Component({
    selector: 'app-customer-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NotificationPanelComponent],
    templateUrl: './customer-dashboard.page.html',
    styleUrls: ['./customer-dashboard.page.css']
})
export class CustomerDashboardPage implements OnInit {
    private authService = inject(AuthService);
    private policyService = inject(PolicyService);
    private claimService = inject(ClaimService);
    private chatService = inject(ChatService);
    private router = inject(Router);

    user = this.authService.getUser();
    activeView = signal<'dashboard' | 'my-policies' | 'buy-policy' | 'raise-claim' | 'my-claims' | 'policy-details' | 'claim-details' | 'chat'>('dashboard');

    // Sub-view State
    selectedPolicyId = signal<string | null>(null);
    selectedClaimId = signal<string | null>(null);
    detailedPolicy = signal<any | null>(null);
    detailedClaim = signal<any | null>(null);
    detailedClaimsForPolicy = signal<any[]>([]);
    isSubmittingClaim = signal<boolean>(false);
    isPaying = signal<boolean>(false);

    // Configuration and Data
    config: any = null;
    myPolicies: any[] = [];
    myClaims: any[] = [];
    myChats = signal<any[]>([]);

    totalCoverage = signal<number>(0);
    totalClaimsPaid = signal<number>(0);
    remainingBalance = signal<number>(0);
    requestedClaimAmount = signal<number>(0);
    approvedClaimAmount = signal<number>(0);

    // Selection for Buy Policy
    selectedCategory: any = null;
    selectedTier: any = null;

    // Form Data
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
        familyMembers: []
    };

    calculatedPremium = signal<number>(0);
    isSubmitting = signal<boolean>(false);

    // AI Chat Helper State
    isChatOpen = signal<boolean>(false);
    chatMessages = signal<any[]>([]);
    currentChatPolicy = signal<any | null>(null);
    isChatLoading = signal<boolean>(false);
    chatUserMessage = signal<string>('');

    // Policy Detail & Payment (legacy, kept what's needed for sub-views)
    showPolicyDetailModal = signal(false);
    selectedPolicy = signal<any | null>(null);

    ngOnInit() {
        this.loadConfig();
        this.loadMyPolicies();
        this.loadMyClaims();
        this.loadChatList();
    }

    loadConfig() {
        this.policyService.getConfiguration().subscribe({
            next: (config) => {
                this.config = config;
                console.log('Policy Configuration loaded:', config);
            }
        });
    }

    loadMyPolicies() {
        this.policyService.getMyPolicies().subscribe({
            next: (policies) => {
                this.myPolicies = policies;
                this.calculateTotals();
                console.log('User policies loaded:', policies);
            }
        });
    }

    loadMyClaims() {
        this.claimService.getMyClaims().subscribe({
            next: (claims) => {
                this.myClaims = claims;
                this.calculateTotals();
                console.log('User claims loaded:', claims);
            }
        });
    }

    loadChatList() {
        this.chatService.getChatList().subscribe({
            next: (chats) => this.myChats.set(chats),
            error: (err) => console.error('Failed to load chat list', err)
        });
    }

    calculateTotals() {
        let coverage = 0;
        let claims = 0;
        let requested = 0;
        let approved = 0;

        this.myPolicies.forEach(p => {
            if (p.status === 'Active') {
                coverage += p.totalCoverageAmount || 0;
            }
        });

        this.myClaims.forEach(c => {
            requested += c.requestedAmount || 0;
            if (c.status === 'Approved' || c.status === 'Paid') {
                claims += c.approvedAmount || 0;
                approved += c.approvedAmount || 0;
            }
        });

        this.totalCoverage.set(coverage);
        this.totalClaimsPaid.set(claims);
        this.remainingBalance.set(coverage - claims);
        this.requestedClaimAmount.set(requested);
        this.approvedClaimAmount.set(approved);
    }

    switchView(view: 'dashboard' | 'my-policies' | 'buy-policy' | 'raise-claim' | 'my-claims' | 'chat') {
        this.activeView.set(view);
        if (view === 'buy-policy') {
            this.selectedCategory = null;
            this.selectedTier = null;
        }
        if (view === 'chat') {
            this.loadChatList();
        }
    }

    navigateToChat(chat: any) {
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
            this.router.navigate(['/chat', chat.policyId]);
        }
    }

    hasActivePolicy(categoryId: string): boolean {
        return this.myPolicies.some(p => p.policyCategory === categoryId && p.status === 'Active');
    }

    selectCategory(category: any) {
        this.selectedCategory = category;
        this.selectedTier = null;
        this.applicationForm.familyMembers = [];
    }

    selectTier(tier: any) {
        this.selectedTier = tier;
        this.updatePremium();
    }

    addFamilyMember() {
        if (this.applicationForm.familyMembers.length < 3) {
            this.applicationForm.familyMembers.push({ fullName: '', relation: 'Spouse' });
        }
    }

    removeFamilyMember(index: number) {
        this.applicationForm.familyMembers.splice(index, 1);
    }

    updatePremium() {
        if (!this.selectedCategory || !this.selectedTier) return;

        const request = {
            policyCategory: this.selectedCategory.categoryId,
            tierId: this.selectedTier.tierId,
            applicant: this.selectedCategory.categoryId === 'INDIVIDUAL' ? this.applicationForm.applicant : null,
            primaryApplicant: this.selectedCategory.categoryId === 'FAMILY' ? this.applicationForm.applicant : null,
            familyMembers: this.applicationForm.familyMembers,
            paymentMode: this.applicationForm.paymentMode
        };

        this.policyService.calculatePremium(request).subscribe({
            next: (res) => this.calculatedPremium.set(res.premium)
        });
    }

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

        this.policyService.applyForPolicy(request).subscribe({
            next: () => {
                alert('Policy Application Submitted Successfully! It will be reviewed by an agent soon.');
                this.isSubmitting.set(false);
                this.loadMyPolicies();
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

    openClaimDetails(claimId: string) {
        const claim = this.myClaims.find(c => c.id === claimId);
        if (!claim) return;
        this.detailedClaim.set(claim);
        this.selectedClaimId.set(claimId);
        this.activeView.set('claim-details');
    }

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

    // Claim Raising
    selectedPolicyForClaim = signal<any | null>(null);
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
    claimFiles: File[] = [];

    initiateClaim(pol: any) {
        this.selectedPolicyForClaim.set(pol);
        this.claimForm.affectedMemberName = '';
        this.claimForm.affectedMemberRelation = '';
        this.claimFiles = [];
        this.switchView('raise-claim');
    }

    onFileChange(event: any) {
        if (event.target.files.length > 0) {
            this.claimFiles = Array.from(event.target.files);
        }
    }

    submitClaim() {
        if (!this.selectedPolicyForClaim()) return;

        this.isSubmitting.set(true);
        const formData = new FormData();
        formData.append('policyApplicationId', this.selectedPolicyForClaim()!.id);
        formData.append('incidentDate', this.claimForm.incidentDate);
        formData.append('incidentType', this.claimForm.incidentType);
        formData.append('incidentLocation', this.claimForm.incidentLocation);
        formData.append('description', this.claimForm.description);
        formData.append('hospitalName', this.claimForm.hospitalName);
        formData.append('hospitalizationRequired', this.claimForm.hospitalizationRequired.toString());
        formData.append('requestedAmount', this.claimForm.requestedAmount.toString());

        if (this.selectedPolicyForClaim()!.policyCategory === 'FAMILY') {
            formData.append('affectedMemberName', this.claimForm.affectedMemberName);
            formData.append('affectedMemberRelation', this.claimForm.affectedMemberRelation);
        }

        this.claimFiles.forEach(file => {
            formData.append('documents', file, file.name);
        });

        this.claimService.raiseClaim(formData).subscribe({
            next: () => {
                alert('Claim Raised Successfully! Admin will assign an officer to review it.');
                this.isSubmitting.set(false);
                this.loadMyClaims();
                this.switchView('my-claims');
            },
            error: (err) => {
                this.isSubmitting.set(false);
                alert('Failed to raise claim: ' + (err.error?.message || 'Server error'));
            }
        });
    }

    logout() {
        this.authService.logout();
    }

    // Chat Helper Logic
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

    closeChat() {
        this.isChatOpen.set(false);
    }
}
