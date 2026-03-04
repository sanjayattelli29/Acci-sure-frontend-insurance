import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// policy requests section for admin
// view and assign agents to pending policies
@Component({
  selector: 'app-policy-requests-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policy-requests-section.component.html'
})
export class PolicyRequestsSectionComponent {

  // pending policy applications from backend
  @Input() policyRequests: any[] = [];

  // refresh policies from db
  @Output() refreshData = new EventEmitter<void>();
  // assign agent to policy via backend api
  @Output() assignAgent = new EventEmitter<string>();
  // view policy details modal
  @Output() viewDetails = new EventEmitter<any>();

  // reload policies from backend
  refresh() {
    this.refreshData.emit();
  }

  // assign agent to policy in parent
  assign(id: string) {
    this.assignAgent.emit(id);
  }

  // show policy details
  view(request: any) {
    this.viewDetails.emit(request);
  }
}