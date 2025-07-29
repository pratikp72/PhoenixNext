import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';

@autoinject
export class FloatingChatbot {
  static inject = [EventAggregator];
  
  constructor(eventAggregator) {
    this.eventAggregator = eventAggregator;
    this.isOpen = false;
    this.showMainView = true;
    this.showDetailView = false;
    this.currentDetail = '';
    this.chatMessages = [];
    
    this.setupEventListeners();
  }


setupEventListeners() {
    this.eventAggregator.subscribe('action-selected', (data) => {
      this.handleAction(data.action);
    });

    this.eventAggregator.subscribe('close-detail', () => {
      this.closeDetail();
    });


    this.eventAggregator.subscribe('message-sent', (data) => {
      if (data.type === 'user') {
        this.addUserMessage(data.message);
        
      
        if (!data.fromButton) {
          this.generateAssistantResponse(data.message);
        }
      } else if (data.type === 'assistant') {
        this.addAssistantMessage(data.message);
      }
    });


    this.eventAggregator.subscribe('office-visits-requested', (data) => {
      console.log('FloatingChatbot: Handling chatbot office visits request');
      this.handleOfficeVisitsRequest(data.patientName, data.apiResponse, false, null);
    });

 
    this.eventAggregator.subscribe('open-patient-static', (data) => {
      console.log('FloatingChatbot: Static patient opening for:', data.patientName);
    });


    this.eventAggregator.subscribe('patient-opened-successfully', (data) => {
      this.addAssistantMessage(`✅ Successfully opened ${data.patientName}'s record. ${data.message || ''}`);
    });

    this.eventAggregator.subscribe('patient-not-found', (data) => {
      this.addAssistantMessage(`❌ Patient ${data.patientName} was not found in the current schedule. ${data.message || ''}`);
    });

    this.eventAggregator.subscribe('patient-open-error', (data) => {
      this.addAssistantMessage(`⚠️ Error opening ${data.patientName}'s record: ${data.error}`);
    });
  }

  toggleChatbot() {
    this.isOpen = !this.isOpen;
  }

  closeChatbot() {
    this.isOpen = false;
    this.resetViews();
  }

  goBackToMain() {
    this.chatMessages = [];
    this.showDetailView = false;
    this.currentDetail = '';
    this.showMainView = true;
  }
handleAction(action) {
  if (action === 'office-visits' || action === 'office-visits-static') {
    // These are now handled by the button click logic
    // office-visits -> chatbot API call -> office-visits-requested event
    // office-visits-static -> direct patient opening -> open-patient-static event
  } else {
    // Handle other actions with detail view as before
    this.showDetailView = true;
    this.currentDetail = action;
  }
}

  handleOfficeVisitsRequest(patientName, apiResponse, isStatic, patientData) {
    console.log('FloatingChatbot: Handling office visits request for:', patientName);
    console.log('Static data:', isStatic);
    
    
    if (isStatic && patientData) {
      console.log('Processing static patient data:', patientData);
      

      this.eventAggregator.publish('static-office-visits-requested', {
        patientName: patientName,
        patientData: patientData,
        apiResponse: apiResponse
      });
    } else {
    
    }
  }

  addUserMessage(message) {
    this.chatMessages.push({
      type: 'user',
      content: message,
      timestamp: new Date()
    });
  }

  addAssistantMessage(message) {
    this.chatMessages.push({
      type: 'assistant',
      content: message,
      timestamp: new Date()
    });
  }

  generateOfficeVisitsResponse() {
    setTimeout(() => {
      const response = `Chuck Easttom has the following office visits:

• 01/15/2025 at 9:00 AM - Scheduled
• 01/18/2025 at 2:30 PM - Completed  
• 01/22/2025 at 11:15 AM - Scheduled
• 01/25/2025 at 3:45 PM - Pending

Would you like me to help you with any of these appointments or provide more details?`;
      
      this.addAssistantMessage(response);
    }, 1000);
  }

  generateAssistantResponse(userMessage) {
    // Check if it's an office visits message
    if (userMessage.toLowerCase().includes('office visits')) {
      // Extract patient name
      const patientName = this.extractPatientName(userMessage);
      if (patientName) {
        // Try to find and open the patient record
        this.handleOfficeVisitsRequest(patientName, 'Processing office visits request...', false, null);
      } else {
        this.generateOfficeVisitsResponse();
      }
    } else {
      // Generate generic response for other messages
      setTimeout(() => {
        this.addAssistantMessage('I can help you with that request. What would you like me to do?');
      }, 1000);
    }
  }

  extractPatientName(message) {
    const match = message.match(/office visits for (.+?)$/i);
    return match ? match[1].trim() : null;
  }

  closeDetail() {
    this.showDetailView = false;
    this.currentDetail = '';
  }

  resetViews() {
    this.showMainView = true;
    this.showDetailView = false;
    this.currentDetail = '';
    this.chatMessages = [];
  }
}