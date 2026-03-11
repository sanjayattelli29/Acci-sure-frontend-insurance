import { Component, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// message interface for chat
interface Message {
    text: string;
    isUser: boolean;
    isError?: boolean;
}

// response from n8n webhook
interface ChatResponse {
    answer: string;
}

// chatbot component for ai AcciSure Assistant
// uses n8n webhook for ai responses not backend db
@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chatbot.html',
    styleUrl: './chatbot.css'
})
export class ChatbotComponent implements AfterViewChecked {
    // scroll container ref for auto scroll
    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    // ui state signals
    isOpen = signal(false);
    question = signal('');
    // chat messages array
    messages = signal<Message[]>([
        { text: 'Hi! How can I help you with insurance today?', isUser: false }
    ]);
    isLoading = signal(false);

    // n8n webhook url for ai chat processing
    private readonly WEBHOOK_URL = 'https://nextglidesol.app.n8n.cloud/webhook/chatbot-bot-1';

    // toggle chat window open/closed
    toggleChat(): void {
        this.isOpen.set(!this.isOpen());
    }

    // auto scroll to bottom after view updates
    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    // scroll chat to show latest message
    private scrollToBottom(): void {
        try {
            this.scrollContainer.nativeElement.scrollTop =
                this.scrollContainer.nativeElement.scrollHeight;
        } catch (err) {}
    }

    // send user question to n8n webhook for ai response
    async sendQuestion(): Promise<void> {
        const currentQuestion = this.question().trim();
        if (!currentQuestion || this.isLoading()) return;

        // add user message to chat
        this.messages.update(msgs => [...msgs, { text: currentQuestion, isUser: true }]);
        this.question.set('');
        this.isLoading.set(true);

        try {
            // call external n8n webhook with question
            const response = await fetch(this.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: currentQuestion })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            // get response text from webhook
            const rawText = await response.text();

            if (!rawText || rawText.trim() === '') {
                throw new Error('Empty response. Make sure the n8n workflow is activated.');
            }

            // parse json response
            let data: ChatResponse;
            try {
                data = JSON.parse(rawText) as ChatResponse;
            } catch {
                throw new Error(`Could not parse response: ${rawText}`);
            }

            if (!data.answer) throw new Error('Missing answer in response');

            // add ai response to chat
            this.messages.update(msgs => [...msgs, {
                text: this.cleanResponse(data.answer),
                isUser: false
            }]);

        } catch (error) {
            // show error message in chat
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Chat error:', errorMessage);
            this.messages.update(msgs => [...msgs, {
                text: 'Sorry, something went wrong. Please try again.',
                isUser: false,
                isError: true
            }]);
        } finally {
            this.isLoading.set(false);
        }
    }

    // clean up response text by removing markdown symbols
    private cleanResponse(text: string): string {
        return text
            .replace(/[*#`~_|]/g, '')
            .replace(/\n{2,}/g, '\n')
            .replace(/^\s*[-•]\s*/gm, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    // send message on enter key press
    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendQuestion();
        }
    }
}