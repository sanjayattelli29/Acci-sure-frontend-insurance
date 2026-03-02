import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class ClaimService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7140/api/Claim';

    // Customer
    raiseClaim(formData: FormData): Observable<any> {
        return this.http.post(`${this.apiUrl}/raise`, formData);
    }

    getMyClaims(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-claims`);
    }

    // Admin
    getPendingClaims(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/admin/pending`);
    }

    getClaimOfficers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/admin/officers`);
    }

    assignOfficer(claimId: string, officerId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/assign`, { claimId, officerId });
    }

    // Claim Officer
    getOfficerRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/officer/my-requests`);
    }

    reviewClaim(claimId: string, status: string, remarks: string, approvedAmount: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/officer/review`, { claimId, status, remarks, approvedAmount });
    }

    getAgentClaims(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/agent/customer-claims`);
    }

    getClaimByPolicyId(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/policy/${policyId}`);
    }
}
