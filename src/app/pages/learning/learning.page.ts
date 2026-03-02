import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-learning',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './learning.page.html',
    styleUrls: ['./learning.page.css']
})
export class LearningPage {
    constructor() { }

    // Branding and common data can be defined here if needed
    public brandNameLong = 'AcciSure Insurance';
    public brandNameShort = 'AcciSure';

    goBack() {
        window.history.back();
    }
}
