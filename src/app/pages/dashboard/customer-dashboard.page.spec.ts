import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CustomerDashboardPage } from './customer-dashboard.page';

describe('CustomerDashboardPage', () => {
    let component: CustomerDashboardPage;
    let fixture: ComponentFixture<CustomerDashboardPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CustomerDashboardPage, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(CustomerDashboardPage);
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
