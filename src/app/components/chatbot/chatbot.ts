import { Component, signal, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Message {
    text: string;
    isUser: boolean;
    isError?: boolean;
}

interface ChatResponse {
    answer: string;
}

@Component({
    selector: 'app-chatbot',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './chatbot.html',
    styleUrl: './chatbot.css'
})
export class ChatbotComponent implements AfterViewChecked {
    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

    isOpen = signal(false);
    question = signal('');
    messages = signal<Message[]>([
        { text: 'Hi! How can I help you with insurance today?', isUser: false }
    ]);
    isLoading = signal(false);

    private readonly WEBHOOK_URL = 'https://nextglidesol.app.n8n.cloud/webhook/chatbot-bot-1';

    toggleChat(): void {
        this.isOpen.set(!this.isOpen());
    }

    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    private scrollToBottom(): void {
        try {
            this.scrollContainer.nativeElement.scrollTop =
                this.scrollContainer.nativeElement.scrollHeight;
        } catch (err) {}
    }

    async sendQuestion(): Promise<void> {
        const currentQuestion = this.question().trim();
        if (!currentQuestion || this.isLoading()) return;

        this.messages.update(msgs => [...msgs, { text: currentQuestion, isUser: true }]);
        this.question.set('');
        this.isLoading.set(true);

        try {
            const response = await fetch(this.WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: currentQuestion })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const rawText = await response.text();

            if (!rawText || rawText.trim() === '') {
                throw new Error('Empty response. Make sure the n8n workflow is activated.');
            }

            let data: ChatResponse;
            try {
                data = JSON.parse(rawText) as ChatResponse;
            } catch {
                throw new Error(`Could not parse response: ${rawText}`);
            }

            if (!data.answer) throw new Error('Missing answer in response');

            this.messages.update(msgs => [...msgs, {
                text: this.cleanResponse(data.answer),
                isUser: false
            }]);

        } catch (error) {
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

    private cleanResponse(text: string): string {
        return text
            .replace(/[*#`~_|]/g, '')
            .replace(/\n{2,}/g, '\n')
            .replace(/^\s*[-•]\s*/gm, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendQuestion();
        }
    }
}