import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// email automation section for admin
// send bulk emails to users via n8n webhook
@Component({
  selector: 'app-email-automation-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './email-automation-section.component.html'
})
export class EmailAutomationSectionComponent {

  // all users list from backend db
  @Input() allUsers: any[] = [];

  // refresh users from backend api
  @Output() refreshUsers = new EventEmitter<void>();
  // send email via n8n webhook in parent
  @Output() sendEmail = new EventEmitter<any>();

  // reload users from db
  refresh() {
    this.refreshUsers.emit();
  }

  // trigger email send to user
  email(user: any) {
    this.sendEmail.emit(user);
  }
}