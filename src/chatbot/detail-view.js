import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable } from 'aurelia-framework';

@autoinject
export class DetailView {
   static inject = [EventAggregator];
  @bindable detailType;
  
  constructor(eventAggregator) {
    this.eventAggregator = eventAggregator;
    this.detailTitle = '';
    this.detailContent = '';
  }

  detailTypeChanged() {
    this.updateDetailContent();
  }

  updateDetailContent() {
    const detailMap = {
      'hip-bursitis': {
        title: 'Hip Bursitis Protocol',
        content: 'Hip Bursitis Protocol has been added to the patient\'s treatment plan.'
      },
      'patient-count': {
        title: 'Patient Count - Dr. Smith',
        content: 'Dr. Smith saw 127 patients last month.'
      },
      'compliance': {
        title: 'MIPS Compliance 2025',
        content: 'Your current MIPS compliance score is 85/100.'
      },
      'close-note': {
        title: 'Close Office Note',
        content: 'Office note has been closed and saved to patient record.'
      },
      'generate-note': {
        title: 'Generate Office Note',
        content: 'New office note has been generated and is ready for review.'
      }
    };

    const detail = detailMap[this.detailType];
    if (detail) {
      this.detailTitle = detail.title;
      this.detailContent = detail.content;
    }
  }

  closeDetail() {
    this.eventAggregator.publish('close-detail');
  }
}