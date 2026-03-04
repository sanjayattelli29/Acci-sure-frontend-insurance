import { Component, inject, OnInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ChatService } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';

// chat page for agent customer communication
// uses signalr for real-time messaging and jitsi for video calls
@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './chat.page.html',
    styleUrls: ['./chat.page.css']
})
export class ChatPage implements OnInit, OnDestroy {
    // inject services for chat and auth
    private route = inject(ActivatedRoute);
    private chatService = inject(ChatService);
    private authService = inject(AuthService);
    public router = inject(Router);
    sidebarOpen = signal(false);

    // policy id from route params
    policyId = '';
    // current logged in user
    user = this.authService.getUser();
    // chat metadata from backend
    chatInfo = signal<any>(null);
    // message input
    newMessage = '';
    // messages stream from signalr service
    messages$ = this.chatService.messages$;

    // jitsi video container ref
    @ViewChild('jitsiContainer') jitsiContainer!: ElementRef;
    isVideoOpen = false;
    private jitsiApi: any; // jitsi meet api instance

    // init chat when component loads
    ngOnInit() {
        // load jitsi external api script for video
        this.injectJitsiScript();
        // get policy id from route and setup chat
        this.route.params.subscribe(params => {
            this.policyId = params['policyId'];
            if (this.policyId) {
                // load old messages from backend
                this.loadChatHistory();
                // connect to signalr for real-time messages
                this.chatService.startConnection(this.policyId);
                // mark messages as read
                this.chatService.markAsRead(this.policyId).subscribe();
            }
        });
    }

    // inject jitsi meet script dynamically
    private injectJitsiScript() {
        if (!(window as any).JitsiMeetExternalAPI) {
            const script = document.createElement('script');
            script.src = 'https://meet.jit.si/external_api.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }

    // start jitsi video call
    startVideoCall() {
        this.isVideoOpen = true;
        // delay to let container render
        setTimeout(() => {
            this.initializeJitsi();
        }, 3000);
    }

    // initialize jitsi meet embed
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

        // create jitsi iframe
        this.jitsiApi = new (window as any).JitsiMeetExternalAPI(domain, options);

        // listen for call end
        this.jitsiApi.addEventListeners({
            readyToClose: () => {
                this.endVideoCall();
            }
        });
    }

    // end video call and cleanup
    endVideoCall() {
        if (this.jitsiApi) {
            this.jitsiApi.dispose();
            this.jitsiApi = null;
        }
        this.isVideoOpen = false;
    }

    // cleanup on component destroy
    ngOnDestroy() {
        this.endVideoCall();
        // disconnect signalr
        this.chatService.stopConnection();
    }

    // load existing chat messages from backend db
    loadChatHistory() {
        this.chatService.getChatHistory(this.policyId).subscribe({
            next: (res) => {
                this.chatInfo.set(res);
                // set initial messages in signalr service
                this.chatService.setInitialMessages(res.messages || []);
            },
            error: (err) => console.error('Failed to load chat history', err)
        });
    }

    // send message via signalr to backend hub
    sendMessage() {
        if (!this.newMessage.trim()) return;

        // signalr broadcasts message to all in room
        this.chatService.sendMessage(
            this.policyId,
            this.user.id || '',
            this.user.role || '',
            this.newMessage
        );
        this.newMessage = '';
    }
}
