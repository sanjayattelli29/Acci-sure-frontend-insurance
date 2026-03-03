import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-claim-requests-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './claim-requests-section.component.html'
})
export class ClaimRequestsSectionComponent {

  @Input() pendingClaims: any[] = [];

  @Output() refreshClaims = new EventEmitter<void>();
  @Output() assignOfficer = new EventEmitter<string>();

  refresh() {
    this.refreshClaims.emit();
  }

  assign(id: string) {
    this.assignOfficer.emit(id);
  }
}