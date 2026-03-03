import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-section.component.html'
})
export class DashboardSectionComponent {

  @Input() adminStats: any;

  @Output() openCommands = new EventEmitter<void>();

  goToCommands() {
    this.openCommands.emit();
  }
}