import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { Observable, tap } from 'rxjs';

// notification interface for type safety
export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
    notificationType: string;
}

// notification service for real-time alerts using signalr
// connects to backend notification hub for push notifications
@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    // http for backend api rest calls
    private http = inject(HttpClient);
    // auth service to get jwt token for signalr
    private authService = inject(AuthService);
    // backend notification controller endpoint
    private apiUrl = 'https://localhost:7140/api/Notifications';
    // signalr hub url for websocket notifications
    private hubUrl = 'https://localhost:7140/notificationhub';

    // signalr connection for real-time push
    private hubConnection: signalR.HubConnection | null = null;

    // angular signals for reactive ui updates
    notifications = signal<Notification[]>([]); // all notifications list
    unreadCount = signal<number>(0); // count of unread for badge

    // start signalr connection for real-time notifications
    // filters notifications by user role like admin agent customer
    async startConnection(role?: string) {
        // update role in auth if provided
        if (role) this.authService.setCurrentRole(role);
        const currentRole = role || (this.authService.getUser()?.role ?? undefined);

        // if already connected just reload data dont reconnect
        if (this.hubConnection) {
            this.loadInitialData(currentRole);
            return;
        }

        // build signalr connection with jwt token
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(this.hubUrl, {
                // attach jwt for backend to verify user
                accessTokenFactory: () => this.authService.getToken() || ''
            })
            .withAutomaticReconnect() // auto reconnect if drops
            .build();

        // listen for new notifications from backend hub
        this.hubConnection.on('ReceiveNotification', (notification: Notification) => {
            console.log('New notification received:', notification);

            // filter notifications by role prefix so user only sees relevant ones
            const prefix = this.getRolePrefix(currentRole);
            if (!prefix || notification.notificationType.startsWith(prefix) || notification.notificationType === 'General') {
                // add to notifications array and increment unread count
                this.notifications.update(prev => [notification, ...prev]);
                this.unreadCount.update(count => count + 1);
            }
        });

        try {
            // connect to signalr hub on backend
            await this.hubConnection.start();
            console.log('SignalR NotificationHub connected');
            // load existing notifications from db
            this.loadInitialData(currentRole);
        } catch (err) {
            console.error('Error while starting SignalR NotificationHub:', err);
        }
    }

    // map role to prefix used in notification types
    private getRolePrefix(role?: string): string {
        if (!role) return '';
        const r = role.toUpperCase();
        if (r === 'ADMIN') return 'ADM:';
        if (r === 'AGENT') return 'AGENT:';
        if (r === 'CUSTOMER') return 'CUST:';
        if (r === 'CLAIMOFFICER') return 'OFF:';
        return '';
    }

    // load notifications and unread count from backend on init
    private loadInitialData(role?: string) {
        // fetch notifications from backend db via api
        this.getNotifications(role).subscribe(data => {
            this.notifications.set(data);
        });
        // get unread count from backend
        this.getUnreadCount().subscribe(count => {
            this.unreadCount.set(count);
        });
    }

    // fetch all notifications from backend filtered by role
    getNotifications(role?: string): Observable<Notification[]> {
        const url = role ? `${this.apiUrl}?role=${role}` : this.apiUrl;
        return this.http.get<Notification[]>(url);
    }

    // get count of unread notifications from backend db
    getUnreadCount(): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/unread-count`);
    }

    // mark single notification as read in backend db
    // updates ui state after successful backend update
    markAsRead(id: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/read`, {}).pipe(
            tap(() => {
                // update local notification state
                this.notifications.update(list =>
                    list.map(n => n.id === id ? { ...n, isRead: true } : n)
                );
                // decrease unread count
                this.unreadCount.update(count => Math.max(0, count - 1));
            })
        );
    }

    // mark all notifications as read via backend api
    markAllAsRead(): Observable<any> {
        return this.http.post(`${this.apiUrl}/read-all`, {}).pipe(
            tap(() => {
                // update all notifications to read in ui
                this.notifications.update(list =>
                    list.map(n => ({ ...n, isRead: true }))
                );
                // set unread count to zero
                this.unreadCount.set(0);
            })
        );
    }

    // disconnect from signalr hub when component destroyed
    async stopConnection() {
        if (this.hubConnection) {
            await this.hubConnection.stop();
            this.hubConnection = null;
        }
    }
}
