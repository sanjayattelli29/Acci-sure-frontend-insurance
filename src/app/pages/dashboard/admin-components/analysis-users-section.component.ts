import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// analysis users section for admin
// view all users and delete if needed
@Component({
  selector: 'app-analysis-users-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-users-section.component.html'
})
export class AnalysisUsersSectionComponent {

  // all users from backend db
  @Input() allUsers: any[] = [];

  // emit event to delete user from db via api
  @Output() deleteUser = new EventEmitter<string>();

  // trigger user deletion in parent
  delete(id: string) {
    this.deleteUser.emit(id);
  }
}