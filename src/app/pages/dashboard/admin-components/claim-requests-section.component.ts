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

  // view details of claim
  @Output() viewDetails = new EventEmitter<any>();
  @Output() refreshClaims = new EventEmitter<void>();
  @Output() assignOfficer = new EventEmitter<string>();

  // reload claims from db
  refresh() {
    this.refreshClaims.emit();
  }

  // assign officer to claim in parent
  assign(id: string) {
    this.assignOfficer.emit(id);
  }

  // view full details in modal
  viewData(claim: any) {
    this.viewDetails.emit(claim);
  }
}