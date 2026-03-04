import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

// analysis payments section for admin
// view payment records and generate invoices
@Component({
  selector: 'app-analysis-payments-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analysis-payments-section.component.html'
})
export class AnalysisPaymentsSectionComponent {

  // payment records from backend db
  @Input() unifiedPayments: any[] = [];

  // refresh payments from backend api
  @Output() refreshPayments = new EventEmitter<void>();
  // generate invoice pdf for payment
  @Output() openInvoice = new EventEmitter<any>();

  // reload payments from db
  refresh() {
    this.refreshPayments.emit();
  }

  // show invoice modal in parent
  invoice(payment: any) {
    this.openInvoice.emit(payment);
  }
}