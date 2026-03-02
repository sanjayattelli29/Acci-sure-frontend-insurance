import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
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

    @ViewChild('jitsiContainer') jitsiContainer!: ElementRef;
    isVideoOpen = false;
    private jitsiApi: any;

    ngOnInit() {
        this.injectJitsiScript();
        this.route.params.subscribe(params => {
            this.policyId = params['policyId'];
            if (this.policyId) {
                this.loadChatHistory();
                this.chatService.startConnection(this.policyId);
                this.chatService.markAsRead(this.policyId).subscribe();
            }
        });
    }

    private injectJitsiScript() {
        if (!(window as any).JitsiMeetExternalAPI) {
            const script = document.createElement('script');
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }

    startVideoCall() {
        this.isVideoOpen = true;
        setTimeout(() => {
            this.initializeJitsi();
        }, 3000); // 300ms as requested
    }

    private initializeJitsi() {
        const domain = 'meet.jit.si';
        const options = {
            roomName: `insuranceplatform-${this.policyId}`,
            width: '100%',
            height: '100%',
            parentNode: this.jitsiContainer.nativeElement,
            userInfo: {
                displayName: `${this.user.email} (${this.user.role})`
            },
            configOverwrite: {
                prejoinPageEnabled: false
            },
            interfaceConfigOverwrite: {
                SHOW_JITSI_WATERMARK: false,
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'hangup', 'chat', 'tileview'
                ]
            }
        };

        this.jitsiApi = new (window as any).JitsiMeetExternalAPI(domain, options);

        this.jitsiApi.addEventListeners({
            readyToClose: () => {
                this.endVideoCall();
            }
        });
    }

    endVideoCall() {
        if (this.jitsiApi) {
            this.jitsiApi.dispose();
            this.jitsiApi = null;
        }
        this.isVideoOpen = false;
    }

    ngOnDestroy() {
        this.endVideoCall();
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
