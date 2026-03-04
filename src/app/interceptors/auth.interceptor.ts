import { HttpInterceptorFn } from '@angular/common/http';

// http interceptor to attach jwt token to all outgoing requests
// reads token from localstorage and adds to authorization header
// backend validates this token via identity middleware
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // get jwt token from localstorage
    const token = localStorage.getItem('auth_token');
    const allKeys = Object.keys(localStorage);

    // log request details for debugging except login to avoid spam
    if (!req.url.includes('Auth/login')) {
        console.log(`[AuthInterceptor] Request: ${req.url}`);
        console.log(`[AuthInterceptor] localStorage keys:`, allKeys);
        console.log(`[AuthInterceptor] auth_token present: ${!!token}`);
    }

    // if token exists attach it to request header
    if (token) {
        // clone request and add authorization header with bearer token
        const clonedReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        if (!req.url.includes('Auth/login')) {
            console.log(`[AuthInterceptor] Attached Bearer token.`);
        }
        // send modified request
        return next(clonedReq);
    }

    // no token so send original request
    return next(req);
};
