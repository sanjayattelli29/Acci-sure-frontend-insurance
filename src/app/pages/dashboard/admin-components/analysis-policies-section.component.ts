import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analysis-policies-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-policies-section.component.html'
})
export class AnalysisPoliciesSectionComponent {

  @Input() policyRequests: any[] = [];

  @Output() viewPolicy = new EventEmitter<any>();

  view(policy: any) {
    this.viewPolicy.emit(policy);
  }
}