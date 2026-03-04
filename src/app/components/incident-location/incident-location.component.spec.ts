import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GooglePlacesInputComponent } from './incident-location.component';

describe('GooglePlacesInputComponent', () => {
    let component: GooglePlacesInputComponent;
    let fixture: ComponentFixture<GooglePlacesInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GooglePlacesInputComponent]
        }).compileComponents();

        fixture = TestBed.createComponent(GooglePlacesInputComponent);
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
