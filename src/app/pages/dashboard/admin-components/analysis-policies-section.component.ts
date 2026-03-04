import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// analysis policies section for admin
// view all policy applications
@Component({
  selector: 'app-analysis-policies-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-policies-section.component.html'
})
export class AnalysisPoliciesSectionComponent {

  // policy applications from backend db
  @Input() policyRequests: any[] = [];

  // emit event to view policy details modal
  @Output() viewPolicy = new EventEmitter<any>();

  // show policy details in parent
  view(policy: any) {
    this.viewPolicy.emit(policy);
  }
}