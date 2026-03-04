import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatbotComponent } from './components/chatbot/chatbot';

// root app component that holds the whole angular application
// uses router outlet to load different pages based on routes
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ChatbotComponent],

  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // app title stored in signal for reactive updates
  protected readonly title = signal('frontend-insurance');
}
