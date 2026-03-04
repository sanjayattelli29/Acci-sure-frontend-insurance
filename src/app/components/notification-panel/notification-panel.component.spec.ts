import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NotificationPanelComponent } from './notification-panel.component';

describe('NotificationPanelComponent', () => {
    let component: NotificationPanelComponent;
    let fixture: ComponentFixture<NotificationPanelComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [NotificationPanelComponent, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(NotificationPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle panel', () => {
        expect(component.isOpen()).toBe(false);
        component.togglePanel();
        expect(component.isOpen()).toBe(true);
    });

    it('should be defined', () => {
        expect(component).toBeDefined();
    });
});
