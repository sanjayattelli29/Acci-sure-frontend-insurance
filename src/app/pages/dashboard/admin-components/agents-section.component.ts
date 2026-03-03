import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-agents-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agents-section.component.html'
})
export class AgentsSectionComponent {

  @Input() agentForm!: FormGroup;
  @Input() agents: any[] = [];
  @Input() isLoading!: boolean;

  @Output() registerAgent = new EventEmitter<void>();
  @Output() deleteUser = new EventEmitter<string>();

  register() {
    this.registerAgent.emit();
  }

  delete(id: string) {
    this.deleteUser.emit(id);
  }
}