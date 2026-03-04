import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// policy service handles insurance policy operations
// connects to backend policy controller for db operations
@Injectable({
    providedIn: 'root'
})
export class PolicyService {
    // http client for api calls
    private http = inject(HttpClient);
    // backend policy controller base url
    private apiUrl = 'https://localhost:7140/api/Policy';

    // get policy config like categories tiers from backend
    // backend reads from db policy config table via ef core
    getConfiguration(): Observable<any> {
        return this.http.get(`${this.apiUrl}/configuration`);
    }

    // calculate premium based on risk factors and tier
    // backend has logic to compute premium from user inputs
    calculatePremium(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/calculate-premium`, data);
    }

    // submit policy application to backend
    // backend saves to policy applications table in db
    applyForPolicy(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/apply`, data);
    }

    // get policies belonging to logged in user from db
    // backend filters by user id via controller
    getMyPolicies(): Observable<any> {
        return this.http.get(`${this.apiUrl}/my-policies`);
    }

    // process payment for policy application
    // hits payment controller which updates policy status in db
    processPayment(applicationId: string, amount: number): Observable<any> {
        return this.http.post(`https://localhost:7140/api/Payment/process`, { applicationId, amount });
    }

    // agent gets list of customers assigned to them from backend db
    getAgentCustomers(): Observable<any[]> {
        return this.http.get<any[]>(`https://localhost:7140/api/Agent/my-customers`);
    }

    // send chat question to external n8n webhook for ai processing
    // not backend db just external integration
    sendChatQuestion(payload: any): Observable<any> {
        const webhookUrl = "https://nextglidesol.app.n8n.cloud/webhook/chatbot-agent-1";
        return this.http.post(webhookUrl, payload);
    }
}
