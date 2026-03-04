import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

// chat service handles real-time messaging using signalr
// connects to backend signalr hub for live chat between users
@Injectable({
    providedIn: 'root'
})
export class ChatService {
    // http for rest api calls to backend
    private http = inject(HttpClient);
    // auth service to get user token for signalr auth
    private authService = inject(AuthService);
    // backend chat controller endpoint
    private apiUrl = 'https://localhost:7140/api/Chat';
    // signalr hub url for websocket connection
    private hubUrl = 'https://localhost:7140/chathub';

    // signalr connection object for websocket
    private hubConnection: signalR.HubConnection | null = null;
    // rxjs subject to hold chat messages array for reactive ui
    private messageSubject = new BehaviorSubject<any[]>([]);
    // observable stream of messages for components to subscribe
    public messages$ = this.messageSubject.asObservable();

    constructor() { }

    // start signalr connection with jwt token for auth
    // joins specific policy chat room on backend hub
    async startConnection(policyId: string) {
        // build signalr connection with backend hub url
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(this.hubUrl, {
                // attach jwt token for backend to verify user
                accessTokenFactory: () => this.authService.getToken() || ''
            })
            .withAutomaticReconnect() // reconnect if connection drops
            .build();

        // listen for new messages from backend signalr hub
        this.hubConnection.on('ReceiveMessage', (data) => {
            // add new message to existing messages array
            const currentMessages = this.messageSubject.value;
            this.messageSubject.next([...currentMessages, data]);
        });

        try {
            // actually connect to backend signalr hub
            await this.hubConnection.start();
            console.log('SignalR connected');
            // join specific policy room on backend for filtered messages
            await this.hubConnection.invoke('JoinRoom', policyId);
        } catch (err) {
            console.error('Error while starting SignalR:', err);
        }
    }

    // disconnect from signalr hub and clear messages
    async stopConnection() {
        if (this.hubConnection) {
            await this.hubConnection.stop();
            this.hubConnection = null;
        }
        // clear messages from subject
        this.messageSubject.next([]);
    }

    // send message through signalr to backend hub
    // backend broadcasts to all users in that policy room
    async sendMessage(policyId: string, senderId: string, senderRole: string, message: string) {
        if (this.hubConnection) {
            await this.hubConnection.invoke('SendMessage', policyId, senderId, senderRole, message);
        }
    }

    // load old chat messages from db via backend api
    getChatHistory(policyId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${policyId}`);
    }

    // set initial messages in subject when loading history
    setInitialMessages(messages: any[]) {
        this.messageSubject.next(messages);
    }

    // get all chat rooms user is part of from backend
    getChatList(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/list`);
    }

    // create or get existing chat for a policy from backend
    initChat(data: { policyId: string, customerId: string, agentId: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/init`, data);
    }

    // mark messages as read in backend db for notification count
    markAsRead(policyId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${policyId}/read`, {});
    }
}
