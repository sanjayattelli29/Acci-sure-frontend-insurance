import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AgentDashboardPage } from './agent-dashboard.page';

describe('AgentDashboardPage', () => {
    let component: AgentDashboardPage;
    let fixture: ComponentFixture<AgentDashboardPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AgentDashboardPage, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(AgentDashboardPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should be defined', () => {
        expect(component).toBeDefined();
    });
});
