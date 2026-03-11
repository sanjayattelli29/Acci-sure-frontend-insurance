import { Component, signal, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AgentService } from '../../services/agent.service';
import { ClaimService } from '../../services/claim.service';
import { PolicyService } from '../../services/policy.service';
import { ChatService } from '../../services/chat.service';
import { AdminService } from '../../services/admin.service';
import { NotificationPanelComponent } from '../../components/notification-panel/notification-panel.component';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { LocationMapComponent } from '../../components/location-map/location-map.component';

// register chartjs for commission analytics
Chart.register(...registerables);

// agent dashboard for insurance agents
// manages policy requests commission tracking customer claims
@Component({
    selector: 'app-agent-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NotificationPanelComponent, LocationMapComponent],
    templateUrl: './agent-dashboard.page.html'
})
export class AgentDashboardPage implements OnInit {
    // inject services for agent operations
    private authService = inject(AuthService);
    private agentService = inject(AgentService);

    // expose JSON for template parsing
    protected readonly JSON = JSON;

    // parse json strings from backend safely
    parseJson(json: string | null | undefined): any {
        try {
            return json ? JSON.parse(json) : null;
        } catch {
            return null;
        }
    }

    // logged in agent user
    user = this.authService.getUser();
    // active dashboard section
    activeSection = signal('dashboard');
    // mobile sidebar toggle
    sidebarOpen = signal(false);
    // more service injections
    private claimService = inject(ClaimService);
    private policyService = inject(PolicyService);
    private chatService = inject(ChatService);
    private adminService = inject(AdminService);
    private router = inject(Router);
    // ui state
    isLoading = signal(false);
    message = signal({ type: '', text: '' });

    // agent dashboard data from backend
    stats: any = {
        pendingReview: 0,
        totalCommission: 0,
        totalCoverage: 0,
        activePolicies: 0,
        uniqueCustomers: 0,
        bestCategory: '',
        bestTier: '',
        totalPremium: 0
    };
    analytics = signal<any>(null); // analytics data from backend
    policyRequests = signal<any[]>([]); // pending policy applications to review
    commissionData = signal<any>({ totalCommission: 0, activePolicies: [] }); // commission earnings
    customerClaims = signal<any[]>([]); // claims from agent's customers
    myCustomers = signal<any[]>([]); // list of assigned customers
    myChats = signal<any[]>([]); // chat rooms with customers
    unifiedPayments = signal<any[]>([]); // payment records

    // modal state for viewing details
    showDetailModal = signal(false);
    showClaimModal = signal(false);
    showUnifiedDetail = signal(false);
    selectedUnifiedDetail = signal<any>(null);
    selectedApplication = signal<any | null>(null);
    selectedClaim = signal<any | null>(null);
    selectedPayment = signal<any>(null);
    showInvoiceModal = signal(false);
    isProcessing = signal(false);

    // AI Analysis State
    isAILoading = signal(false);
    showAIModal = signal(false);
    aiResult = signal<any>(null);

    // chartjs instances for analytics
    private charts: Chart[] = [];

    // load all agent data on page init
    ngOnInit() {
        this.loadData();
    }

    // fetch all data from backend via services
    loadData() {
        this.loadPolicyRequests();
        this.loadCommissionStats();
        this.loadCustomerClaims();
        this.loadMyCustomers();
        this.loadAnalytics();
        this.loadChatList();
        this.loadUnifiedPayments();
    }

    // load analytics data from backend for charts
    loadAnalytics() {
        this.agentService.getAnalytics().subscribe({
            next: (data) => {
                this.analytics.set(data);
                this.stats.totalCoverage = data.totalCoverageProvided;
                this.stats.activePolicies = data.activePolicyCount;
                this.stats.uniqueCustomers = data.uniqueCustomerCount;
                this.stats.bestCategory = data.bestPerformingCategory;
                this.stats.bestTier = data.bestPerformingTier;
                this.stats.totalPremium = data.totalPremiumCollected;
                this.stats.totalCommission = data.totalCommissionEarned;
                this.initCharts();
            },
            error: (err) => console.error('Failed to load analytics', err)
        });
    }

    loadCustomerClaims() {
        this.claimService.getAgentClaims().subscribe({
            next: (data: any[]) => this.customerClaims.set(data),
            error: (err: any) => console.error('Failed to load customer claims', err)
        });
    }

    loadMyCustomers() {
        this.policyService.getAgentCustomers().subscribe({
            next: (data) => this.myCustomers.set(data),
            error: (err) => console.error('Failed to load my customers', err)
        });
    }

    setSection(section: string) {
        this.activeSection.set(section);
        this.message.set({ type: '', text: '' });
        if (section === 'dashboard') {
            this.initCharts();
        } else if (section === 'payments') {
            this.loadUnifiedPayments();
            this.destroyCharts();
        } else {
            this.destroyCharts();
        }
        if (section === 'chat') {
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

    loadChatList() {
        this.chatService.getChatList().subscribe({
            next: (chats) => this.myChats.set(chats),
            error: (err) => console.error('Failed to load chat list', err)
        });
    }

    private initCharts() {
        if (this.activeSection() !== 'dashboard') return;
        setTimeout(() => {
            this.destroyCharts();
            this.createCommissionChart();
            this.createPortfolioChart();
            this.createTierChart();
            this.createPremiumTrendChart();
            this.createStatusChart();
            this.createClaimImpactChart();
        }, 100);
    }

    private destroyCharts() {
        this.charts.forEach(c => c.destroy());
        this.charts = [];
    }

    private createCommissionChart() {
        const canvas = document.getElementById('commissionChart') as HTMLCanvasElement;
        if (!canvas || !this.analytics()) return;

        const chartData = this.analytics().commissionPerformance || [];
        const labels = chartData.map((d: any) => d.month);
        const data = chartData.map((d: any) => d.value);

        this.charts.push(new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Commission (₹)',
                    data,
                    borderColor: '#f97316',
                    backgroundColor: 'rgba(249, 115, 22, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#f97316',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        }));
    }

    private createPortfolioChart() {
        const canvas = document.getElementById('portfolioChart') as HTMLCanvasElement;
        if (!canvas || !this.analytics()) return;

        const chartData = this.analytics().portfolioMix || [];

        this.charts.push(new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: chartData.map((d: any) => d.category),
                datasets: [{
                    data: chartData.map((d: any) => d.count),
                    backgroundColor: ['#4f46e5', '#f97316', '#10b981', '#6366f1']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } }
                }
            }
        }));
    }

    private createTierChart() {
        const canvas = document.getElementById('tierChart') as HTMLCanvasElement;
        if (!canvas || !this.analytics()) return;

        const chartData = this.analytics().tierBreakdown || [];

        this.charts.push(new Chart(canvas, {
            type: 'bar',
            data: {
                labels: chartData.map((d: any) => d.tier),
                datasets: [{
                    label: 'Policies',
                    data: chartData.map((d: any) => d.count),
                    backgroundColor: '#6366f1',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        }));
    }

    private createPremiumTrendChart() {
        const canvas = document.getElementById('premiumTrendChart') as HTMLCanvasElement;
        if (!canvas || !this.analytics()) return;

        const chartData = this.analytics().premiumTrends || [];

        this.charts.push(new Chart(canvas, {
            type: 'bar',
            data: {
                labels: chartData.map((d: any) => d.month),
                datasets: [{
                    label: 'Premium Collected (₹)',
                    data: chartData.map((d: any) => d.value),
                    backgroundColor: '#10b981',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
                    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
                }
            }
        }));
    }

    private createStatusChart() {
        const canvas = document.getElementById('statusChart') as HTMLCanvasElement;
        if (!canvas || !this.analytics()) return;

        const chartData = this.analytics().policyStatusMetrics || [];

        this.charts.push(new Chart(canvas, {
            type: 'pie',
            data: {
                labels: chartData.map((d: any) => d.status),
                datasets: [{
                    data: chartData.map((d: any) => d.count),
                    backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#6366f1']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10, weight: 'bold' } } }
                }
            }
        }));
    }

    private createClaimImpactChart() {
        const canvas = document.getElementById('claimChart') as HTMLCanvasElement;
        if (!canvas || !this.analytics()) return;

        const chartData = this.analytics().claimImpact || [];

        this.charts.push(new Chart(canvas, {
            type: 'radar',
            data: {
                labels: chartData.map((d: any) => d.metric),
                datasets: [{
                    label: 'Portfolio Impact',
                    data: chartData.map((d: any) => d.value),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    r: {
                        beginAtZero: true,
                        ticks: { display: false },
                        suggestedMax: Math.max(...chartData.map((d: any) => d.value)) * 1.2
                    }
                }
            }
        }));
    }

    loadPolicyRequests() {
        this.agentService.getMyRequests().subscribe({
            next: (data) => {
                this.policyRequests.set(data);
                // Pending review count for both Assigned and PendingReview status
                const pending = data.filter(r => r.status === 'Assigned' || r.status === 'PendingReview').length;
                this.stats.pendingReview = pending;
            },
            error: (err) => console.error('Failed to load my requests', err)
        });
    }

    loadCommissionStats() {
        this.agentService.getCommissionStats().subscribe({
            next: (data) => {
                this.commissionData.set(data);
                this.stats.totalCommission = data.totalCommission;
                this.initCharts();
            },
            error: (err) => console.error('Failed to load commission stats', err)
        });
    }

    viewDetails(application: any) {
        if (!application) return;

        // Parse JSON data robustly
        let raw: any = {};
        try {
            raw = typeof application.applicationDataJson === 'string'
                ? JSON.parse(application.applicationDataJson)
                : (application.applicationDataJson || {});
        } catch (e) { }

        const normalize = (obj: any) => {
            if (!obj) return null;
            const normalized: any = {};
            Object.keys(obj).forEach(key => {
                const normalizedKey = key.charAt(0).toLowerCase() + key.slice(1);
                normalized[normalizedKey] = obj[key];
            });
            return normalized;
        };

        const details = normalize(raw) || {};

        // Map nominee
        const n = normalize(details.nominee || raw.Nominee) || {};
        details.nominee = {
            name: n.name || n.nomineeName || 'N/A',
            relationship: n.relationship || n.nomineeRelationship || '--',
            email: n.email || n.nomineeEmail || '--',
            phone: n.phone || n.nomineePhone || '--',
            bankAccount: n.bankAccount || n.nomineeBankAccountNumber || n.bankAccountNumber || '--',
            ifsc: n.ifsc || n.nomineeIfsc || '--'
        };

        // Applicant details
        let applicant = normalize(details.applicant || raw.Applicant) || {};
        details.applicant = {
            fullName: application.user?.fullName || application.user?.userName || applicant.fullName || 'N/A',
            age: application.age || application.Age || raw.Age || applicant.age || raw.age || '--',
            profession: application.profession || application.Profession || raw.Profession || applicant.profession || 'Standard',
            alcoholHabit: application.alcoholHabit || application.AlcoholHabit || raw.AlcoholHabit || applicant.alcoholHabit || 'None',
            smokingHabit: application.smokingHabit || application.SmokingHabit || raw.SmokingHabit || applicant.smokingHabit || 'None',
            annualIncome: application.annualIncome || application.AnnualIncome || raw.AnnualIncome || applicant.annualIncome || 0,
            vehicleType: application.vehicleType || application.VehicleType || raw.VehicleType || applicant.vehicleType || raw.vehicleType || 'None',
            travelKmPerMonth: application.travelKmPerMonth || application.TravelKmPerMonth || raw.TravelKmPerMonth || applicant.travelKmPerMonth || raw.travelKmPerMonth || 0
        };

        // Location
        const loc = normalize(details.location || raw.location || raw.Location || {});
        details.location = {
            address: loc.address || application.address || 'No address provided',
            latitude: loc.latitude || application.latitude || null,
            longitude: loc.longitude || application.longitude || null,
            state: loc.state || application.state || '',
            district: loc.district || application.district || '',
            pincode: loc.pincode || application.pincode || ''
        };

        // Ensure sub-components are present if the location object was found but they were missing
        if (details.location) {
            details.location.state = details.location.state || '';
            details.location.district = details.location.district || '';
            details.location.area = details.location.area || '';
            details.location.pincode = details.location.pincode || '';
        }

        this.selectedApplication.set({ ...application, fullDetails: details });
        this.showDetailModal.set(true);
    }

    // run ai analysis via n8n webhook
    async runAIAnalysis(policy: any) {
        if (!policy || this.isAILoading()) return;

        this.isAILoading.set(true);
        this.aiResult.set(null); // Clear previous result

        try {
            // Document Extraction Logic (Robust)
            let rawDocumentText = '';
            const dividers = '\n\n' + '='.repeat(30) + '\n\n';

            // Collect all possible documents
            const documents = [
                ...(policy.fullDetails?.documents || []),
                ...(policy.documents || [])
            ];

            for (const doc of documents) {
                const fileUrl: string = doc.fileUrl ?? '';
                if (!fileUrl) continue;

                try {
                    const resp = await fetch(fileUrl);
                    if (!resp.ok) throw new Error('Fetch failed');

                    const contentType = resp.headers.get('content-type') ?? '';
                    let content = '';

                    const fileName = doc.fileName || doc.documentType || 'Document';

                    if (contentType.includes('application/pdf') || fileName.toLowerCase().endsWith('.pdf')) {
                        const buffer = await resp.arrayBuffer();
                        content = btoa(new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                        content = `[PDF DOCUMENT: ${fileName}]\nBASE64_DATA: ${content}`;
                    } else if (contentType.includes('text') || fileName.toLowerCase().match(/\.(txt|json|xml)$/)) {
                        content = await resp.text();
                        content = `[TEXT DOCUMENT: ${fileName}]\nCONTENT:\n${content}`;
                    } else {
                        content = `[FILE REFERENCE: ${fileName}]\nURL: ${fileUrl}`;
                    }
                    rawDocumentText += (rawDocumentText ? dividers : '') + content;
                } catch (fetchErr) {
                    console.warn(`Could not fetch document ${doc.fileName}:`, fetchErr);
                }
            }

            const claims = (this.customerClaims() || []).filter(c => c.policyApplicationId === policy.id);
            const payments = (this.unifiedPayments() || []).filter(p => p.applicationId === policy.id);

            const payload = {
                customer: {
                    fullName: policy.fullDetails?.applicant?.fullName || policy.user?.fullName || 'N/A',
                    age: policy.fullDetails?.applicant?.age || policy.age || policy?.user?.age || 0,
                    profession: policy.fullDetails?.applicant?.profession || policy.profession || 'Standard',
                    annualIncome: policy.fullDetails?.applicant?.annualIncome || policy.annualIncome || policy?.user?.annualIncome || 0,
                    smokingHabit: policy.fullDetails?.applicant?.smokingHabit || policy.smokingHabit || 'None',
                    alcoholHabit: policy.fullDetails?.applicant?.alcoholHabit || policy.alcoholHabit || 'None',
                    vehicleType: policy.fullDetails?.applicant?.vehicleType || policy.vehicleType || 'None',
                    travelKmPerMonth: policy.fullDetails?.applicant?.travelKmPerMonth || policy.travelKmPerMonth || 0
                },
                policy: {
                    policyNumber: policy.id || 'N/A',
                    policyCategory: policy.policyCategory || '',
                    tierId: policy.tierId || '',
                    status: policy.status || '',
                    totalCoverageAmount: policy.totalCoverageAmount || 0,
                    remainingCoverageAmount: policy.remainingCoverageAmount || 0,
                    calculatedPremium: policy.calculatedPremium || 0,
                    paymentMode: policy.fullDetails?.paymentMode || 'N/A',
                    startDate: policy.startDate || 'N/A',
                    endDate: policy.expiryDate || 'N/A'
                },
                nominee: policy.fullDetails?.nominee || {},
                location: {
                    address: policy.fullDetails?.location?.address || 'N/A',
                    area: policy.fullDetails?.location?.area || '',
                    state: policy.fullDetails?.location?.state || 'N/A',
                    district: policy.fullDetails?.location?.district || 'N/A',
                    pincode: policy.fullDetails?.location?.pincode || 'N/A',
                    latitude: policy.fullDetails?.location?.latitude || null,
                    longitude: policy.fullDetails?.location?.longitude || null
                },
                claimsSummary: claims.length
                    ? claims.map(c => `${c.incidentType || 'Claim'} | Rs.${c.requestedAmount} | ${c.status} | ${c.submissionDate}`).join('\n')
                    : 'No claims filed',
                paymentsSummary: payments.length
                    ? payments.map(p => `Rs.${p.paidAmount} | ${p.paymentMode} | ${p.status} | ${p.lastPaymentDate || p.createdAt}`).join('\n')
                    : 'No payment records',
                documentsSummary: documents.map(d => d.documentType || d.fileName).join(', '),
                rawDocumentText: rawDocumentText || 'No document content extracted'
            };

            this.agentService.sendToAIAnalyser(payload).subscribe({
                next: (res) => {
                    this.aiResult.set(res);
                    this.isAILoading.set(false);
                },
                error: (err) => {
                    console.error('AI Analysis failed:', err);
                    this.isAILoading.set(false);
                    alert('AI Analysis failed to load. Please try again later.');
                }
            });
        } catch (err) {
            console.error('Document preparation failed:', err);
            this.isAILoading.set(false);
        }
    }

    generatePolicyTimeline(policy: any): any[] {
        if (!policy) return [];
        const slots = [];
        const monthlyAmount = (policy.calculatedPremium || 0) / (policy.paymentMode === 'monthly' ? 12 : policy.paymentMode === 'halfYearly' ? 2 : 1);
        const startDate = new Date(policy.createdAt || new Date());
        for (let i = 0; i < 12; i++) {
            const date = new Date(startDate);
            date.setMonth(date.getMonth() + i);
            const isPaymentMonth = policy.paymentMode === 'monthly' ? true : policy.paymentMode === 'halfYearly' ? i % 6 === 0 : i === 0;
            const amount = isPaymentMonth ? monthlyAmount : 0;
            slots.push({
                monthIndex: i + 1,
                date: date.toISOString(),
                amount: isPaymentMonth ? monthlyAmount : 0,
                status: isPaymentMonth ? 'Scheduled' : 'Active',
                isPaymentMonth
            });
        }
        return slots;
    }

    reviewApplication(status: 'Approved' | 'Rejected') {
        const app = this.selectedApplication();
        if (!app) return;

        this.isProcessing.set(true);
        this.agentService.reviewRequest(app.id, status).subscribe({
            next: (res) => {
                this.isProcessing.set(false);
                this.showDetailModal.set(false);
                this.showUnifiedDetail.set(false); // Also close unified modal
                this.message.set({ type: 'success', text: `Policy ${status} successfully!` });
                this.loadPolicyRequests();
                setTimeout(() => this.message.set({ type: '', text: '' }), 3000);
            },
            error: (err) => {
                this.isProcessing.set(false);
                this.message.set({ type: 'error', text: 'Operation failed!' });
            }
        });
    }

    viewClaimDetails(claim: any) {
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

                const details = normalize(raw);
                if (details) {
                    details.applicant = normalize(details.applicant || details.primaryApplicant || raw.Applicant || raw.PrimaryApplicant);
                    details.nominee = normalize(details.nominee || raw.Nominee);
                    details.familyMembers = details.familyMembers || raw.FamilyMembers;
                    details.paymentMode = details.paymentMode || raw.PaymentMode;
                }
                claim.fullPolicyDetails = details;

                // Enrich with coverage
                claim.totalCoverage = claim.policy?.totalCoverageAmount || 0;
                claim.remainingCoverage = claim.policy?.remainingCoverageAmount || 0;
            } catch (e) {
                console.error('Failed to parse claim policy data', e);
            }
        }
        this.selectedClaim.set({
            ...claim,
            assignedClaimOfficer: claim.assignedOfficer // Map backend property to frontend expected name
        });
        this.showClaimModal.set(true);
    }

    viewUnifiedDetails(item: any, type: 'policy' | 'claim' = 'policy') {
        let policy: any;
        let claim: any;

        if (type === 'policy') {
            policy = item;
            this.selectedApplication.set(policy);
            claim = this.customerClaims().find(c => c.policyId === policy.id || c.policyApplicationId === policy.id);
        } else {
            claim = item;
            policy = claim.policy || this.policyRequests().find(p => p.id === (claim.policyId || claim.policyApplicationId)) || this.myCustomers().find(p => p.id === (claim.policyId || claim.policyApplicationId));
        }

        // Aggregate complete details
        const details: any = {
            customer: policy?.user || claim?.user,
            policy: {
                ...policy,
                totalCoverage: policy?.totalCoverageAmount || 0,
                remainingCoverage: policy?.remainingCoverageAmount || 0
            },
            agent: policy?.assignedAgent,
            claim: claim ? {
                ...claim,
                totalCoverage: policy?.totalCoverageAmount || 0,
                remainingCoverage: policy?.remainingCoverageAmount || 0
            } : null,
            claimOfficer: claim?.assignedOfficer || claim?.assignedClaimOfficer,
            payments: policy?.payments || []
        };

        // Proactively fetch claim if missing and policy ID exists
        if (!claim && policy?.id) {
            this.claimService.getClaimByPolicyId(policy.id).subscribe({
                next: (fetchedClaim) => {
                    if (fetchedClaim) {
                        // Enrich and update side panel
                        const enrichedClaim = {
                            ...fetchedClaim,
                            totalCoverage: policy?.totalCoverageAmount || 0,
                            remainingCoverage: policy?.remainingCoverageAmount || 0
                        };
                        details.claim = enrichedClaim;
                        details.claimOfficer = fetchedClaim.assignedOfficer || fetchedClaim.assignedClaimOfficer;
                        this.selectedUnifiedDetail.set({ ...details });
                    }
                }
            });
        }

        let raw: any = {};
        try {
            raw = typeof policy?.applicationDataJson === 'string'
                ? JSON.parse(policy.applicationDataJson)
                : (policy?.applicationDataJson || {});
        } catch (e) { }

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

        // Match the robust nominee mapping used in Admin
        const n = normalize(fullDetails.nominee || raw.Nominee) || {};
        fullDetails.nominee = {
            name: n.name || n.nomineeName || 'N/A',
            relationship: n.relationship || n.nomineeRelationship || '--',
            email: n.email || n.nomineeEmail || '--',
            phone: n.phone || n.nomineePhone || '--',
            bankAccount: n.bankAccount || n.nomineeBankAccountNumber || n.bankAccountNumber || '--',
            ifsc: n.ifsc || n.nomineeIfsc || '--'
        };

        // Enrich applicant details
        let applicant = normalize(fullDetails.applicant || raw.Applicant) || {};
        details.applicant = {
            ...applicant,
            fullName: applicant.fullName || policy?.user?.fullName || policy?.user?.userName || 'N/A',
            vehicleType: applicant.vehicleType || policy?.vehicleType || 'None',
            travelKmPerMonth: applicant.travelKmPerMonth || policy?.travelKmPerMonth || 0
        };

        fullDetails.applicant = details.applicant;
        fullDetails.location = normalize(fullDetails.location || raw.Location || raw.location) || {
            address: 'No address provided',
            latitude: null,
            longitude: null,
            state: '',
            district: '',
            area: '',
            pincode: ''
        };

        // Ensure sub-components are present
        if (fullDetails.location) {
            fullDetails.location.state = fullDetails.location.state || '';
            fullDetails.location.district = fullDetails.location.district || '';
            fullDetails.location.area = fullDetails.location.area || '';
            fullDetails.location.pincode = fullDetails.location.pincode || '';
        }

        details.policy.fullDetails = fullDetails;

        // Sync sum insured and premium metrics from config if available
        this.policyService.getConfiguration().subscribe(config => {
            if (config) {
                const cat = config.policyCategories?.find((c: any) => c.categoryId === policy.policyCategory);
                const tier = cat?.tiers?.find((t: any) => t.tierId === policy.tierId);
                details.policy.coverageAmount = tier?.baseCoverageAmount || (policy.totalCoverageAmount || policy.sumInsured || 0);
                details.policy.policyName = tier?.tierName || policy.tierId;
                details.policy.basePremiumAmount = tier?.basePremiumAmount || 0;

                // Recalculate monthly split if calculatedPremium changed
                details.policy.monthlyPremium = (policy.calculatedPremium || 0) / 12;
                this.selectedUnifiedDetail.set({ ...details });
            }
        });

        // Add monthly premium calculation initially
        details.policy.monthlyPremium = (policy.calculatedPremium || 0) / 12;

        this.selectedUnifiedDetail.set(details);
        this.showUnifiedDetail.set(true);
    }

    // Email Feature State
    emailFormSubject = signal('');
    emailFormMessage = signal('');
    includePaymentReminder = signal(true);
    selectedCustomerForEmail = signal<any | null>(null);

    loadUnifiedPayments() {
        this.adminService.getUnifiedPayments().subscribe({
            next: (data) => this.unifiedPayments.set(data),
            error: (err) => console.error('Failed to load unified payments', err)
        });
    }

    openInvoiceModal(payment: any) {
        this.selectedPayment.set(payment);
        this.showInvoiceModal.set(true);
    }

    generateInvoicePDF(payment: any) {
        const doc = new jsPDF();
        const primaryColor = [34, 197, 94]; // #22c55e
        const secondaryColor = [15, 23, 42]; // #0f172a
        const accentColor = [74, 222, 128]; // #4ade80

        // 1. ADD CUSTOM LOGO (Diamonds)
        const drawDiamond = (x: number, y: number, size: number, color: number[]) => {
            doc.setFillColor(color[0], color[1], color[2]);
            doc.setDrawColor(color[0], color[1], color[2]);
            doc.lines(
                [[size, size], [size, -size], [-size, -size]],
                x, y - size, [1, 1], 'FD', true
            );
        };

        // Draw the two overlapping diamonds from the landing page logo
        drawDiamond(25, 20, 4, primaryColor);
        drawDiamond(29, 24, 4, accentColor);

        // 2. HEADER BRANDING
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text('AcciSure', 38, 23);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('PROTECT TODAY. BRIGHTER TOMORROW.', 38, 28);

        // Right-aligned Invoice Label
        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('INVOICE', 190, 25, { align: 'right' });

        // Decorative Line
        doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setLineWidth(1.5);
        doc.line(20, 35, 190, 35);

        // 3. INVOICE INFO & BILL TO
        doc.setFontSize(10);
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);

        // Left Side: Bill To
        doc.setFont('helvetica', 'bold');
        doc.text('BILL TO:', 20, 50);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`${payment.customerEmail || 'Valued Customer'}`, 20, 56);
        doc.text('India', 20, 61);

        // Right Side: Invoice Details
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text('INVOICE DETAILS:', 130, 50);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(`Invoice ID:`, 130, 56);
        doc.text(`Date:`, 130, 61);
        doc.text(`Status:`, 130, 66);
        doc.text(`Transaction ID:`, 130, 72);

        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setFont('helvetica', 'bold');
        doc.text(`INV-${payment.transactionId?.substring(0, 8).toUpperCase() || 'N/A'}`, 160, 56);
        doc.text(`${new Date().toLocaleDateString()}`, 160, 61);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('PAID', 160, 66);

        doc.setTextColor(71, 85, 105);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`${payment.transactionId || 'Pending'}`, 130, 77); // Shifted down and smaller to avoid overlap
        doc.setFontSize(10); // Reset for table

        // 4. MAIN TABLE
        autoTable(doc, {
            startY: 85,
            head: [['DESCRIPTION', 'POLICY DETAILS', 'AMOUNT']],
            body: [
                ['Insurance Premium', `${payment.policyCategory} - ${payment.tierId}`, `INR ${payment.premiumAmount.toLocaleString()}`],
                ['Plan Coverage', `Individual / Family Group`, `INR ${payment.totalCoverage.toLocaleString()}`],
                ['Current Status', `Active / Distributed`, payment.paymentMode?.toUpperCase() || 'DIGITAL'],
                ['Agent Commission', 'Processing Fee Included', 'INCL.'],
            ],
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontSize: 10,
                fontStyle: 'bold',
                halign: 'center',
                cellPadding: 5
            },
            bodyStyles: {
                fontSize: 9,
                cellPadding: 4,
                textColor: [51, 65, 85]
            },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 50 },
                2: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] }
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252]
            }
        });

        const tableEndY = (doc as any).lastAutoTable.finalY + 15;

        // 5. SUMMARY & TOTAL
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(120, tableEndY, 190, tableEndY);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text('Total Amount Paid:', 120, tableEndY + 10);
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text(`INR ${payment.paidAmount?.toLocaleString() || payment.premiumAmount.toLocaleString()}`, 190, tableEndY + 10, { align: 'right' });

        // 6. TERMS & CONDITIONS (Norms)
        const footerY = 230;
        doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.setLineWidth(0.5);
        doc.line(20, footerY, 190, footerY);

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
        doc.text('TERMS AND CONDITIONS:', 20, footerY + 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const terms = [
            '1. This invoice is a valid legal document for premium payment acknowledgement.',
            '2. All insurance coverage is subject to the successful realization of the premium amount.',
            '3. Please refer to your policy document for detailed coverage, exclusions, and claim procedures.',
            '4. AcciSure Insurance is not liable for any delays caused by third-party payment gateways.',
            '5. For any disputes or support, please contact us at support@accisure.com quoting your Transaction ID.'
        ];
        terms.forEach((term, index) => {
            doc.text(term, 20, footerY + 14 + (index * 4));
        });

        // 7. FOOTER & SIGNATURE
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('This is a computer-generated invoice and requires no physical signature.', 105, 275, { align: 'center' });

        // Brand Footer
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.text('AcciSure Insurance - Protecting Your Brighter Tomorrow', 105, 285, { align: 'center' });

        doc.save(`AcciSure_Invoice_${payment.transactionId?.substring(0, 8) || 'Doc'}.pdf`);
    }

    logout() {
        this.authService.logout();
    }

    // Email Methods
    openEmailForm(customer: any) {
        this.selectedCustomerForEmail.set(customer);
        this.emailFormSubject.set(`Policy Notification - ${customer.policyNumber || 'General'}`);
        this.emailFormMessage.set(`Dear ${customer.user?.email?.split('@')[0] || 'Customer'},\n\nI hope this email finds you well. I am reaching out to provide you with an update regarding your policy.`);
    }

    sendEmail() {
        const customer = this.selectedCustomerForEmail();
        if (!customer) return;

        this.isProcessing.set(true);
        const htmlBody = this.compileEmailHtml(customer);
        const payload = {
            toEmail: customer.user?.email,
            subject: this.emailFormSubject(),
            htmlBody: htmlBody
        };

        this.agentService.sendAgentEmail(payload).subscribe({
            next: () => {
                this.isProcessing.set(false);
                this.message.set({ type: 'success', text: 'Email sent successfully via n8n!' });
                this.selectedCustomerForEmail.set(null);
                setTimeout(() => this.message.set({ type: '', text: '' }), 3000);
            },
            error: (err) => {
                this.isProcessing.set(false);
                this.message.set({ type: 'error', text: 'Failed to send email. Check console for details.' });
                console.error(err);
            }
        });
    }

    private compileEmailHtml(cust: any): string {
        const agentName = this.user.email?.split('@')[0] || 'Agent';
        const agentEmail = this.user.email || '';
        const customerName = cust.user?.email?.split('@')[0] || 'Customer';
        const agentMessage = this.emailFormMessage().replace(/\n/g, '<br>');

        let paymentSection = '';
        if (this.includePaymentReminder()) {
            paymentSection = `
                <!-- Payment Breakdown -->
                <div style="margin-top: 25px; padding: 20px; background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                    <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Payment & Policy Breakdown</h4>
                    <div style="margin-bottom: 10px;">
                        <span style="color: #64748b; font-size: 12px;">Premium Amount:</span>
                        <strong style="display: block; color: #1e293b; font-size: 16px;">₹${cust.calculatedPremium?.toLocaleString() || cust.monthlyPremium?.toLocaleString() || cust.nextPaymentAmount?.toLocaleString() || 0}</strong>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span style="color: #64748b; font-size: 12px;">Payment Mode:</span>
                        <strong style="display: block; color: #1e293b; font-size: 14px; text-transform: capitalize;">${cust.paymentMode || 'Monthly'}</strong>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <span style="color: #64748b; font-size: 12px;">Due Date:</span>
                        <strong style="display: block; color: #1e293b; font-size: 14px;">${cust.nextPaymentDate ? new Date(cust.nextPaymentDate).toLocaleDateString() : 'N/A'}</strong>
                    </div>
                    <div style="padding-top: 10px; border-top: 1px dashed #cbd5e1;">
                         <p style="margin: 0; color: #475569; font-size: 11px; line-height: 1.4;">
                            * Even if the button below is hidden by your email client, you can use the details above for your records.
                         </p>
                    </div>
                </div>
            `;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 30px; text-align: center; color: #ffffff; }
        .content { padding: 40px; }
        .card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin: 20px 0; }
        .btn { display: inline-block; padding: 12px 30px; background-color: #4f46e5; color: #ffffff !important; text-decoration: none; border-radius: 100px; font-weight: bold; font-size: 14px; margin: 20px 0; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.4); }
        .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        .label { color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
        .value { color: #1e293b; font-weight: 600; font-size: 14px; margin-bottom: 12px; }
        .grid { display: block; }
        .col { margin-bottom: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0; font-weight: 900; letter-spacing: -1px; font-size: 24px;">Insurance<span style="color: #f97316;">Platform</span></h2>
            <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 12px; text-transform: uppercase; font-weight: bold; letter-spacing: 2px;">Policy Notification</p>
        </div>
        <div class="content">
            <h3 style="color: #1e293b; font-size: 18px; margin-top: 0;">Hello ${customerName},</h3>
            <p style="color: #475569; font-size: 15px; margin-bottom: 30px;">${agentMessage}</p>

            <div class="card">
                <h4 style="margin: 0 0 20px 0; color: #1e293b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">Policy Highlights</h4>
                <div class="grid">
                    <div class="col"><span class="label">Policy Type</span><div class="value">${cust.policyCategory || 'Standard'}</div></div>
                    <div class="col"><span class="label">Tier / Plan</span><div class="value">${cust.tierId || 'Basic'}</div></div>
                    <div class="col"><span class="label">Policy Number</span><div class="value">${cust.policyNumber || (cust.id ? 'PL-' + cust.id.substring(0, 8).toUpperCase() : 'N/A')}</div></div>
                    <div class="col"><span class="label">Whole Coverage</span><div class="value">₹${cust.totalCoverageAmount?.toLocaleString() || cust.coverageAmount?.toLocaleString() || 0}</div></div>
                    <div class="col"><span class="label">Current Coverage</span><div class="value">₹${cust.remainingCoverageAmount?.toLocaleString() || (cust.totalCoverageAmount?.toLocaleString() || cust.coverageAmount?.toLocaleString() || 0)}</div></div>
                    <div class="col"><span class="label">Status</span><div class="value" style="color: #10b981;">● ${cust.status || 'Active'}</div></div>
                </div>
            </div>

            <div style="margin: 30px 0;">
                <h4 style="margin: 0 0 15px 0; color: #1e293b; font-size: 13px;">Customer & Agent Context</h4>
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td width="50%" style="padding-right: 15px;">
                            <span class="label">Customer Details</span>
                            <div class="value" style="font-size: 12px;">${cust.user?.email}</div>
                        </td>
                        <td width="50%">
                            <span class="label">Agent In-Charge</span>
                            <div class="value" style="font-size: 12px;">${agentName}<br>${agentEmail}</div>
                        </td>
                    </tr>
                </table>
            </div>

            <center>
                <a href="#" class="btn">View Payment Details</a>
            </center>

            ${paymentSection}

        </div>
        <div class="footer">
            &copy; 2024 AcciSure. All rights reserved.<br>
            Secure Policy Management Service.
        </div>
    </div>
</body>
</html>
        `;
    }
}
