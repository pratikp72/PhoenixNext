import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable } from 'aurelia-framework';

@autoinject
export class ChatbotOverlay {
  static inject = [EventAggregator];
  @bindable isOpen;
  @bindable showMainView;
  @bindable showDetailView;
  @bindable currentDetail;
  @bindable chatMessages;
  @bindable onClose;
  @bindable onBack; // Add back callback
  
  constructor(eventAggregator) {
    this.eventAggregator = eventAggregator;
  }

  closeOverlay() {
    if (this.onClose) {
      this.onClose();
    }
  }

  goBack() {
    // Clear chat messages and return to main view
    if (this.onBack) {
      this.onBack();
    }
  }

  handleBackdropClick(event) {
    // Close if clicking on backdrop (not the modal content)
    if (event.target === event.currentTarget) {
      this.closeOverlay();
    }
  }
}