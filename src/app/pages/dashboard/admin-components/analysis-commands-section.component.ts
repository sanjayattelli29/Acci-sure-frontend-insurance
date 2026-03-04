import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// analysis commands section for admin
// audit trail of all claims operations
@Component({
  selector: 'app-analysis-commands-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-commands-section.component.html'
})
export class AnalysisCommandsSectionComponent {

  // all claims from backend for audit
  @Input() allClaims: any[] = [];
  @Input() isLoading!: boolean;

  // refresh claims audit from backend
  @Output() refreshAudit = new EventEmitter<void>();
  // view claim details modal
  @Output() viewDetails = new EventEmitter<any>();

  // reload claims audit from db
  refresh() {
    this.refreshAudit.emit();
  }

  // show claim details in parent
  view(claim: any) {
    this.viewDetails.emit(claim);
  }
}