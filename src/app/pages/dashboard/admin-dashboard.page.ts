import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { ClaimService } from '../../services/claim.service';
import { PolicyService } from '../../services/policy.service';
import { NotificationPanelComponent } from '../../components/notification-panel/notification-panel.component';
import { Chart, registerables } from 'chart.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(...registerables);

@Component({
    selector: 'app-admin-dashboard',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NotificationPanelComponent],
    templateUrl: './admin-dashboard.page.html'
})
export class AdminDashboardPage implements OnInit {
    private authService = inject(AuthService);
    private adminService = inject(AdminService);
    private claimService = inject(ClaimService);
    private policyService = inject(PolicyService);
    private fb = inject(FormBuilder);

    protected readonly JSON = JSON;

    parseJson(json: string | null | undefined): any {
        try {
            return json ? JSON.parse(json) : null;
        } catch {
            return null;
        }
    }

    user = this.authService.getUser();
    activeSection = signal('dashboard'); // dashboard, agents, officers, analysis-users, analysis-policies, analysis-commands, analysis-payments, email-automation
    isLoading = signal(false);
    message = signal({ type: '', text: '' });

    // Data
    adminStats = signal<any>(null);
    recentActivities: any[] = [];
    agents: any[] = [];
    officers: any[] = [];
    policyRequests = signal<any[]>([]);
    agentsWithLoad = signal<any[]>([]);
    pendingClaims = signal<any[]>([]);
    claimOfficersWithWorkload = signal<any[]>([]);

    // Complete Analysis Data
    allUsers = signal<any[]>([]);
    allClaims = signal<any[]>([]);
    allPolicyApps = signal<any[]>([]);
    config = signal<any>(null);
    unifiedPayments = signal<any[]>([]);

    // Chart instances
    private charts: Chart[] = [];

    // UI State
    showAssignModal = signal(false);
    showAssignOfficerModal = signal(false);
    selectedApplicationId = signal<string | null>(null);
    selectedClaimId = signal<string | null>(null);
    showUnifiedDetail = signal(false);
    selectedUnifiedDetail = signal<any>(null);
    selectedPayment = signal<any>(null);
    showInvoiceModal = signal(false);
    isAssigning = signal(false);
    showEmailModal = signal(false);
    selectedUserForEmail = signal<any>(null);
    isSendingEmail = signal(false);

    // Forms
    agentForm = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(100)]],
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        bankAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]]
    });

    officerForm = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(100)]],
        emailId: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        bankAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{16}$/)]]
    });

    emailForm = this.fb.group({
        toEmail: ['', [Validators.required, Validators.email]],
        subject: ['', [Validators.required, Validators.minLength(5)]],
        message: ['', [Validators.required, Validators.minLength(10)]]
    });

    ngOnInit() {
        this.loadData();
    }

    loadData() {
        this.loadAdminStats();
        this.loadAgents();
        this.loadOfficers();
        this.loadPolicyRequests();
        this.loadPendingClaims();
        this.loadAllUsers();
        this.loadAllClaims();
        this.loadConfig();
        this.loadUnifiedPayments();
    }

    loadConfig() {
        this.policyService.getConfiguration().subscribe({
            next: (data) => this.config.set(data),
            error: (err) => console.error('Failed to load config', err)
        });
    }

    loadAdminStats() {
        this.adminService.getAdminStats().subscribe({
            next: (data: any) => this.adminStats.set(data),
            error: (err: any) => console.error('Failed to load admin stats', err)
        });
    }

    loadAllUsers() {
        this.adminService.getAllUsers().subscribe({
            next: (data: any) => this.allUsers.set(data),
            error: (err: any) => console.error('Failed to load all users', err)
        });
    }

    loadAllClaims() {
        this.adminService.getAllClaims().subscribe({
            next: (data: any) => {
                this.allClaims.set(data);
                this.initCharts();
            },
            error: (err: any) => console.error('Failed to load all claims', err)
        });
    }

    loadPolicyRequests() {
        this.adminService.getPolicyRequests().subscribe({
            next: (data: any) => {
                this.policyRequests.set(data);
                this.initCharts();
            },
            error: (err: any) => console.error('Failed to load policy requests', err)
        });
    }

    loadUnifiedPayments() {
        this.adminService.getUnifiedPayments().subscribe({
            next: (data) => this.unifiedPayments.set(data),
            error: (err) => console.error('Failed to load unified payments', err)
        });
    }

    private initCharts() {
        if (this.activeSection() !== 'dashboard') return;
        setTimeout(() => {
            this.destroyCharts();
            this.createBestPolicyChart();
            this.createBestAgentChart();
            this.createRatioChart();
            this.createClaimsChart();
        }, 100);
    }

    private destroyCharts() {
        this.charts.forEach(c => c.destroy());
        this.charts = [];
    }

    private createBestPolicyChart() {
        const canvas = document.getElementById('bestPolicyChart') as HTMLCanvasElement;
        if (!canvas) return;
        const apps = this.policyRequests();
        const categories: any = {};
        apps.forEach(a => {
            categories[a.policyCategory] = (categories[a.policyCategory] || 0) + 1;
        });
        this.charts.push(new Chart(canvas, {
            type: 'pie',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: ['#4f46e5', '#f97316', '#10b981', '#6366f1', '#ec4899']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { weight: 'bold', size: 10 } } }
                }
            }
        }));
    }

    private createBestAgentChart() {
        const canvas = document.getElementById('bestAgentChart') as HTMLCanvasElement;
        if (!canvas) return;
        const apps = this.policyRequests();
        const agentPerf: any = {};
        apps.forEach(a => {
            if (a.assignedAgent) {
                const name = a.assignedAgent.email.split('@')[0];
                agentPerf[name] = (agentPerf[name] || 0) + 1;
            }
        });
        this.charts.push(new Chart(canvas, {
            type: 'bar',
            data: {
                labels: Object.keys(agentPerf),
                datasets: [{
                    label: 'Policies Assigned',
                    data: Object.values(agentPerf),
                    backgroundColor: '#6366f1',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { display: false } },
                    x: { grid: { display: false } }
                }
            }
        }));
    }

    private createRatioChart() {
        const canvas = document.getElementById('ratioChart') as HTMLCanvasElement;
        if (!canvas) return;
        const totalUsers = this.allUsers().length;
        const totalAgents = this.agents.length;
        const totalOfficers = this.officers.length;
        this.charts.push(new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Customers', 'Agents', 'Officers'],
                datasets: [{
                    data: [totalUsers - totalAgents - totalOfficers, totalAgents, totalOfficers],
                    backgroundColor: ['#4f46e5', '#f97316', '#64748b']
                }]
            },
            options: {
                responsive: true,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { font: { weight: 'bold', size: 10 } } }
                }
            }
        }));
    }

    private createClaimsChart() {
        const canvas = document.getElementById('claimsChart') as HTMLCanvasElement;
        if (!canvas) return;
        const claims = this.allClaims();
        const statusCounts: any = {};
        claims.forEach(c => {
            statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
        });
        this.charts.push(new Chart(canvas, {
            type: 'polarArea',
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts),
                    backgroundColor: ['#10b981', '#f97316', '#ef4444', '#6366f1']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { weight: 'bold', size: 10 } } }
                }
            }
        }));
    }

    setSection(section: string) {
        this.activeSection.set(section);
        this.message.set({ type: '', text: '' });
        if (section === 'dashboard') {
            this.initCharts();
        } else if (section === 'analysis-payments') {
            this.loadUnifiedPayments();
            this.destroyCharts();
        } else if (section === 'analysis-commands') {
            this.loadAllClaims();
            this.destroyCharts();
        } else if (section === 'email-automation') {
            this.loadAllUsers();
            this.destroyCharts();
        } else {
            this.destroyCharts();
        }
    }

    loadAgents() {
        this.adminService.getAgents().subscribe({
            next: (data) => this.agents = data,
            error: (err) => console.error('Failed to load agents', err)
        });
    }

    loadOfficers() {
        this.adminService.getClaimOfficers().subscribe({
            next: (data) => this.officers = data,
            error: (err) => console.error('Failed to load officers', err)
        });
    }

    openAssignModal(applicationId: string) {
        this.selectedApplicationId.set(applicationId);
        this.showAssignModal.set(true);
        this.isLoading.set(true);
        this.adminService.getAgentsWithLoad().subscribe({
            next: (data) => {
                this.agentsWithLoad.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load agents with load', err);
                this.isLoading.set(false);
            }
        });
    }

    assignAgent(agentId: string) {
        const appId = this.selectedApplicationId();
        if (!appId) return;
        this.isAssigning.set(true);
        this.adminService.assignAgent(appId, agentId).subscribe({
            next: (res) => {
                this.isAssigning.set(false);
                this.showAssignModal.set(false);
                this.message.set({ type: 'success', text: 'Agent assigned successfully!' });
                this.loadPolicyRequests();
                setTimeout(() => this.message.set({ type: '', text: '' }), 3000);
            },
            error: (err) => {
                this.isAssigning.set(false);
                this.message.set({ type: 'error', text: 'Assignment failed!' });
            }
        });
    }

    loadPendingClaims() {
        this.claimService.getPendingClaims().subscribe({
            next: (data) => this.pendingClaims.set(data),
            error: (err) => console.error('Failed to load pending claims', err)
        });
    }

    openAssignOfficerModal(claimId: string) {
        this.selectedClaimId.set(claimId);
        this.showAssignOfficerModal.set(true);
        this.isLoading.set(true);
        this.claimService.getClaimOfficers().subscribe({
            next: (data) => {
                this.claimOfficersWithWorkload.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load claim officers', err);
                this.isLoading.set(false);
            }
        });
    }

    assignOfficer(officerId: string) {
        const claimId = this.selectedClaimId();
        if (!claimId) return;
        this.isAssigning.set(true);
        this.claimService.assignOfficer(claimId, officerId).subscribe({
            next: (res) => {
                this.isAssigning.set(false);
                this.showAssignOfficerModal.set(false);
                this.message.set({ type: 'success', text: 'Claim Officer assigned successfully!' });
                this.loadPendingClaims();
                setTimeout(() => this.message.set({ type: '', text: '' }), 3000);
            },
            error: (err) => {
                this.isAssigning.set(false);
                this.message.set({ type: 'error', text: 'Officer assignment failed!' });
            }
        });
    }

    registerAgent() {
        if (this.agentForm.valid) {
            this.isLoading.set(true);
            this.adminService.createAgent(this.agentForm.value).subscribe({
                next: (res: any) => {
                    this.isLoading.set(false);
                    if (res.status === 'Success') {
                        this.message.set({ type: 'success', text: res.message });
                        this.agentForm.reset();
                        this.loadAgents();
                    } else {
                        this.message.set({ type: 'error', text: res.message });
                    }
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.message.set({ type: 'error', text: 'Registration failed!' });
                }
            });
        }
    }

    registerOfficer() {
        if (this.officerForm.valid) {
            this.isLoading.set(true);
            this.adminService.createClaimOfficer(this.officerForm.value).subscribe({
                next: (res: any) => {
                    this.isLoading.set(false);
                    if (res.status === 'Success') {
                        this.message.set({ type: 'success', text: res.message });
                        this.officerForm.reset();
                        this.loadOfficers();
                    } else {
                        this.message.set({ type: 'error', text: res.message });
                    }
                },
                error: (err) => {
                    this.isLoading.set(false);
                    this.message.set({ type: 'error', text: 'Registration failed!' });
                }
            });
        }
    }

    viewUnifiedDetails(item: any, type: 'policy' | 'claim' = 'policy') {
        let policy: any;
        let claim: any;
        if (type === 'policy') {
            policy = item;
            claim = this.allClaims().find(c => c.policyId === policy.id);
        } else {
            claim = item;
            policy = claim.policy || this.policyRequests().find(p => p.id === claim.policyId);
        }
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
            claimOfficer: claim?.assignedOfficer,
            payments: policy?.payments || []
        };
        if (policy?.applicationDataJson) {
            try {
                const raw = typeof policy.applicationDataJson === 'string'
                    ? JSON.parse(policy.applicationDataJson)
                    : policy.applicationDataJson;

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

                // Extract applicant with fallback to user object
                let applicant = normalize(fullDetails.applicant || fullDetails.primaryApplicant || raw.Applicant || raw.PrimaryApplicant);
                if (!applicant || !applicant.fullName) {
                    applicant = {
                        ...applicant,
                        fullName: policy.user?.fullName || policy.user?.userName || 'N/A'
                    };
                }

                fullDetails.applicant = applicant;
                fullDetails.nominee = normalize(fullDetails.nominee || raw.Nominee) || { nomineeName: '', nomineeEmail: '', nomineePhone: '' };
                fullDetails.medicalProfile = normalize(fullDetails.medicalProfile || raw.MedicalProfile);
                fullDetails.lifestyle = normalize(fullDetails.lifestyle || raw.Lifestyle);
                fullDetails.incident = normalize(fullDetails.incident || fullDetails.incidentVerification || raw.Incident || raw.IncidentVerification);

                details.policy.fullDetails = fullDetails;

                if (this.config()) {
                    const cat = this.config().policyCategories?.find((c: any) => c.categoryId === policy.policyCategory);
                    const tier = cat?.tiers?.find((t: any) => t.tierId === policy.tierId);
                    details.policy.coverageAmount = tier?.baseCoverageAmount || (policy.sumInsured || 0);
                }
            } catch (e) {
                console.error('Failed to parse policy data', e);
            }
        }
        this.selectedUnifiedDetail.set(details);
        this.showUnifiedDetail.set(true);
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

    deleteUser(userId: string) {
        if (confirm('Are you sure you want to delete this user?')) {
            this.adminService.deleteUser(userId).subscribe({
                next: (res: any) => {
                    if (res.status === 'Success') {
                        this.loadData();
                    } else {
                        alert(res.message);
                    }
                },
                error: (err) => alert('Delete failed!')
            });
        }
    }

    openEmailForm(user: any) {
        this.selectedUserForEmail.set(user);
        this.emailForm.patchValue({
            toEmail: user.email,
            subject: 'Official Communication from AcciSure Admin',
            message: `Dear ${user.fullName || user.userName},\n\n`
        });
        this.showEmailModal.set(true);
    }

    sendEmail() {
        if (this.emailForm.valid) {
            this.isSendingEmail.set(true);
            const form = this.emailForm.value;
            const payload = {
                toEmail: form.toEmail!,
                subject: form.subject!,
                htmlBody: `
                    <div style="font-family: sans-serif; padding: 20px; color: #0f172a;">
                        <h2 style="color: #f97316;">AcciSure Insurance</h2>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p>${form.message?.replace(/\n/g, '<br>')}</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                        <p style="font-size: 12px; color: #64748b;">This is an automated communication from the AcciSure Administration Department.</p>
                    </div>
                `
            };

            this.adminService.sendAdminEmail(payload).subscribe({
                next: () => {
                    this.isSendingEmail.set(false);
                    this.showEmailModal.set(false);
                    this.message.set({ type: 'success', text: 'Email sent successfully via automation!' });
                    setTimeout(() => this.message.set({ type: '', text: '' }), 3000);
                },
                error: (err) => {
                    this.isSendingEmail.set(false);
                    this.message.set({ type: 'error', text: 'Failed to trigger email automation.' });
                }
            });
        }
    }

    logout() {
        this.authService.logout();
    }
}
