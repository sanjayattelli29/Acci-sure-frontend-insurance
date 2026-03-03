import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-policy-requests-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './policy-requests-section.component.html'
})
export class PolicyRequestsSectionComponent {

  @Input() policyRequests: any[] = [];

  @Output() refreshData = new EventEmitter<void>();
  @Output() assignAgent = new EventEmitter<string>();
  @Output() viewDetails = new EventEmitter<any>();

  refresh() {
    this.refreshData.emit();
  }

  assign(id: string) {
    this.assignAgent.emit(id);
  }

  view(request: any) {
    this.viewDetails.emit(request);
  }
}