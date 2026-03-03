import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analysis-commands-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-commands-section.component.html'
})
export class AnalysisCommandsSectionComponent {

  @Input() allClaims: any[] = [];
  @Input() isLoading!: boolean;

  @Output() refreshAudit = new EventEmitter<void>();
  @Output() viewDetails = new EventEmitter<any>();

  refresh() {
    this.refreshAudit.emit();
  }

  view(claim: any) {
    this.viewDetails.emit(claim);
  }
}