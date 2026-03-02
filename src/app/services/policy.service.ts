import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Service to handle policy configuration, premium calculation, and applications.
 */
@Injectable({
    providedIn: 'root'
})
export class PolicyService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7140/api/Policy';

    /**
     * Fetches the dynamic policy configuration from the backend.
     */
    getConfiguration(): Observable<any> {
        return this.http.get(`${this.apiUrl}/configuration`);
    }

    /**
     * Calculates the premium based on the provided risk factors.
     */
    calculatePremium(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/calculate-premium`, data);
    }

    /**
     * Submits a final policy application.
     */
    applyForPolicy(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/apply`, data);
    }

    /**
     * Fetches policies belonging to the currently logged-in user.
     */
    getMyPolicies(): Observable<any> {
        return this.http.get(`${this.apiUrl}/my-policies`);
    }

    /**
     * Processes a simulated payment for a policy.
     */
    processPayment(applicationId: string, amount: number): Observable<any> {
        return this.http.post(`https://localhost:7140/api/Payment/process`, { applicationId, amount });
    }

    getAgentCustomers(): Observable<any[]> {
        return this.http.get<any[]>(`https://localhost:7140/api/Agent/my-customers`);
    }

    /**
     * Sends a chat question to the n8n webhook.
     */
    sendChatQuestion(payload: any): Observable<any> {
        const webhookUrl = "https://nextglidesol.app.n8n.cloud/webhook/chatbot-agent-1";
        return this.http.post(webhookUrl, payload);
    }
}
