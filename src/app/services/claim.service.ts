import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// claim service handles all claim related operations
// connects to backend claim controller which interacts with db
@Injectable({
    providedIn: 'root'
})

export class ClaimService {
    // http service to call backend api endpoints
    private http = inject(HttpClient);
    // backend claim api base url
    private apiUrl = 'https://localhost:7140/api/Claim';

    // Customer section - raise claim with files
    // sends formdata with documents to backend which stores in db via ef core
    raiseClaim(formData: FormData): Observable<any> {
        return this.http.post(`${this.apiUrl}/raise`, formData);
    }

    // get claims created by logged in customer from db
    getMyClaims(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/my-claims?t=${Date.now()}`);
    }

    // Admin functions - get claims waiting for officer assignment
    // backend fetches from claims table where status pending
    getPendingClaims(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/admin/pending?t=${Date.now()}`);
    }

    // get all claim officers from users table for assignment
    getClaimOfficers(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/admin/officers`);
    }

    // assign a claim to an officer by updating db via backend controller
    assignOfficer(claimId: string, officerId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/assign`, { claimId, officerId });
    }

    // Claim Officer section - get claims assigned to me
    // backend filters claims by logged in officer id from db
    getOfficerRequests(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/officer/my-requests?t=${Date.now()}`);
    }

    // officer reviews claim with status remarks and approved amount
    // backend updates claim in db and sends notification
    reviewClaim(claimId: string, status: string, remarks: string, approvedAmount: number): Observable<any> {
        return this.http.post(`${this.apiUrl}/officer/review`, { claimId, status, remarks, approvedAmount });
    }

    // agent gets claims from their assigned customers
    getAgentClaims(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/agent/customer-claims?t=${Date.now()}`);
    }

    // fetch claim details for specific policy from backend db
    getClaimByPolicyId(policyId: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/policy/${policyId}`);
    }
}
