import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private http = inject(HttpClient);
    private authService = inject(AuthService);
    private apiUrl = 'https://localhost:7140/api/Chat';
    private hubUrl = 'https://localhost:7140/chathub';

    private hubConnection: signalR.HubConnection | null = null;
    private messageSubject = new BehaviorSubject<any[]>([]);
    public messages$ = this.messageSubject.asObservable();

    constructor() { }

    /**
     * Initializes SignalR connection and joins a specific policy room.
     */
    async startConnection(policyId: string) {
        this.hubConnection = new signalR.HubConnectionBuilder()
            .withUrl(this.hubUrl, {
                accessTokenFactory: () => this.authService.getToken() || ''
            })
            .withAutomaticReconnect()
            .build();

        this.hubConnection.on('ReceiveMessage', (data) => {
            const currentMessages = this.messageSubject.value;
            this.messageSubject.next([...currentMessages, data]);
        });

        try {
            await this.hubConnection.start();
            console.log('SignalR connected');
            await this.hubConnection.invoke('JoinRoom', policyId);
        } catch (err) {
            console.error('Error while starting SignalR:', err);
        }
    }

    /**
     * Stops the SignalR connection.
     */
    async stopConnection() {
        if (this.hubConnection) {
            await this.hubConnection.stop();
            this.hubConnection = null;
        }
        this.messageSubject.next([]);
    }

    /**
     * Sends a message through SignalR.
     */
    async sendMessage(policyId: string, senderId: string, senderRole: string, message: string) {
        if (this.hubConnection) {
            await this.hubConnection.invoke('SendMessage', policyId, senderId, senderRole, message);
        }
    }

    /**
     * Loads chat history from the API.
     */
    getChatHistory(policyId: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/${policyId}`);
    }

    /**
     * Initializes the chat history in the message subject.
     */
    setInitialMessages(messages: any[]) {
        this.messageSubject.next(messages);
    }

    /**
     * Gets the list of chats for the current user.
     */
    getChatList(): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/list`);
    }

    /**
     * Initializes a chat (GetOrCreate on backend).
     */
    initChat(data: { policyId: string, customerId: string, agentId: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/init`, data);
    }

    /**
     * Marks messages as read for a given policy.
     */
    markAsRead(policyId: string): Observable<any> {
        return this.http.post(`${this.apiUrl}/${policyId}/read`, {});
    }
}
