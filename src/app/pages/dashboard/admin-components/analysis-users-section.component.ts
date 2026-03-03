import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analysis-users-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-users-section.component.html'
})
export class AnalysisUsersSectionComponent {

  @Input() allUsers: any[] = [];

  @Output() deleteUser = new EventEmitter<string>();

  delete(id: string) {
    this.deleteUser.emit(id);
  }
}