import { Component, AfterViewInit, ViewChild, ElementRef, output, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// google maps api type
declare var google: any;

// google places autocomplete input component
// uses google maps api for location search
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
    // ref to input element for google autocomplete
    @ViewChild('searchInput') searchInput!: ElementRef;

    // input properties from parent component
    label = input<string>('Location');
    placeholder = input<string>('Search...');
    types = input<string[]>(['geocode', 'establishment']);

    // emit selected value to parent
    valueSelected = output<string>();
    // NEW: emit full location data with coordinates and components
    locationSelected = output<{
        address: string,
        lat: number,
        lng: number,
        components?: {
            state?: string,
            district?: string,
            area?: string,
            pincode?: string
        }
    }>();

    // setup google places autocomplete after view inits
    ngAfterViewInit() {
        // check if google maps api loaded
        if (typeof google === 'undefined') {
            console.error('Google Maps API not loaded');
            return;
        }

        // create autocomplete instance on input
        const autocomplete = new google.maps.places.Autocomplete(
            this.searchInput.nativeElement,
            {
                types: this.types(), // geocode or establishment
                componentRestrictions: { country: 'in' }, // restrict to india
                fields: ['formatted_address', 'geometry', 'name', 'address_components'] // added address_components
            }
        );

        // listen for place selection from dropdown
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();

            if (!place.geometry || !place.geometry.location) {
                const manualValue = this.searchInput.nativeElement.value;
                this.valueSelected.emit(manualValue);
                return;
            }

            // get selected location string
            const address = place.formatted_address || place.name;
            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            // Extract address components
            const components: any = {};
            if (place.address_components) {
                place.address_components.forEach((c: any) => {
                    if (c.types.includes('postal_code')) components.pincode = c.short_name;
                    if (c.types.includes('administrative_area_level_1')) components.state = c.long_name;
                    if (c.types.includes('administrative_area_level_3') || c.types.includes('locality')) components.district = c.long_name;
                    if (c.types.includes('sublocality_level_1') || c.types.includes('neighborhood')) components.area = c.long_name;
                });
            }

            this.searchInput.nativeElement.value = address;

            // emit both legacy and new detailed event
            this.valueSelected.emit(address);
            this.locationSelected.emit({ address, lat, lng, components });

            console.log('Location selected via Google Places:', { address, lat, lng, components });
        });

        // also emit on manual typing without selection
        this.searchInput.nativeElement.addEventListener('input', (e: any) => {
            this.valueSelected.emit(e.target.value);
        });
    }
}
