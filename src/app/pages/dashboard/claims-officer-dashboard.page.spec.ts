import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ClaimsOfficerDashboardPage } from './claims-officer-dashboard.page';

describe('ClaimsOfficerDashboardPage', () => {
    let component: ClaimsOfficerDashboardPage;
    let fixture: ComponentFixture<ClaimsOfficerDashboardPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ClaimsOfficerDashboardPage, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(ClaimsOfficerDashboardPage);
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
