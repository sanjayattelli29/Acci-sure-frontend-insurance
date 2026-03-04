import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ChatbotComponent } from './chatbot';

describe('ChatbotComponent', () => {
    let component: ChatbotComponent;
    let fixture: ComponentFixture<ChatbotComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChatbotComponent, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(ChatbotComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create the chatbot component', () => {
        expect(component).toBeTruthy();
    });

    it('should be defined', () => {
        expect(component).toBeDefined();
    });
});
