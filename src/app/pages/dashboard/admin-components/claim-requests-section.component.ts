import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// claim requests section for admin
// view and assign officers to pending claims
@Component({
  selector: 'app-claim-requests-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './claim-requests-section.component.html'
})
export class ClaimRequestsSectionComponent {

  // pending claims from backend db
  @Input() pendingClaims: any[] = [];

  // refresh claims from backend api
  @Output() refreshClaims = new EventEmitter<void>();
  // assign officer to claim via backend
  @Output() assignOfficer = new EventEmitter<string>();

  // reload claims from db
  refresh() {
    this.refreshClaims.emit();
  }

  // assign officer to claim in parent
  assign(id: string) {
    this.assignOfficer.emit(id);
  }
}