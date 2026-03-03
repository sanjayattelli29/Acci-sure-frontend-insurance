import { Component, AfterViewInit, ViewChild, ElementRef, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

declare var google: any;

@Component({
    selector: 'app-google-places-input',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="space-y-2">
            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{{ label() }}</label>
            <input 
                #searchInput 
                type="text" 
                [placeholder]="placeholder()"
                class="w-full bg-white border-2 border-slate-100 rounded-2xl px-6 py-4 text-xs font-bold text-brand-navy focus:border-brand-orange focus:ring-0 transition-all" 
            />
        </div>
    `
})
export class GooglePlacesInputComponent implements AfterViewInit {
    @ViewChild('searchInput') searchInput!: ElementRef;

    label = input<string>('Location');
    placeholder = input<string>('Search...');
    types = input<string[]>(['geocode', 'establishment']);

    valueSelected = output<string>();

    ngAfterViewInit() {
        if (typeof google === 'undefined') {
            console.error('Google Maps API not loaded');
            return;
        }

        const autocomplete = new google.maps.places.Autocomplete(
            this.searchInput.nativeElement,
            {
                types: this.types(),
                componentRestrictions: { country: 'in' }
            }
        );

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (!place.formatted_address && !place.name) return;

            const selectedValue = place.formatted_address || place.name;
            this.searchInput.nativeElement.value = selectedValue;
            this.valueSelected.emit(selectedValue);
        });

        // Sync initial value if needed or handle manual typing
        this.searchInput.nativeElement.addEventListener('input', (e: any) => {
            this.valueSelected.emit(e.target.value);
        });
    }
}
