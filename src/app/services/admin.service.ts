import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7140/api/Admin';

    getAgents(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/agents`);
    }

    getClaimOfficers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/claim-officers`);
    }

    createAgent(agentData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/create-agent`, agentData);
    }

    createClaimOfficer(officerData: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/create-claim-officer`, officerData);
    }

    deleteUser(userId: string): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete-user/${userId}`);
    }

    getPolicyRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/policy-requests`);
    }

    getAgentsWithLoad(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/agents-with-load`);
    }

    assignAgent(applicationId: string, agentId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/assign-agent`, { applicationId, agentId });
    }

    getAllUsers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/all-users`);
    }

    getAllClaims(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/all-claims`);
    }

    getAdminStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/admin-stats`);
    }

    getUnifiedPayments(): Observable<any[]> {
        return this.http.get<any[]>(`https://localhost:7140/api/Report/unified-payments`);
    }

    sendAdminEmail(payload: { toEmail: string, subject: string, htmlBody: string }): Observable<any> {
        const webhookUrl = "https://nextglidesol.app.n8n.cloud/webhook/agent-send-email";
        return this.http.post(webhookUrl, payload);
    }
}
