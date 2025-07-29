import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { http } from '../helpers/http';

@autoinject
export class ActionButtons {
   static inject = [EventAggregator, http];
   
  constructor(eventAggregator, httpService) {
    this.eventAggregator = eventAggregator;
    this.http = httpService;
    this.apiUrl = 'http://imenso-002-site5.atempurl.com/chatbot';
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
    var apiOptions = {
      patientId: this.getPatientIdByName('Chuck Easttom'), // Convert name to ID
      audioFile: new File(['dummy audio content'], 'WhatsAppAudio_20_03.35.70e8f613.opus', { type: 'audio/opus' }) // Example audio file
    };

    this.callChatbotAPI('Open office visits for Chuck Easttom', apiOptions)
      .then(function(response) {
        // Handle different response formats
        var responseText = typeof response === 'string' ? response : JSON.stringify(response);
        
        self.eventAggregator.publish('message-sent', { 
          message: responseText,
          type: 'assistant'
        });

        self.eventAggregator.publish('office-visits-requested', {
          patientName: 'Chuck Easttom',
          patientId: apiOptions.patientId,
          apiResponse: responseText
        });
      })
      .catch(function(error) {
        console.error('Error calling chatbot API:', error);
        self.eventAggregator.publish('message-sent', { 
          message: 'Sorry, I encountered an error processing your request. Please try again.',
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

  callChatbotAPI(content, options = {}) {
    var self = this;
    return new Promise(function(resolve, reject) {
      try {
        console.log('ActionButtons: Making API call to:', self.apiUrl);
        console.log('Content:', content);
        console.log('Options:', options);

        var formData = new FormData();
        
        // Required field
        formData.append('Content', content || '');
        
        // Optional fields based on API specification
        if (options.audioFile instanceof File) {
          formData.append('AudioFile', options.audioFile);
        }
        
        if (options.providerId && typeof options.providerId === 'number') {
          formData.append('ProviderId', options.providerId.toString());
        }
        
        if (options.patientId && typeof options.patientId === 'number') {
          formData.append('PatientId', options.patientId.toString());
        }

        // Log FormData contents for debugging
        console.log('ActionButtons FormData contents:');
        for (let pair of formData.entries()) {
          console.log(`${pair[0]}: ${pair[1]}`);
        }

        var config = {
          processData: false,  
          contentType: false,
          timeout: 30000,
          headers: {
            'Accept': 'application/json, text/plain, */*'
          }
        };

        self.http.postNoAuth(
          self.apiUrl,
          formData,
          function(response) {
            console.log('ActionButtons: API Response received:', response);
            try {
              // Try to parse as JSON if it's a string
              if (typeof response === 'string') {
                var jsonResponse = JSON.parse(response);
                resolve(jsonResponse);
              } else {
                resolve(response);
              }
            } catch (parseError) {
              // If JSON parsing fails, return the raw response
              console.log('ActionButtons: Response is not JSON, returning as-is');
              resolve(response);
            }
          },
          config,
          function(error) {
            console.error('ActionButtons HTTP Error:', {
              status: error.status,
              statusText: error.statusText,
              responseText: error.responseText,
              readyState: error.readyState
            });
            reject(new Error(`API call failed: ${error.status} - ${error.statusText || 'Network Error'}`));
          }
        );

      } catch (error) {
        console.error('ActionButtons: Exception in API call:', error);
        reject(error);
      }
    });
  }

  // Helper method to get patient ID by name
  getPatientIdByName(patientName) {
    // Map patient names to IDs - replace with your actual patient data
    var patientMap = {
      'Chuck Easttom': 1000000013,
      'Sandra McCune': 1000000014,
      // Add more patient mappings as needed
    };
    
    return patientMap[patientName] || null;
  }

  // Helper method to get current provider ID (implement based on your app context)
  getCurrentProviderId() {
    // This should return the current provider ID from your application state
    // For now, returning a default value - implement based on your app's provider management
    return 1; // Replace with actual provider ID logic
  }
}