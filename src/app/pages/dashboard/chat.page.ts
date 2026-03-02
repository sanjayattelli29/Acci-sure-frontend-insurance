import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './chat.page.html',
    styleUrls: ['./chat.page.css']
})
export class ChatPage implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private chatService = inject(ChatService);
    private authService = inject(AuthService);
    public router = inject(Router);

    policyId = '';
    user = this.authService.getUser();
    chatInfo = signal<any>(null);
    newMessage = '';
    messages$ = this.chatService.messages$;

    ngOnInit() {
        this.route.params.subscribe(params => {
            this.policyId = params['policyId'];
            if (this.policyId) {
                this.loadChatHistory();
                this.chatService.startConnection(this.policyId);
                this.chatService.markAsRead(this.policyId).subscribe();
            }
        });
    }

    ngOnDestroy() {
        this.chatService.stopConnection();
    }

    loadChatHistory() {
        this.chatService.getChatHistory(this.policyId).subscribe({
            next: (res) => {
                this.chatInfo.set(res);
                this.chatService.setInitialMessages(res.messages || []);
            },
            error: (err) => console.error('Failed to load chat history', err)
        });
    }

    sendMessage() {
        if (!this.newMessage.trim()) return;

        this.chatService.sendMessage(
            this.policyId,
            this.user.id || '',
            this.user.role || '',
            this.newMessage
        );
        this.newMessage = '';
    }
}
