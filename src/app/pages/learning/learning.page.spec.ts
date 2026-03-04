import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { LearningPage } from './learning.page';

describe('LearningPage', () => {
    let component: LearningPage;
    let fixture: ComponentFixture<LearningPage>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LearningPage, HttpClientTestingModule, RouterTestingModule]
        }).compileComponents();

        fixture = TestBed.createComponent(LearningPage);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have the correct brand names', () => {
        expect(component.brandNameLong).toBe('AcciSure Insurance');
        expect(component.brandNameShort).toBe('AcciSure');
    });

    it('should be defined', () => {
        expect(component).toBeDefined();
    });
});
