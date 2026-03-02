import { Component, OnInit, inject, signal, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-notification-panel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './notification-panel.component.html',
    styleUrl: './notification-panel.component.css'
})
export class NotificationPanelComponent implements OnInit {
    public notificationService = inject(NotificationService);
    private authService = inject(AuthService);
    private router = inject(Router);

    @Input() portalRole?: string;
    isOpen = signal(false);

    ngOnInit() {
        // Start connection with portal-specific role or fallback to user role
        const user = this.authService.getUser();
        const roleToUse = this.portalRole || user.role;

        if (roleToUse) {
            this.notificationService.startConnection(roleToUse);
        }
    }

    togglePanel() {
        this.isOpen.update(v => !v);
    }

    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest('.notification-wrapper')) {
            this.isOpen.set(false);
        }
    }

    markAsRead(id: string, event: Event) {
        event.stopPropagation();
        this.notificationService.markAsRead(id).subscribe();
    }

    handleNotificationClick(notification: Notification, event: Event) {
        event.stopPropagation();

        // 1. Mark as read
        if (!notification.isRead) {
            this.notificationService.markAsRead(notification.id).subscribe();
        }

        // 2. Parse target and navigate
        const rawType = notification.notificationType || '';
        // Remove role prefix if present (e.g., ADM:Policy:ID -> Policy:ID)
        const type = rawType.includes(':') && ['ADM', 'AGENT', 'CUST', 'OFF'].includes(rawType.split(':')[0])
            ? rawType.substring(rawType.indexOf(':') + 1)
            : rawType;

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

    markAllAsRead() {
        this.notificationService.markAllAsRead().subscribe();
    }

    getRelativeTime(dateStr: string): string {
        const now = new Date();
        const date = new Date(dateStr);
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString();
    }

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
