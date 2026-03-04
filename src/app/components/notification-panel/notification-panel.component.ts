import { Component, OnInit, inject, signal, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

// notification panel component shows alerts dropdown
// displays real-time notifications via signalr from backend
@Component({
    selector: 'app-notification-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification-panel.component.html',
    styleUrl: './notification-panel.component.css'
})
export class NotificationPanelComponent implements OnInit {
    // inject services
    public notificationService = inject(NotificationService);
    private authService = inject(AuthService);
    private router = inject(Router);

    // optional role input to filter notifications by portal
    @Input() portalRole?: string;
    // panel open/close state
    isOpen = signal(false);

    // init signalr connection on component load
    ngOnInit() {
        // use portal specific role or fallback to user role
        const user = this.authService.getUser();
        const roleToUse = this.portalRole || user.role;

        // start signalr connection to receive real-time notifications
        if (roleToUse) {
            this.notificationService.startConnection(roleToUse);
        }
    }

    // toggle notification panel open/closed
    togglePanel() {
        this.isOpen.update(v => !v);
    }

    // close panel when clicking outside
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.notification-wrapper')) {
            this.isOpen.set(false);
        }
    }

    // mark single notification as read via backend api
    markAsRead(id: string, event: Event) {
        event.stopPropagation();
        this.notificationService.markAsRead(id).subscribe();
    }

    // handle notification click to navigate to related page
    handleNotificationClick(notification: Notification, event: Event) {
        event.stopPropagation();

        // mark as read first
        if (!notification.isRead) {
            this.notificationService.markAsRead(notification.id).subscribe();
        }

        // parse notification type and extract id for navigation
        const rawType = notification.notificationType || '';
        // remove role prefix like ADM: AGENT: from type
        const type = rawType.includes(':') && ['ADM', 'AGENT', 'CUST', 'OFF'].includes(rawType.split(':')[0])
            ? rawType.substring(rawType.indexOf(':') + 1)
            : rawType;

        // navigate based on notification type
        if (type.startsWith('Policy:')) {
            const policyId = type.split(':')[1];
            if (policyId && policyId !== 'undefined') {
                this.router.navigate(['/customer/policy', policyId]);
                this.isOpen.set(false);
            }
        } else if (type.startsWith('Claim:')) {
            const claimId = type.split(':')[1];
            if (claimId && claimId !== 'undefined') {
                this.router.navigate(['/customer/claim', claimId]);
                this.isOpen.set(false);
            }
        }
    }

    // mark all notifications as read via backend
    markAllAsRead() {
        this.notificationService.markAllAsRead().subscribe();
    }

    // convert timestamp to relative time like 5m ago
    getRelativeTime(dateStr: string): string {
        const now = new Date();
        const date = new Date(dateStr);
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString();
    }

    // format notification type for display header
    getFormattedHeader(type: string): string {
        if (!type) return 'NOTIFICATION';
        const t = type.toUpperCase();
        if (t.includes('POLICY:')) return 'POLICY UPDATE';
        if (t.includes('CLAIM:')) return 'CLAIM ALERT';
        if (t.includes('POLICYAPPLICATION')) return 'APPLICATION UPDATE';
        if (t.includes('COMMISSION')) return 'COMMISSION EARNED 💰';
        return type.includes(':') ? type.split(':').pop()!.toUpperCase() : type.toUpperCase();
    }
}
