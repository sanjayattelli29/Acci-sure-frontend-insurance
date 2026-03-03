import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-email-automation-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-automation-section.component.html'
})
export class EmailAutomationSectionComponent {

  @Input() allUsers: any[] = [];

  @Output() refreshUsers = new EventEmitter<void>();
  @Output() sendEmail = new EventEmitter<any>();

  refresh() {
    this.refreshUsers.emit();
  }

  email(user: any) {
    this.sendEmail.emit(user);
  }
}