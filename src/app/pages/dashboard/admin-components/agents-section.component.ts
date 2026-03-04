import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';

// agents management section for admin
// register new agents and manage existing ones
@Component({
  selector: 'app-agents-section',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agents-section.component.html'
})
export class AgentsSectionComponent {

  // form for creating new agent
  @Input() agentForm!: FormGroup;
  // agents list from backend db
  @Input() agents: any[] = [];
  @Input() isLoading!: boolean;

  // emit event to register agent via api
  @Output() registerAgent = new EventEmitter<void>();
  // emit event to delete agent from db
  @Output() deleteUser = new EventEmitter<string>();

  // trigger agent registration in parent
  register() {
    this.registerAgent.emit();
  }

  // trigger agent deletion in parent
  delete(id: string) {
    this.deleteUser.emit(id);
  }
}