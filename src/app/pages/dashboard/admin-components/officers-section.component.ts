import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-officers-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './officers-section.component.html'
})
export class OfficersSectionComponent {

  @Input() officerForm!: FormGroup;
  @Input() officers: any[] = [];
  @Input() isLoading!: boolean;

  @Output() registerOfficer = new EventEmitter<void>();
  @Output() deleteUser = new EventEmitter<string>();

  register() {
    this.registerOfficer.emit();
  }

  delete(id: string) {
    this.deleteUser.emit(id);
  }
}   