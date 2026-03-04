import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

// claims officers management section for admin
// register new officers and manage existing ones
@Component({
  selector: 'app-officers-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './officers-section.component.html'
})
export class OfficersSectionComponent {

  // form for creating new officer
  @Input() officerForm!: FormGroup;
  // officers list from backend db
  @Input() officers: any[] = [];
  @Input() isLoading!: boolean;

  // emit event to register officer via api
  @Output() registerOfficer = new EventEmitter<void>();
  // emit event to delete officer from db
  @Output() deleteUser = new EventEmitter<string>();

  // trigger officer registration in parent
  register() {
    this.registerOfficer.emit();
  }

  // trigger officer deletion in parent
  delete(id: string) {
    this.deleteUser.emit(id);
  }
}   