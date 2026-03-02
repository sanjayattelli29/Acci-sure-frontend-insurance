import { HttpInterceptorFn } from '@angular/common/http';

/**
 * Interceptor that automatically attaches the JWT token to outgoing requests
 * if it exists in the localStorage.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const token = localStorage.getItem('auth_token');
    const allKeys = Object.keys(localStorage);

    // Skip logging for Auth/login to avoid cluttering but log for others
    if (!req.url.includes('Auth/login')) {
        console.log(`[AuthInterceptor] Request: ${req.url}`);
        console.log(`[AuthInterceptor] localStorage keys:`, allKeys);
        console.log(`[AuthInterceptor] auth_token present: ${!!token}`);
    }

    if (token) {
        const clonedReq = req.clone({
            headers: req.headers.set('Authorization', `Bearer ${token}`)
        });
        if (!req.url.includes('Auth/login')) {
            console.log(`[AuthInterceptor] Attached Bearer token.`);
        }
        return next(clonedReq);
    }

    return next(req);
};
