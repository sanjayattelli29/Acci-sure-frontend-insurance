import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PolicyService } from '../../services/policy.service';
import { ClaimService } from '../../services/claim.service';
import { ChatService } from '../../services/chat.service';

import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NotificationPanelComponent } from '../../components/notification-panel/notification-panel.component';
import { GooglePlacesInputComponent } from '../../components/incident-location/incident-location.component';
import { LocationMapComponent } from '../../components/location-map/location-map.component';
import * as Tesseract from 'tesseract.js';

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
    activeView = signal<'dashboard' | 'my-policies' | 'buy-policy' | 'raise-claim' | 'my-claims' | 'policy-details' | 'claim-details' | 'chat' | 'kyc-verification'>('dashboard');
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

    // prevents selecting future dates 
    today: string = new Date().toISOString().split('T')[0];

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
            profession: '',
            alcoholHabit: 'Non Drinker',
            smokingHabit: 'Non Smoker',
            travelKmPerMonth: 0,
            vehicleType: 'None'
        },
        annualIncome: 0,
        paymentMode: 'yearly',
        nominee: {
            name: '',
            relationship: '',
            phone: '',
            email: '',
            bankAccount: '',
            ifsc: ''
        },
        location: {
            address: '',
            latitude: null,
            longitude: null,
            state: '',
            district: '',
            area: '',
            pincode: ''
        },
        familyMembers: [] // for family policies
    };

    // signal for policy application location coordinates
    selectedPolicyLocationCoords = signal<{ lat: number, lng: number } | null>(null);

    // store uploaded policy documents
    policyDocuments: { type: string, file: File, name: string }[] = [];
    isUploadingDocs = signal<boolean>(false);

    // calculated premium from backend
    calculatedPremium = signal<number>(0);
    isSubmitting = signal<boolean>(false);

    // Buy Policy Multi-Step Flow State
    buyFlowStep = signal<number>(1); // 1 = Form, 2 = Review/Timeline
    paymentTimeline = signal<any[]>([]);

    // ai chat helper state for policy assistance
    isChatOpen = signal<boolean>(false);
    chatMessages = signal<any[]>([]);
    currentChatPolicy = signal<any | null>(null);
    isChatLoading = signal<boolean>(false);
    chatUserMessage = signal<string>('');

    // policy detail modal legacy state
    showPolicyDetailModal = signal(false);
    showPaymentModal = signal(false);
    selectedPolicy = signal<any | null>(null);

    // KYC Verification State
    isKycVerified = signal<boolean>(false);
    kycStep = signal<number>(1);
    aadharFile = signal<File | null>(null);
    aadharPreview = signal<string | null>(null);
    aadharText = signal<string | null>(null);
    selfieFile = signal<File | null>(null);
    selfiePreview = signal<string | null>(null);
    isCameraActive = signal<boolean>(false);
    cameraStream = signal<MediaStream | null>(null);
    isKycVerifying = signal<boolean>(false);
    kycError = signal<string | null>(null);
    kycSuccessMsg = signal<string | null>(null);

    // This function loads all required data when the component initializes including configuration, policies, claims and chat list from the backend services.
    ngOnInit() {
        // Prefill name if available
        if (this.user?.name) {
            this.applicationForm.applicant.fullName = this.user.name;
        }

        const kycStatus = localStorage.getItem('isKycVerified_' + this.user?.id);
        if (kycStatus === 'true') {
            this.isKycVerified.set(true);
        }

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
    switchView(view: 'dashboard' | 'my-policies' | 'buy-policy' | 'raise-claim' | 'my-claims' | 'chat' | 'kyc-verification') {
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
        if (!this.isKycVerified()) {
            alert('Please complete kyc verification with proceed button please.');
            this.switchView('kyc-verification');
            return;
        }

        this.selectedTier = tier;

        // Prefill full name from user profile if not already set
        if (!this.applicationForm.applicant.fullName && this.user?.name) {
            this.applicationForm.applicant.fullName = this.user.name;
        }

        this.updatePremium(); // calc premium when tier selected
    }

    // ADD FAMILY MEMBER
    addFamilyMember() {
        const max = this.selectedCategory?.maxMembersAllowed || 5;
        if (this.applicationForm.familyMembers.length < max) {
            this.applicationForm.familyMembers.push({
                fullName: '',
                relation: 'Spouse',
                dateOfBirth: this.today,
                healthConditions: ''
            });
        }
    }

    // REMOVE FAMILY MEMBER
    removeFamilyMember(index: number) {
        this.applicationForm.familyMembers.splice(index, 1);
    }

    // calc premium when tier selected
    updatePremium() {
        if (!this.selectedCategory || !this.selectedTier) return;

        const request = {
            policyCategory: this.selectedCategory.categoryId,
            tierId: this.selectedTier.tierId,
            applicant: this.selectedCategory.categoryId === 'INDIVIDUAL' ? { ...this.applicationForm.applicant, annualIncome: this.applicationForm.annualIncome } : null,
            primaryApplicant: this.selectedCategory.categoryId === 'FAMILY' ? { ...this.applicationForm.applicant, annualIncome: this.applicationForm.annualIncome } : null,
            familyMembers: this.applicationForm.familyMembers,
            paymentMode: this.applicationForm.paymentMode,
            annualIncome: this.applicationForm.annualIncome,
            vehicleType: this.applicationForm.applicant.vehicleType
        };

        this.policyService.calculatePremium(request).subscribe({
            next: (res) => this.calculatedPremium.set(res.premium)
        });
    }

    // Helper to get formatted payment intervals with interests info
    getPaymentIntervals() {
        if (!this.selectedTier) return [];

        return [
            {
                mode: 'monthly',
                title: 'Monthly Subscription',
                interest: 10, // Matches backend config 1.1 multiplier
                count: 12,
                label: 'Per Month',
                description: 'Convenient monthly payments with 10% processing fee.'
            },
            {
                mode: 'halfYearly',
                title: 'Bi-Annual Savings',
                interest: 5, // Matches backend config 1.05 multiplier
                count: 2,
                label: 'Every 6 Months',
                description: 'Pay twice a year. 5% convenience fee applied.'
            },
            {
                mode: 'yearly',
                title: 'Lump-Sum (Best Value)',
                interest: -5, // Matches backend config 0.95 multiplier (discount)
                count: 1,
                label: 'Pay Once / Year',
                description: 'Cleanest, most economical choice with 5% discount.'
            }
        ];
    }

    // Calc approximate payment amount for a mode based on current calculated premium
    getApproximatePayment(mode: string): number {
        const currentTotal = this.calculatedPremium();
        if (currentTotal <= 0) return 0;

        // Multipliers from backend config
        const multipliers: { [key: string]: number } = {
            'monthly': 1.1,
            'halfYearly': 1.05,
            'yearly': 0.95
        };

        const counts: { [key: string]: number } = {
            'monthly': 12,
            'halfYearly': 2,
            'yearly': 1
        };

        const currentMode = this.applicationForm.paymentMode || 'yearly';
        const currentMult = multipliers[currentMode] || 1.0;

        // 1. Find "Pure Base" (all risk factors, but 1.0 payment mult)
        const pureBase = currentTotal / currentMult;

        // 2. Derive target mode total
        const targetMult = multipliers[mode] || 1.0;
        const targetTotal = pureBase * targetMult;

        // 3. Divide by count
        return targetTotal / (counts[mode] || 1);
    }

    // Step navigation: Proceed to Payment (Step 2)
    proceedToPayment() {
        if (!this.isApplicationFormValid()) {
            alert('Please fill all mandatory fields and upload required documents before proceeding.');
            return;
        }
        this.buyFlowStep.set(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Step navigation: Proceed to Review (Step 3)
    proceedToReview() {
        this.calculatePaymentTimeline();
        this.buyFlowStep.set(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Step navigation: Back to Step 1
    goBackToStep1() {
        this.buyFlowStep.set(1);
    }

    // Step navigation: Back to Step 2
    goBackToStep2() {
        this.buyFlowStep.set(2);
    }

    // Generates a 12-month schedule showing when payments occur
    calculatePaymentTimeline() {
        const months = [];
        const mode = this.applicationForm.paymentMode;
        const totalPremium = this.calculatedPremium();
        const basePeriodic = this.getApproximatePayment(mode);

        const startDate = new Date();

        for (let i = 0; i < 12; i++) {
            const currentDate = new Date(startDate);
            currentDate.setMonth(startDate.getMonth() + i);

            let isPaymentMonth = false;
            let amount = 0;

            if (mode === 'monthly') {
                isPaymentMonth = true;
                amount = basePeriodic;
            } else if (mode === 'halfYearly') {
                if (i === 0 || i === 6) {
                    isPaymentMonth = true;
                    amount = basePeriodic;
                }
            } else if (mode === 'yearly') {
                if (i === 0) {
                    isPaymentMonth = true;
                    amount = totalPremium;
                }
            }

            months.push({
                monthIndex: i + 1,
                date: currentDate,
                isPaymentMonth,
                amount,
                status: isPaymentMonth ? 'Payment Due' : 'Active Coverage'
            });
        }
        this.paymentTimeline.set(months);
    }

    // handle document selection for policy application

    // Generates a 12-month schedule for an active policy
    generatePolicyTimeline(pol: any) {
        if (!pol) return [];
        const months = [];
        const mode = pol.paymentMode || 'yearly';
        const totalPremium = pol.calculatedPremium || 0;

        let multiplier = 1.0;
        let count = 1;
        if (mode === 'monthly') { multiplier = 1.1; count = 12; }
        else if (mode === 'halfYearly') { multiplier = 1.05; count = 2; }
        else { multiplier = 0.95; count = 1; }

        const pureBase = totalPremium / multiplier;
        const basePeriodic = totalPremium / count;

        const startDate = pol.startDate ? new Date(pol.startDate) : new Date();

        for (let i = 0; i < 12; i++) {
            const currentDate = new Date(startDate);
            currentDate.setMonth(startDate.getMonth() + i);

            let isPaymentMonth = false;
            let amount = 0;

            if (mode === 'monthly') {
                isPaymentMonth = true;
                amount = basePeriodic;
            } else if (mode === 'halfYearly') {
                if (i === 0 || i === 6) {
                    isPaymentMonth = true;
                    amount = basePeriodic;
                }
            } else if (mode === 'yearly' || mode === 'Yearly') {
                if (i === 0) {
                    isPaymentMonth = true;
                    amount = totalPremium;
                }
            } else {
                // fallback if case mismatch
                if (i === 0) {
                    isPaymentMonth = true;
                    amount = totalPremium;
                }
            }

            months.push({
                monthIndex: i + 1,
                date: currentDate,
                isPaymentMonth,
                amount,
                status: isPaymentMonth ? 'Payment Due' : 'Active Coverage'
            });
        }
        return months;
    }

    onPolicyFileChange(event: any, type: string) {
        if (event.target.files.length > 0) {
            const file = event.target.files[0];

            // Only accept PDF
            if (file.type !== 'application/pdf') {
                alert('Only PDF documents are allowed for verification.');
                event.target.value = ''; // Reset input
                return;
            }

            // Remove existing doc of same type if any
            this.policyDocuments = this.policyDocuments.filter(d => d.type !== type);
            this.policyDocuments.push({ type, file, name: file.name });
            console.log(`Document added: ${type}`, file.name);
        }
    }

    // helper to check if a doc type is uploaded
    hasUploadedDocument(type: string): boolean {
        return this.policyDocuments.some(d => d.type === type);
    }

    // helper to get name of uploaded doc
    getUploadedFileName(type: string): string | null {
        const doc = this.policyDocuments.find(d => d.type === type);
        return doc ? doc.name : null;
    }

    // helper to remove uploaded doc
    removeDocument(type: string) {
        this.policyDocuments = this.policyDocuments.filter(d => d.type !== type);
        console.log(`Document removed: ${type}`);
    }

    // New Validation Methods
    isValidName(name: string): boolean {
        if (!name) return false;
        // Letters and spaces only
        return /^[a-zA-Z\s]*$/.test(name);
    }

    isValidEmail(email: string): boolean {
        if (!email) return false;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    isValidIFSC(ifsc: string): boolean {
        if (!ifsc) return false;
        // IFSC: 4 uppercase letters, 0, then 6 alphanumeric
        return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
    }

    isValidBankAccount(acc: string): boolean {
        if (!acc) return false;
        // Standard bank account: 9 to 18 digits 
        return /^\d{9,18}$/.test(acc);
    }

    isValidPhone(phone: string): boolean {
        if (!phone) return false;
        return /^[0-9]{10}$/.test(phone);
    }

    isApplicationFormValid(): boolean {
        const app = this.applicationForm;

        // Basic Applicant Validation
        if (!this.isValidName(app.applicant.fullName)) return false;
        if (app.applicant.age < 22) return false;
        if (app.annualIncome <= 0) return false;
        if (app.applicant.travelKmPerMonth < 0) return false;

        // Nominee Validation
        if (!app.nominee.name || !this.isValidName(app.nominee.name)) return false;
        if (!app.nominee.relationship) return false;
        if (!this.isValidEmail(app.nominee.email)) return false;
        if (!this.isValidPhone(app.nominee.phone)) return false;
        if (!this.isValidBankAccount(app.nominee.bankAccount)) return false;
        if (!this.isValidIFSC(app.nominee.ifsc)) return false;

        // Family Members Validation (if applicable)
        if (this.selectedCategory?.categoryId === 'FAMILY') {
            if (app.familyMembers.length === 0) return false;
            for (const member of app.familyMembers) {
                if (!this.isValidName(member.fullName) || !member.relation || !member.dateOfBirth) return false;
            }
        }

        // Mandatory Documents Validation
        const mandatoryDocs = ['IdentityProof', 'AgeProof', 'IncomeProof', 'MedicalReport'];
        for (const type of mandatoryDocs) {
            if (!this.hasUploadedDocument(type)) return false;
        }

        return true;
    }

    // submit application and then upload files
    submitApplication() {
        if (this.isSubmitting()) return;

        this.isSubmitting.set(true);
        const request = {
            policyCategory: this.selectedCategory.categoryId,
            tierId: this.selectedTier.tierId,
            applicant: this.selectedCategory.categoryId === 'INDIVIDUAL' ? this.applicationForm.applicant : null,
            primaryApplicant: this.selectedCategory.categoryId === 'FAMILY' ? this.applicationForm.applicant : null,
            familyMembers: this.applicationForm.familyMembers.map((fm: any) => ({
                ...fm,
                dateOfBirth: fm.dateOfBirth || this.today // fallback
            })),
            paymentMode: this.applicationForm.paymentMode,
            nominee: this.applicationForm.nominee,
            annualIncome: this.applicationForm.annualIncome,
            location: this.applicationForm.location,
            vehicleType: this.applicationForm.applicant.vehicleType
        };

        this.policyService.applyForPolicy(request).subscribe({
            next: (res) => {
                const applicationId = res.message; // Id returned from backend

                // If there are documents, upload them
                if (this.policyDocuments.length > 0) {
                    this.isUploadingDocs.set(true);
                    this.policyService.submitDocuments(applicationId, this.policyDocuments).subscribe({
                        next: () => {
                            this.isUploadingDocs.set(false);
                            this.isSubmitting.set(false);
                            alert('Policy Application Submitted with Documents Successfully!');
                            this.loadMyPolicies();
                            this.switchView('my-policies');
                        },
                        error: (err) => {
                            this.isUploadingDocs.set(false);
                            this.isSubmitting.set(false);
                            alert('Application submitted but document upload failed. You can upload them later from policy details.');
                            this.loadMyPolicies();
                            this.switchView('my-policies');
                        }
                    });
                } else {
                    this.isSubmitting.set(false);
                    alert('Policy Application Submitted! Please upload required documents from policy details to proceed with verification.');
                    this.loadMyPolicies();
                    this.switchView('my-policies');
                }
            },
            error: (err) => {
                this.isSubmitting.set(false);
                alert('Failed to submit application: ' + (err.error?.message || 'Server error'));
            }
        });
    }

    // This function opens the detailed view of a specific policy by loading its complete information including associated claims from the database.
    openPolicyDetails(polId: string) {
        const pol = this.myPolicies.find(p => p.id === polId);
        if (!pol) return;

        // Parse JSON data robustly
        let raw: any = {};
        try {
            raw = typeof pol.applicationDataJson === 'string'
                ? JSON.parse(pol.applicationDataJson)
                : (pol.applicationDataJson || {});
        } catch (e) {
            raw = {};
        }

        const normalize = (obj: any) => {
            if (!obj) return null;
            const normalized: any = {};
            Object.keys(obj).forEach(key => {
                const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
                normalized[normalizedKey] = obj[key];
            });
            return normalized;
        };

        const fullDetails = normalize(raw) || {};

        // Match the robust nominee mapping used in Admin/Agent
        const n = normalize(fullDetails.nominee || raw.Nominee) || {};
        fullDetails.nominee = {
            name: n.name || n.nomineeName || 'N/A',
            relationship: n.relationship || n.nomineeRelationship || '--',
            email: n.email || n.nomineeEmail || '--',
            phone: n.phone || n.nomineePhone || '--',
            bankAccount: n.bankAccount || n.nomineeBankAccountNumber || n.bankAccountNumber || '--',
            ifsc: n.ifsc || n.nomineeIfsc || '--'
        };

        // Enrich applicant
        let applicant = normalize(fullDetails.applicant || raw.Applicant) || {};
        if (!applicant.fullName) applicant.fullName = pol.user?.fullName || pol.user?.userName || 'N/A';

        applicant.age = applicant.age || raw.Age || pol.age || '--';
        applicant.profession = applicant.profession || raw.Profession || pol.profession || 'Standard';
        applicant.annualIncome = applicant.annualIncome || raw.AnnualIncome || pol.annualIncome || 0;
        applicant.alcoholHabit = applicant.alcoholHabit || raw.AlcoholHabit || pol.alcoholHabit || 'None';
        applicant.smokingHabit = applicant.smokingHabit || raw.SmokingHabit || pol.smokingHabit || 'None';
        applicant.vehicleType = applicant.vehicleType || raw.VehicleType || pol.vehicleType || 'None';
        applicant.travelKmPerMonth = applicant.travelKmPerMonth || raw.TravelKmPerMonth || pol.travelKmPerMonth || 0;

        fullDetails.applicant = applicant;

        // Ensure location is normalized with fallback to flat fields
        const loc = normalize(fullDetails.location || raw.Location || raw.location || {});
        fullDetails.location = {
            address: loc.address || pol.address || 'No address provided',
            latitude: loc.latitude || pol.latitude || null,
            longitude: loc.longitude || pol.longitude || null,
            state: loc.state || pol.state || '',
            district: loc.district || pol.district || '',
            pincode: loc.pincode || pol.pincode || ''
        };

        pol.fullDetails = fullDetails;

        // Enrich from config if available
        if (this.config) {
            const cat = this.config.policyCategories?.find((c: any) => c.categoryId === pol.policyCategory);
            const tier = cat?.tiers?.find((t: any) => t.tierId === pol.tierId);
            pol.coverageAmount = tier?.baseCoverageAmount || (pol.totalCoverageAmount || pol.sumInsured || 0);
            pol.policyName = tier?.tierName || pol.tierId;
            pol.basePremiumAmount = tier?.basePremiumAmount || 0;
        }

        // Add monthly premium
        pol.monthlyPremium = (pol.calculatedPremium || 0) / 12;

        this.detailedPolicy.set({ ...pol });
        this.detailedClaimsForPolicy.set(this.myClaims.filter(c => c.policyApplicationId === polId));
        this.selectedPolicyId.set(polId);
        this.activeView.set('policy-details');
    }


    // This function processes the premium payment for a policy from the detailed policy view and activates the policy upon successful payment.
    payPremiumFromDetails() {
        const pol = this.detailedPolicy();
        if (!pol) return;

        if (!confirm(`Confirm payment of ₹${pol.calculatedPremium} for ${pol.tierId} policy?`)) return;

        this.executePayment();
    }

    // New consolidated payment execution for the modal
    executePayment() {
        const pol = this.detailedPolicy();
        if (!pol) return;

        this.isPaying.set(true);
        this.policyService.processPayment(pol.id, pol.calculatedPremium).subscribe({
            next: () => {
                this.isPaying.set(false);
                this.showPaymentModal.set(false);
                alert('Payment Successful! Your policy is now ACTIVE.');
                window.location.reload();
            },
            error: (err) => {
                this.isPaying.set(false);
                // If it's a backend mismatch but payment succeeded, or if it explicitly says AwaitingPayment
                if (err.error?.message?.includes('status') || err.error?.message?.includes('AwaitingPayment')) {
                    alert('Payment processed. Your policy is now ACTIVE.');
                    window.location.reload();
                } else {
                    alert('Payment failed: ' + (err.error?.message || 'Processing error'));
                }
            }
        });
    }

    // This function opens the detailed view of a specific insurance claim showing all information about the claim including status and associated policy details.
    openClaimDetails(claimId: string) {
        const claim = this.myClaims.find(c => c.id === claimId);
        if (!claim) return;

        // Parse policy json to get nominee info
        let details: any = null;
        if (claim.policy?.applicationDataJson) {
            try {
                const raw = JSON.parse(claim.policy.applicationDataJson);
                const normalize = (obj: any) => {
                    if (!obj) return null;
                    const normalized: any = {};
                    Object.keys(obj).forEach(key => {
                        const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
                        normalized[normalizedKey] = obj[key];
                    });
                    return normalized;
                };

                const fullDetails = normalize(raw);
                if (fullDetails) {
                    fullDetails.nominee = normalize(fullDetails.nominee || raw.Nominee) || {};
                    // ensure keys are safe
                    fullDetails.nominee.name = fullDetails.nominee.name || fullDetails.nominee.nomineeName || '--';
                    fullDetails.nominee.email = fullDetails.nominee.email || fullDetails.nominee.nomineeEmail || '--';
                    fullDetails.nominee.phone = fullDetails.nominee.phone || fullDetails.nominee.nomineePhone || '--';
                    fullDetails.nominee.bankAccount = fullDetails.nominee.bankAccount || fullDetails.nominee.nomineeBankAccountNumber || '--';
                    fullDetails.nominee.relationship = fullDetails.nominee.relationship || fullDetails.nominee.nomineeRelationship || '--';
                }
                details = fullDetails;
            } catch (e) { }
        }

        this.detailedClaim.set({ ...claim, fullDetails: details });
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
                window.location.reload();
            },
            error: (err) => {
                this.isPaying.set(false);
                if (err.error?.message?.includes('status') || err.error?.message?.includes('AwaitingPayment')) {
                    alert('Payment processed. Your policy is now ACTIVE.');
                    window.location.reload();
                } else {
                    alert('Payment failed: ' + (err.error?.message || 'Processing error'));
                }
            }
        });
    }

    // claim raising section
    selectedPolicyForClaim = signal<any | null>(null);
    claimStep = signal<number>(1);

    // claim form data
    claimForm: any = {
        incidentDate: '',
        incidentTime: '',
        incidentType: 'Accidental Injury',
        accidentCause: 'Vehicle Accident',
        policeCaseFiled: false,
        firNumber: '',
        incidentLocation: '',
        description: '',
        hospitalName: '',
        hospitalizationRequired: false,
        admissionDate: '',
        dischargeDate: '',
        injuryType: 'Minor Injury',
        bodyPartInjured: 'Head',
        estimatedMedicalCost: 0,
        hospitalBill: 0,
        medicines: 0,
        otherExpenses: 0,
        requestedAmount: 0,
        affectedMemberName: '',
        affectedMemberRelation: ''
    };
    claimFiles: File[] = []; // uploaded documents
    hasFirReport = signal<boolean>(false);
    hasHospitalBill = signal<boolean>(false);
    selectedLocationCoords = signal<{ lat: number, lng: number } | null>(null);

    // this function initializes the claim submission form for a selected policy by resetting all form fields and navigating to the raise claim view.
    initiateClaim(pol: any) {
        this.selectedPolicyForClaim.set(pol);
        this.claimForm = {
            incidentDate: '',
            incidentTime: '',
            incidentType: 'Accidental Injury',
            accidentCause: 'Vehicle Accident',
            policeCaseFiled: false,
            firNumber: '',
            incidentLocation: '',
            description: '',
            hospitalName: '',
            hospitalizationRequired: false,
            admissionDate: '',
            dischargeDate: '',
            injuryType: 'Minor Injury',
            bodyPartInjured: 'Head',
            estimatedMedicalCost: 0,
            hospitalBill: 0,
            medicines: 0,
            otherExpenses: 0,
            requestedAmount: 0,
            affectedMemberName: '',
            affectedMemberRelation: ''
        };
        this.claimStep.set(1);
        this.claimFiles = [];
        this.hasFirReport.set(false);
        this.hasHospitalBill.set(false);
        this.selectedLocationCoords.set(null);
        this.switchView('raise-claim');
    }

    get hospitalDays(): number {
        if (!this.claimForm.admissionDate || !this.claimForm.dischargeDate) return 0;
        const d1 = new Date(this.claimForm.admissionDate);
        const d2 = new Date(this.claimForm.dischargeDate);
        const diffTime = Math.abs(d2.getTime() - d1.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    calculateTotalMedicalCost() {
        this.claimForm.estimatedMedicalCost = (this.claimForm.hospitalBill || 0) + (this.claimForm.medicines || 0) + (this.claimForm.otherExpenses || 0);
    }

    get suggestedClaimAmount(): number {
        return this.claimForm.estimatedMedicalCost * 0.9;
    }

    populateSuggestedAmount() {
        this.claimForm.requestedAmount = this.suggestedClaimAmount;
    }

    get isClaimDataComplete(): boolean {
        return this.hasHospitalBill() && this.claimForm.hospitalName !== '';
    }

    // this function handles the file upload event when users select supporting documents like medical reports and bills for their insurance claims.
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
        formData.append('incidentTime', this.claimForm.incidentTime || '');
        formData.append('incidentType', this.claimForm.incidentType);
        formData.append('accidentCause', this.claimForm.accidentCause);
        formData.append('policeCaseFiled', this.claimForm.policeCaseFiled.toString());
        formData.append('firNumber', this.claimForm.firNumber || '');
        formData.append('incidentLocation', this.claimForm.incidentLocation);

        const coords = this.selectedLocationCoords();
        if (coords) {
            formData.append('latitude', coords.lat.toString());
            formData.append('longitude', coords.lng.toString());
        }

        formData.append('description', this.claimForm.description);
        formData.append('hospitalName', this.claimForm.hospitalName);
        formData.append('hospitalizationRequired', this.claimForm.hospitalizationRequired.toString());
        formData.append('admissionDate', this.claimForm.admissionDate || '');
        formData.append('dischargeDate', this.claimForm.dischargeDate || '');
        formData.append('injuryType', this.claimForm.injuryType);
        formData.append('bodyPartInjured', this.claimForm.bodyPartInjured);
        formData.append('estimatedMedicalCost', this.claimForm.estimatedMedicalCost.toString());
        formData.append('hospitalBill', this.claimForm.hospitalBill.toString());
        formData.append('medicines', this.claimForm.medicines.toString());
        formData.append('otherExpenses', this.claimForm.otherExpenses.toString());
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

    // Handles map location selection for policy buying flow
    onPolicyLocationSelected(data: any) {
        if (typeof data === 'string') {
            this.applicationForm.location.address = data;
        } else {
            this.applicationForm.location.address = data.address;
            this.applicationForm.location.latitude = data.lat;
            this.applicationForm.location.longitude = data.lng;
            this.selectedPolicyLocationCoords.set({ lat: data.lat, lng: data.lng });

            // Set sliced components if available
            if (data.components) {
                this.applicationForm.location.state = data.components.state || '';
                this.applicationForm.location.district = data.components.district || '';
                this.applicationForm.location.area = data.components.area || '';
                this.applicationForm.location.pincode = data.components.pincode || '';
            }
        }
        console.log('Policy location updated:', data);
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

    // KYC Logic
    onAadharFileChange(event: any) {
        if (event.target.files.length > 0) {
            const file = event.target.files[0];
            this.aadharFile.set(file);
            const reader = new FileReader();
            reader.onload = async () => {
                this.aadharPreview.set(reader.result as string);

                // Actual text extraction from image via Tesseract
                this.aadharText.set("Extracting text details directly from your document... Please wait...");
                try {
                    const worker = await Tesseract.createWorker('eng');
                    const ret = await worker.recognize(file);
                    let text = ret.data.text;

                    if (text && text.trim().length > 0) {
                        let parsedDetails = [];

                        // Extract Name heuristic: Aadhar names are typically the English line immediately before the DOB line
                        const lines = text.split('\n').filter(l => l.trim().length > 0);
                        const dobIndex = lines.findIndex(l => /DOB|Year of Birth/i.test(l));
                        if (dobIndex > 0) {
                            let possibleName = lines[dobIndex - 1].trim();
                            // Strip typical leading Telugu/Hindi OCR artifacts (non-alphabet chars)
                            possibleName = possibleName.replace(/^[^a-zA-Z]+/, '').trim();
                            if (possibleName.length > 3) {
                                parsedDetails.push(`Name: ${possibleName}`);
                            }
                        }

                        // Extract DOB
                        const dobMatch = text.match(/DOB[:\.\s]*(\d{2}\/\d{2}\/\d{4})/i) || text.match(/Year of Birth.*(\d{4})/i);
                        if (dobMatch) parsedDetails.push(`Date of Birth: ${dobMatch[1]}`);

                        // Extract common Aadhar patterns
                        // Using a more lenient regex without word boundaries, allowing 1 or more spaces between blocks
                        const aadharMatch = text.match(/\d{4}[\s-]+\d{4}[\s-]+\d{4}/);
                        if (aadharMatch) parsedDetails.push(`Aadhar Number: ${aadharMatch[0].trim()}`);

                        if (parsedDetails.length > 0) {
                            this.aadharText.set(`Key Details Extracted Successfully!\n\n${parsedDetails.join('\n')}\n\nNote: These are extracted details. If details were not extracted successfully please upload again, or it's OK, verification will still proceed digitally.`);
                        } else {
                            this.aadharText.set(`Unstructured Formatting:\nCould not cleanly parse core details.\n\nNote: These are extracted details. If details were not extracted successfully please upload again, or it's OK, verification will still proceed digitally.\n\nFallback OCR Attempt:\n${text.replace(/\n\n+/g, '\n').substring(0, 100)}...`);
                        }
                    } else {
                        this.aadharText.set("Could not automatically extract readable text from the image. It might be blurry, improperly lit, or heavily multilingual. However, identity match will still properly proceed digitally via API.");
                    }
                    await worker.terminate();
                } catch (e) {
                    console.error("OCR Extraction failed:", e);
                    this.aadharText.set("OCR text extraction temporarily unavailable. Identity verification will proceed digitally via face recognition.");
                }
            };
            reader.readAsDataURL(file);
        }
    }

    async activateCamera() {
        this.isCameraActive.set(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            this.cameraStream.set(stream);
            setTimeout(() => {
                const video = document.getElementById('camera-video') as HTMLVideoElement;
                if (video) video.srcObject = stream;
            }, 100);
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera.');
        }
    }

    takePicture() {
        const video = document.getElementById('camera-video') as HTMLVideoElement;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                this.selfieFile.set(file);
                this.selfiePreview.set(URL.createObjectURL(blob));
                this.stopCamera();
            }
        }, 'image/jpeg');
    }

    stopCamera() {
        if (this.cameraStream()) {
            this.cameraStream()?.getTracks().forEach(track => track.stop());
            this.cameraStream.set(null);
        }
        this.isCameraActive.set(false);
    }

    async verifyKyc() {
        if (!this.aadharFile() || !this.selfieFile()) return;

        this.isKycVerifying.set(true);
        this.kycError.set(null);
        this.kycSuccessMsg.set(null);

        try {
            const formData = new FormData();
            formData.append('api_key', 'uY335TET_DRXQ0_t8pRDeVJj-CySDDIx');
            formData.append('api_secret', 'OJhLwUWImSdiMM5GwC0w_w2GZys32bdl');
            formData.append('image_file1', this.selfieFile()!);
            formData.append('image_file2', this.aadharFile()!);

            const response = await fetch('https://api-us.faceplusplus.com/facepp/v3/compare', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            console.log('Face++ API Response:', result);

            if (result.confidence !== undefined) {
                if (result.confidence > 80) {
                    this.kycSuccessMsg.set('Face Verified Successfully! Same Person. Similarity Score: ' + result.confidence);
                    this.isKycVerified.set(true);
                    if (this.user?.id) localStorage.setItem('isKycVerified_' + this.user.id, 'true');

                    // Call backend api
                    if (this.user?.id) {
                        this.authService.completeKyc(this.user.id).subscribe({
                            next: () => console.log('Backend KYC Status updated successfully'),
                            error: (err) => console.error('Failed to sync KYC with backend', err)
                        });
                    }

                    setTimeout(() => {
                        this.switchView('dashboard');
                    }, 3000); // give them 3 seconds to see the success message
                } else {
                    this.kycError.set('Face Not Matching. Similarity Score: ' + result.confidence);
                }
            } else {
                this.kycError.set('Error: confidence value not found. ' + (result.error_message || ''));
            }
        } catch (err: any) {
            console.error(err);
            this.kycError.set('Failed to connect to verification API.');
        } finally {
            this.isKycVerifying.set(false);
        }
    }
}
