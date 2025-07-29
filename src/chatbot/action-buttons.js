// Updated action-buttons.js - Static button opens patient directly
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { http } from '../helpers/http';

@autoinject
export class ActionButtons {
   static inject = [EventAggregator, http];
   
  constructor(eventAggregator, httpService) {
    this.eventAggregator = eventAggregator;
    this.http = httpService;
  }

  selectAction(action) {
    if (action === 'office-visits') {

      this.handleChatbotOfficeVisits();
    } else if (action === 'office-visits-static') {
      this.handleStaticOfficeVisitsOpenPatient();
    } else {
      this.eventAggregator.publish('action-selected', { action });
    }
  }

  handleChatbotOfficeVisits() {
    this.eventAggregator.publish('message-sent', { 
      message: 'Open office visits for Chuck Easttom',
      type: 'user',
      fromButton: true
    });

    var self = this;
    this.callChatbotAPI('Open office visits for Chuck Easttom')
      .then(function(response) {
        self.eventAggregator.publish('message-sent', { 
          message: response,
          type: 'assistant'
        });

        self.eventAggregator.publish('office-visits-requested', {
          patientName: 'Chuck Easttom',
          apiResponse: response
        });
      })
      .catch(function(error) {
        console.error('Error calling chatbot API:', error);
        self.eventAggregator.publish('message-sent', { 
          message: 'Sorry, I encountered an error processing your request.',
          type: 'assistant'
        });
      });
  }


  handleStaticOfficeVisitsOpenPatient() {
    this.eventAggregator.publish('message-sent', { 
      message: 'Open office visits for Chuck Easttom Static',
      type: 'user',
      fromButton: true
    });

    this.eventAggregator.publish('message-sent', { 
      message: 'Opening Chuck Easttom\'s patient record with most recent visit...',
      type: 'assistant'
    });

    this.eventAggregator.publish('open-patient-static', {
      patientId: 'PAT1000000013',
      patientName: 'Chuck Easttom'
    });
  }

  callChatbotAPI(content) {
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        var formData = new FormData();
        formData.append('Content', content);

        var config = {
          processData: false,  
          contentType: false  
        };


        self.http.postNoAuth(
          'http://imenso-002-site5.atempurl.com/chatbot',
          formData,
          function(response) {
      
            resolve(response);
          },
          config,
          function(error) {
  
            console.error('HTTP Error:', error);
            reject(new Error('API call failed: ' + (error.responseText || error.statusText)));
          }
        );

      } catch (error) {
        reject(error);
      }
    });
  }
}