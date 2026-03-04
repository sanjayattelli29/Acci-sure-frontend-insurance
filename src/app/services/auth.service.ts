import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

// auth service handles all login logout stuff for frontend
// talks to asp.net backend api controllers for authentication
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // check if user logged in then give back user data
  getCurrentUser() {
    if (this.isLoggedIn()) {
      return this.getUser();
    }
    return null;
  }
  // http client to make api calls to backend
  private http = inject(HttpClient);
  // router for navigation after login/logout
  private router = inject(Router);
  // backend api base url pointing to .net core api
  private apiUrl = 'https://localhost:7140/api';

  // register new customer by sending data to auth controller in backend
  // hits Auth/register endpoint which creates user in db via controller
  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/Auth/register`, data);
  }

  // login user by hitting backend api auth controller
  // backend checks credentials against db and returns jwt token
  // we store token in localstorage for future api calls
  login(data: any): Observable<any> {
    console.log('[AuthService] Attempting login for:', data.emailId);
    return this.http.post(`${this.apiUrl}/Auth/login`, data).pipe(
      tap((response: any) => {
        console.log('[AuthService] Login response received:', JSON.stringify(response));

        // backend might send token in different field names so checking all
        const token = response.token || response.Token || response.auth_token;
        const role = response.role || response.Role || response.auth_role;
        const userId = response.id || response.Id;
        const userName = response.fullName || response.FullName;
        const userPhone = response.phoneNumber || response.PhoneNumber;

        // saving all user data to browser localstorage
        // token needed for api auth, role for access control
        if (token) {
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_role', role || '');
          localStorage.setItem('user_email', response.email || '');
          localStorage.setItem('user_id', userId || '');
          localStorage.setItem('user_name', userName || '');
          localStorage.setItem('user_phone', userPhone || '');
          console.log('[AuthService] Token and user info saved to localStorage using auth_ keys');
        } else {
          console.warn('[AuthService] No token found in login response! Keys present:', Object.keys(response));
        }
      })
    );
  }

  // logout clears all user data from browser
  // removes token so user cant make authorized api calls anymore
  // redirects to home page
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_name');
    localStorage.removeItem('user_phone');
    localStorage.removeItem('user'); // Also remove old keys just in case
    localStorage.removeItem('token');
    this.router.navigate(['/']);
  }

  // get jwt token from localstorage to attach to api calls
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  // pull all user info from localstorage and return as object
  getUser() {
    return {
      id: localStorage.getItem('user_id'),
      name: localStorage.getItem('user_name'),
      email: localStorage.getItem('user_email'),
      phone: localStorage.getItem('user_phone'),
      role: localStorage.getItem('auth_role')
    };
  }

  // quick check if user logged in by seeing if token exists
  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  // get user role for access control like admin, customer, agent
  getUserRole(): string | null {
    return localStorage.getItem('auth_role');
  }

  // update current role in localstorage when switching roles
  setCurrentRole(role: string) {
    localStorage.setItem('auth_role', role);
  }
}
