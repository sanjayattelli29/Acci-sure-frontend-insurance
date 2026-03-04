import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// admin dashboard section component
// displays stats and quick actions for admin
@Component({
  selector: 'app-dashboard-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-section.component.html'
})
export class DashboardSectionComponent {

  // admin stats from backend api
  @Input() adminStats: any;

  // emit event to open commands section
  @Output() openCommands = new EventEmitter<void>();

  // navigate to audit commands section
  goToCommands() {
    this.openCommands.emit();
  }
}