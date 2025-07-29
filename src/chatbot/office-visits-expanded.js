import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';

@autoinject
export class OfficeVisitsExpanded {
    
  static inject = [EventAggregator];
  
  constructor(eventAggregator) {
    this.eventAggregator = eventAggregator;
    this.chatMessages = [];
    this.isVisible = true;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.eventAggregator.subscribe('message-sent', (data) => {
      this.chatMessages.push({
        type: 'user',
        content: data.message
      });
      
      // Simulate assistant response
      setTimeout(() => {
        this.chatMessages.push({
          type: 'assistant',
          content: 'I can help you with that request.'
        });
      }, 1000);
    });

    // Listen for close detail event from the detail component
    this.eventAggregator.subscribe('close-detail', () => {
      this.closeExpanded();
    });

    // Listen for close expanded view event
    this.eventAggregator.subscribe('close-expanded-view', () => {
      this.closeExpanded();
    });
  }

  closeExpanded() {
    this.isVisible = false;

    this.eventAggregator.publish('expanded-view-closed');
  }
}