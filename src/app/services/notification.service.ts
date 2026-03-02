import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { AuthService } from './auth.service';
import { Observable, tap } from 'rxjs';

export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    createdAt: string;
    isRead: boolean;
    notificationType: string;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = 'https://localhost:7140/api/Notifications';
    private hubUrl = 'https://localhost:7140/notificationhub';

    private hubConnection: signalR.HubConnection | null = null;

    // Signals for reactive UI
    notifications = signal<Notification[]>([]);
    unreadCount = signal<number>(0);

    /**
     * Initializes SignalR connection for notifications.
     */
    async startConnection(role?: string) {
        if (role) this.authService.setCurrentRole(role);
        const currentRole = role || (this.authService.getUser()?.role ?? undefined);

        if (this.hubConnection) {
            // Restart load to get filtered data
            this.loadInitialData(currentRole);
            return;
        }

        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(this.hubUrl, {
                accessTokenFactory: () => this.authService.getToken() || ''
            })
            .withAutomaticReconnect()
            .build();

        this.hubConnection.on('ReceiveNotification', (notification: Notification) => {
            console.log('New notification received:', notification);

            // Real-time filter: Only add if it matches current role or is general
            const prefix = this.getRolePrefix(currentRole);
            if (!prefix || notification.notificationType.startsWith(prefix) || notification.notificationType === 'General') {
                this.notifications.update(prev => [notification, ...prev]);
                this.unreadCount.update(count => count + 1);
            }
        });

        try {
            await this.hubConnection.start();
            console.log('SignalR NotificationHub connected');
            this.loadInitialData(currentRole);
        } catch (err) {
            console.error('Error while starting SignalR NotificationHub:', err);
        }
    }

    private getRolePrefix(role?: string): string {
        if (!role) return '';
        const r = role.toUpperCase();
        if (r === 'ADMIN') return 'ADM:';
        if (r === 'AGENT') return 'AGENT:';
        if (r === 'CUSTOMER') return 'CUST:';
        if (r === 'CLAIMOFFICER') return 'OFF:';
        return '';
    }

    private loadInitialData(role?: string) {
        this.getNotifications(role).subscribe(data => {
            this.notifications.set(data);
        });
        this.getUnreadCount().subscribe(count => {
            this.unreadCount.set(count);
        });
    }

    /**
     * Fetch all notifications for the user.
     */
    getNotifications(role?: string): Observable<Notification[]> {
        const url = role ? `${this.apiUrl}?role=${role}` : this.apiUrl;
        return this.http.get<Notification[]>(url);
    }

    /**
     * Get the count of unread notifications.
     */
    getUnreadCount(): Observable<number> {
        return this.http.get<number>(`${this.apiUrl}/unread-count`);
    }

    /**
     * Mark a specific notification as read.
     */
    markAsRead(id: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${id}/read`, {}).pipe(
            tap(() => {
                this.notifications.update(list =>
                    list.map(n => n.id === id ? { ...n, isRead: true } : n)
                );
                this.unreadCount.update(count => Math.max(0, count - 1));
            })
        );
    }

    /**
     * Mark all notifications as read.
     */
    markAllAsRead(): Observable<any> {
        return this.http.post(`${this.apiUrl}/read-all`, {}).pipe(
            tap(() => {
                this.notifications.update(list =>
                    list.map(n => ({ ...n, isRead: true }))
                );
                this.unreadCount.set(0);
            })
        );
    }

    /**
     * Stops the SignalR connection.
     */
    async stopConnection() {
        if (this.hubConnection) {
            await this.hubConnection.stop();
            this.hubConnection = null;
        }
    }
}
