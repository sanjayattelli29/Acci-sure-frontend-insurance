import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ClaimService } from '../../services/claim.service';
import { PolicyService } from '../../services/policy.service';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { AdminService } from '../../services/admin.service';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { UserOptions } from 'jspdf-autotable';
import { NotificationPanelComponent } from '../../components/notification-panel/notification-panel.component';
import { HttpClient } from '@angular/common/http';

// n8n webhook for ai claim insights
const N8N_WEBHOOK_URL = 'https://nextglidesol.app.n8n.cloud/webhook/claim-ai-insights';

// ai insights response from n8n webhook
interface AIInsightsResponse {
    summaryPoints: string[];   // 5 bullet points
    riskScore: number;         // 0-100 risk assessment
    suggestedAmountMin: number;
    suggestedAmountMax: number;
}

// register chartjs for claim stats graphs
Chart.register(...registerables);

// claims officer dashboard for reviewing claims
// includes ai assistance for claim assessment
@Component({
    selector: 'app-claims-officer-dashboard',
    standalone: true,
    imports: [CommonModule, FormsModule, NotificationPanelComponent],
    templateUrl: './claims-officer-dashboard.page.html'
})
export class ClaimsOfficerDashboardPage implements OnInit {
    // inject services for claim operations
    private authService = inject(AuthService);
    private claimService = inject(ClaimService);
    private policyService = inject(PolicyService);
    private adminService = inject(AdminService);
    private http = inject(HttpClient); // for ai webhook call

    // logged in officer user
    user = this.authService.getUser();
    // claims assigned to officer from backend
    myRequests = signal<any[]>([]);
    isLoading = signal(false);
    config = signal<any>(null); // policy config
    activeSection = signal('dashboard');
    sidebarOpen = signal(false);

    // payment records signals
    unifiedPayments = signal<any[]>([]);
    selectedPayment = signal<any | null>(null);
    showInvoiceModal = signal(false);

    // computed stats from claims data
    stats = computed(() => {
        const requests = this.myRequests();
        return {
            total: requests.length,
            pending: requests.filter(r => r.status === 'PendingAssessment' || r.status === 'Assigned').length,
            approved: requests.filter(r => r.status === 'Approved').length,
            rejected: requests.filter(r => r.status === 'Rejected').length
        };
    });

    // claim review modal state
    selectedClaim = signal<any | null>(null);
    showReviewModal = signal(false);
    reviewForm = {
        status: 'Approved',
        remarks: '',
        approvedAmount: 0
    };

    // claim history detail modal
    showHistoryDetailModal = signal(false);
    selectedHistoryClaim = signal<any | null>(null);

    // ai insights state for claim assessment from n8n
    isAILoading = signal(false);
    aiInsights = signal<AIInsightsResponse | null>(null);
    aiError = signal<string | null>(null);

    // chartjs instances
    private charts: Chart[] = [];

    // load claims on init
    ngOnInit() {
        this.loadRequests();
        this.loadConfig();
    }

    // load policy configuration from backend
    loadConfig() {
        this.policyService.getConfiguration().subscribe({
            next: (data) => this.config.set(data),
            error: (err) => console.error('Failed to load config', err)
        });
    }

    // load claims assigned to this officer from backend
    loadRequests() {
        this.isLoading.set(true);
        this.claimService.getOfficerRequests().subscribe({
            next: (data) => {
                this.myRequests.set(data);
                this.isLoading.set(false);
                this.initCharts();
            },
            error: (err) => {
                console.error('Failed to load requests', err);
                this.isLoading.set(false);
            }
        });
    }

    private initCharts() {
        if (this.activeSection() !== 'dashboard') return;
        setTimeout(() => {
            this.destroyCharts();
            this.createSettlementChart();
            this.createClaimStatusChart();
        }, 100);
    }

    private destroyCharts() {
        this.charts.forEach(c => c.destroy());
        this.charts = [];
    }

    private createSettlementChart() {
        const canvas = document.getElementById('settlementChart') as HTMLCanvasElement;
        if (!canvas) return;

        const approved = this.myRequests().filter(r => r.status === 'Approved');
        const labels = approved.map(r => new Date(r.processedDate).toLocaleDateString());
        const data = approved.map(r => r.approvedAmount);

        this.charts.push(new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Settlement Amount',
                    data,
                    borderColor: '#10b981',
                    backgroundColor: '#10b98120',
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true },
                    x: { grid: { display: false } }
                }
            }
        }));
    }

    private createClaimStatusChart() {
        const canvas = document.getElementById('claimStatusChart') as HTMLCanvasElement;
        if (!canvas) return;

        const stats = this.stats();
        this.charts.push(new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Rejected', 'Pending'],
                datasets: [{
                    data: [stats.approved, stats.rejected, stats.pending],
                    backgroundColor: ['#10b981', '#ef4444', '#f97316']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
                }
            }
        }));
    }

    openReviewModal(claim: any) {
        // Parse and normalize JSON data from the policy application
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

                details = normalize(raw);
                if (details) {
                    details.applicant = normalize(details.applicant || details.primaryApplicant || raw.Applicant || raw.PrimaryApplicant);
                    details.nominee = normalize(details.nominee || raw.Nominee);
                    details.medicalProfile = normalize(details.medicalProfile || raw.MedicalProfile);
                    details.lifestyle = normalize(details.lifestyle || raw.Lifestyle);
                    details.incident = normalize(details.incident || details.incidentVerification || raw.Incident || raw.IncidentVerification);
                    details.familyMembers = details.familyMembers || raw.FamilyMembers;
                    details.paymentMode = details.paymentMode || raw.PaymentMode;
                }

                // Calculate Sum Insured from config
                if (this.config()) {
                    const cat = this.config().policyCategories.find((c: any) => c.categoryId === claim.policy?.policyCategory);
                    const tier = cat?.tiers.find((t: any) => t.tierId === claim.policy?.tierId);
                    claim.totalCoverage = tier?.baseCoverageAmount || (claim.policy?.totalCoverageAmount || 0);
                    claim.remainingCoverage = claim.policy?.remainingCoverageAmount || 0;
                }
            } catch (e) {
                console.error('Failed to parse policy data', e);
            }
        }

        this.selectedClaim.set({ ...claim, fullDetails: details });
        this.showReviewModal.set(true);
        this.reviewForm.status = 'Approved';
        this.reviewForm.remarks = '';
        this.reviewForm.approvedAmount = claim.requestedAmount || 0;
        // Reset AI insights for each new claim review
        this.aiInsights.set(null);
        this.aiError.set(null);
        this.isAILoading.set(false);
    }

    setSection(section: string) {
        this.activeSection.set(section);
        if (section === 'dashboard') {
            this.initCharts();
        } else if (section === 'payments') {
            this.destroyCharts();
            this.loadUnifiedPayments();
        } else {
            this.destroyCharts();
        }
    }

    loadUnifiedPayments() {
        this.isLoading.set(true);
        this.adminService.getUnifiedPayments().subscribe({
            next: (data) => {
                this.unifiedPayments.set(data);
                this.isLoading.set(false);
            },
            error: (err) => {
                console.error('Failed to load unified payments', err);
                this.isLoading.set(false);
            }
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
        doc.text(`${payment.transactionId || 'Pending'}`, 130, 77); // Avoid overlap
        doc.setFontSize(10); // Reset for table

        // 4. MAIN TABLE
        (doc as any).autoTable({
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

    viewHistoryDetail(claim: any) {
        // Reuse parsing logic for details
        let details = null;
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
                    fullDetails.applicant = normalize(fullDetails.applicant || fullDetails.primaryApplicant || raw.Applicant || raw.PrimaryApplicant);
                    fullDetails.nominee = normalize(fullDetails.nominee || raw.Nominee);
                    fullDetails.medicalProfile = normalize(fullDetails.medicalProfile || raw.MedicalProfile);
                    fullDetails.lifestyle = normalize(fullDetails.lifestyle || raw.Lifestyle);
                    fullDetails.incident = normalize(fullDetails.incident || fullDetails.incidentVerification || raw.Incident || raw.IncidentVerification);
                }
                details = fullDetails;

                // Enrich with financial data for history
                claim.totalCoverage = claim.policy?.totalCoverageAmount || 0;
                claim.remainingCoverage = claim.policy?.remainingCoverageAmount || 0;
            } catch (e) { }
        }

        this.selectedHistoryClaim.set({ ...claim, fullDetails: details });
        this.showHistoryDetailModal.set(true);
    }

    submitReview(status: string) {
        const claimId = this.selectedClaim()?.id;
        if (!claimId) return;

        this.isLoading.set(true);
        this.claimService.reviewClaim(claimId, status, this.reviewForm.remarks, this.reviewForm.approvedAmount).subscribe({
            next: () => {
                this.isLoading.set(false);
                this.showReviewModal.set(false);
                this.loadRequests();
            },
            error: (err) => {
                console.error('Failed to submit review', err);
                this.isLoading.set(false);
            }
        });
    }

    /**
     * Fetches text from all documents in the claim,
     * sends raw extracted text to n8n, and receives back AI analysis.
     */
    async getAIInsights(claim: any): Promise<void> {
        if (!claim?.documents?.length) return;

        this.isAILoading.set(true);
        this.aiInsights.set(null);
        this.aiError.set(null);

        try {
            // Step 1: Extract content from all uploaded documents
            let rawDocumentText = '';
            const dividers = '\n\n' + '='.repeat(30) + '\n\n';

            for (const doc of claim.documents) {
                const fileUrl: string = doc.fileUrl ?? '';
                if (!fileUrl) continue;

                try {
                    const resp = await fetch(fileUrl);
                    if (!resp.ok) throw new Error('Fetch failed');

                    const contentType = resp.headers.get('content-type') ?? '';
                    let content = '';

                    if (contentType.includes('application/pdf') || doc.fileName?.toLowerCase().endsWith('.pdf')) {
                        // PDF -> ArrayBuffer -> Base64
                        const buffer = await resp.arrayBuffer();
                        content = btoa(
                            new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
                        );
                        content = `[PDF DOCUMENT: ${doc.fileName}]\nBASE64_DATA: ${content}`;
                    } else if (contentType.includes('text') || contentType.includes('json') || contentType.includes('javascript') || contentType.includes('xml')) {
                        // Text-based -> Plain Text
                        content = await resp.text();
                        content = `[TEXT DOCUMENT: ${doc.fileName}]\nCONTENT:\n${content}`;
                    } else {
                        // Reference URL for others
                        content = `[FILE REFERENCE: ${doc.fileName}]\nURL: ${fileUrl}`;
                    }

                    rawDocumentText += (rawDocumentText ? dividers : '') + content;
                } catch (fetchErr) {
                    console.warn(`Could not fetch document ${doc.fileName}:`, fetchErr);
                    rawDocumentText += (rawDocumentText ? dividers : '') + `[UNFETCHABLE FILE: ${doc.fileName}]\nURL: ${fileUrl}`;
                }
            }

            // Step 2: Build the payload for n8n
            const payload = {
                claimId: claim.id ?? '',
                incidentType: claim.incidentType ?? '',
                requestedAmount: claim.requestedAmount ?? 0,
                remainingCoverage: claim.policy?.remainingCoverageAmount ?? 0,
                totalCoverage: claim.policy?.totalCoverageAmount ?? 0,
                rawDocumentText
            };

            // Step 3: POST to n8n webhook
            const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!n8nResponse.ok) {
                throw new Error(`n8n Error: ${n8nResponse.status}`);
            }

            const rawResult = await n8nResponse.json();

            // Step 4: Robust normalization of the response
            let finalOutput: any = null;

            if (rawResult && rawResult.output) {
                // Case 1: Response is wrapped in an 'output' field
                const outputStr = rawResult.output;
                try {
                    // Try parsing the string (and clean markdown if present)
                    const cleanJson = outputStr.replace(/```json|```/g, '').trim();
                    finalOutput = JSON.parse(cleanJson);
                } catch (e) {
                    throw new Error('Failed to parse AI output field as JSON');
                }
            } else if (rawResult && rawResult.summaryPoints) {
                // Case 2: Response is the direct insights object
                finalOutput = rawResult;
            } else {
                throw new Error('AI Agent returned no recognized output format');
            }

            // Step 5: Normalize and store
            const insights: AIInsightsResponse = {
                summaryPoints: Array.isArray(finalOutput.summaryPoints) ? finalOutput.summaryPoints.slice(0, 5) : [],
                riskScore: Math.min(100, Math.max(0, typeof finalOutput.riskScore === 'number' ? finalOutput.riskScore : 0)),
                suggestedAmountMin: typeof finalOutput.suggestedAmountMin === 'number' ? finalOutput.suggestedAmountMin : 0,
                suggestedAmountMax: typeof finalOutput.suggestedAmountMax === 'number' ? finalOutput.suggestedAmountMax : 0
            };

            this.aiInsights.set(insights);
        } catch (err: any) {
            console.error('AI Insights error:', err);
            this.aiError.set(err?.message ?? 'Analysis failed. Please try again.');
        } finally {
            this.isAILoading.set(false);
        }
    }

    clearAIInsights(): void {
        this.aiInsights.set(null);
        this.aiError.set(null);
    }

    /** Sets the approved amount to the midpoint of the AI-suggested range */
    applyAISuggestedAmount(): void {
        const insights = this.aiInsights();
        if (!insights) return;
        const midpoint = Math.round((insights.suggestedAmountMin + insights.suggestedAmountMax) / 2);
        this.reviewForm.approvedAmount = midpoint;
    }

    getRiskScoreColor(score: number): string {
        if (score <= 30) return 'text-emerald-600';
        if (score <= 60) return 'text-amber-500';
        return 'text-rose-600';
    }

    getRiskScoreStroke(score: number): string {
        if (score <= 30) return '#10b981';
        if (score <= 60) return '#f59e0b';
        return '#ef4444';
    }

    getRiskLabel(score: number): string {
        if (score <= 30) return 'Low';
        if (score <= 60) return 'Med';
        return 'High';
    }

    logout() {
        this.authService.logout();
    }
}