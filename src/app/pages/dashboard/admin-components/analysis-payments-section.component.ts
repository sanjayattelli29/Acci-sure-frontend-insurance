import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analysis-payments-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-payments-section.component.html'
})
export class AnalysisPaymentsSectionComponent {

  @Input() unifiedPayments: any[] = [];

  @Output() refreshPayments = new EventEmitter<void>();
  @Output() openInvoice = new EventEmitter<any>();

  refresh() {
    this.refreshPayments.emit();
  }

  invoice(payment: any) {
    this.openInvoice.emit(payment);
  }
}