import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AgentService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7140/api/Agent';

    getMyRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-requests`);
    }

    reviewRequest(applicationId: string, status: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/review-request`, { applicationId, status });
    }

    getCommissionStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/commission-stats`);
    }

    getAnalytics(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/analytics`);
    }

    sendAgentEmail(payload: { toEmail: string, subject: string, htmlBody: string }): Observable<any> {
        const webhookUrl = "https://nextglidesol.app.n8n.cloud/webhook/agent-send-email";
        return this.http.post(webhookUrl, payload);
    }
}
