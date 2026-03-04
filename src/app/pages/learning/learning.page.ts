import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// learning page with insurance info and guides
// static informational page for users
@Component({
    selector: 'app-learning',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './learning.page.html',
    styleUrls: ['./learning.page.css']
})
export class LearningPage {
    constructor() { }

    // brand names for display in template
    public brandNameLong = 'AcciSure Insurance';
    public brandNameShort = 'AcciSure';

    // go back to previous page
    goBack() {
        window.history.back();
    }
}
