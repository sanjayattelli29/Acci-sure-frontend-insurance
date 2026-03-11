import { Component, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';

declare var google: any;

@Component({
    selector: 'app-location-map',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="map-container relative overflow-hidden rounded-3xl border-2 border-slate-100 shadow-sm mt-4 animate-in fade-in duration-500">
            <div #mapContainer class="w-full h-48 md:h-64 bg-slate-50"></div>
            @if (!lat || !lng) {
                <div class="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-[2px] z-10 transition-opacity">
                    <div class="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-300 mb-2 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Select a location to see map</p>
                </div>
            }
        </div>
    `,
    styles: [`
        .map-container {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .map-container:hover {
            border-color: rgba(var(--brand-orange-rgb, 255, 107, 53), 0.2);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        }
    `]
})
export class LocationMapComponent implements OnChanges, AfterViewInit {
    @ViewChild('mapContainer') mapContainer!: ElementRef;

    @Input() lat: number | null = null;
    @Input() lng: number | null = null;
    @Input() address: string | null = null;
    @Input() zoom: number = 15;

    private map: any;
    private marker: any;
    private geocoder: any;

    ngAfterViewInit() {
        if (typeof google !== 'undefined') {
            this.geocoder = new google.maps.Geocoder();
        }
        this.processLocation();
    }

    ngOnChanges(changes: SimpleChanges) {
        if ((changes['lat'] || changes['lng'] || changes['address']) && this.mapContainer) {
            this.processLocation();
        }
    }

    private processLocation() {
        const currentLat = this.lat;
        const currentLng = this.lng;

        if (currentLat && currentLng) {
            this.initOrUpdateMap({ lat: currentLat, lng: currentLng });
        } else if (this.address && this.geocoder) {
            this.geocoder.geocode({ address: this.address }, (results: any, status: any) => {
                if (status === 'OK' && results[0]) {
                    const loc = results[0].geometry.location;
                    const geocodedLat = loc.lat();
                    const geocodedLng = loc.lng();
                    this.lat = geocodedLat;
                    this.lng = geocodedLng;
                    this.initOrUpdateMap({ lat: geocodedLat, lng: geocodedLng });
                }
            });
        }
    }

    private initOrUpdateMap(position: { lat: number, lng: number }) {
        if (typeof google === 'undefined' || !this.mapContainer) return;

        if (!this.map) {
            this.map = new google.maps.Map(this.mapContainer.nativeElement, {
                center: position,
                zoom: this.zoom,
                disableDefaultUI: true,
                zoomControl: true,
                styles: [
                    {
                        "featureType": "all",
                        "elementType": "labels.text.fill",
                        "stylers": [{ "color": "#616770" }]
                    },
                    {
                        "featureType": "administrative",
                        "elementType": "geometry.fill",
                        "stylers": [{ "color": "#e9ebed" }]
                    }
                ]
            });

            this.marker = new google.maps.Marker({
                position: position,
                map: this.map,
                animation: google.maps.Animation.DROP,
                icon: {
                    path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                    scale: 5,
                    fillColor: "#ff6b35",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "#ffffff"
                }
            });
        } else {
            this.map.setCenter(position);
            if (this.marker) {
                this.marker.setPosition(position);
            } else {
                this.marker = new google.maps.Marker({
                    position: position,
                    map: this.map,
                    icon: {
                        path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                        scale: 5,
                        fillColor: "#ff6b35",
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "#ffffff"
                    }
                });
            }
        }
    }
}
