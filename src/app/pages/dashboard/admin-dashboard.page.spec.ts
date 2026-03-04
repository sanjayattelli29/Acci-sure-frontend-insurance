import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AdminDashboardPage } from './admin-dashboard.page';

describe('AdminDashboardPage', () => {
    let component: AdminDashboardPage;
    let fixture: ComponentFixture<AdminDashboardPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AdminDashboardPage, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(AdminDashboardPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize correctly', () => {
        expect(component).toBeDefined();
    });
});
