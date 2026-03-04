import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// agent service for agent related operations
// communicates with backend agent controller
@Injectable({
    providedIn: 'root'
})
export class AgentService {
    // http client for api requests
    private http = inject(HttpClient);
    // backend agent api endpoint
    private apiUrl = 'https://localhost:7140/api/Agent';

    // get policy requests assigned to logged in agent from db
    getMyRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-requests`);
    }

    // agent reviews policy request approve or reject
    // backend updates application status in db
    reviewRequest(applicationId: string, status: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/review-request`, { applicationId, status });
    }

    // get commission stats for agent from backend calculations
    getCommissionStats(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/commission-stats`);
    }

    // get analytics data for agent dashboard from backend
    getAnalytics(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/analytics`);
    }

    // send email via n8n webhook external integration
    sendAgentEmail(payload: { toEmail: string, subject: string, htmlBody: string }): Observable<any> {
        const webhookUrl = "https://nextglidesol.app.n8n.cloud/webhook/agent-send-email";
        return this.http.post(webhookUrl, payload);
    }
}
