import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { http } from '../helpers/http';

@autoinject
export class ChatInput {
    static inject = [Element, EventAggregator, http];
    
    constructor(element, eventAggregator, httpService) {
        this.element = element;
        this.eventAggregator = eventAggregator;
        this.http = httpService;
        this.chatText = '';
        this.isRecording = false;
        this.waveformInterval = null;
        this.isLoading = false;
        

        this.useRealAPI = true;
    }

    attached() {
        try {
            this.waveBars = this.element.querySelectorAll('.wave-bar');
        } catch (error) {
            // Ignore error, just continue
        }
    }

    toggleRecording() {
        this.isRecording = !this.isRecording;

        if (this.isRecording) {
            this.startWaveformAnimation();
        } else {
            this.stopWaveformAnimation();
            if (!this.chatText.trim()) {
                this.chatText = "Voice message recorded at " + new Date().toLocaleTimeString();
            }
        }
    }

    startWaveformAnimation() {
        if (this.waveBars && this.waveBars.length > 0) {
            var self = this;
            this.waveformInterval = setInterval(function() {
                self.waveBars.forEach(function(bar) {
                    var height = Math.floor(Math.random() * 16) + 4;
                    bar.style.height = height + 'px';
                });
            }, 150);
        }
    }

    stopWaveformAnimation() {
        if (this.waveformInterval) {
            clearInterval(this.waveformInterval);
            this.waveformInterval = null;
        }

        if (this.waveBars && this.waveBars.length > 0) {
            this.waveBars.forEach(function(bar) {
                bar.style.height = '8px';
            });
        }
    }

    onTranscribeClick() {
        console.log('Transcribe clicked');
    }

    sendMessage() {
        if (this.chatText && this.chatText.trim()) {
            console.log('Sending message:', this.chatText);
            
          
            this.isLoading = true;
            
            
            this.eventAggregator.publish('message-sent', { 
                message: this.chatText,
                type: 'user'
            });

            // Store the message for API call
            var userMessage = this.chatText;
            
            // Clear the input immediately
            this.chatText = '';

            // Call the chatbot API
            var self = this;
            var apiCall = this.useRealAPI ? 
                this.callChatbotAPI(userMessage) : 
                this.callChatbotAPIMock(userMessage);
                
            apiCall
                .then(function(response) {
                    // Publish the assistant response
                    self.eventAggregator.publish('message-sent', { 
                        message: response,
                        type: 'assistant'
                    });

                    // Check if this is an office visits request
                    if (userMessage.toLowerCase().includes('office visits')) {
                        // Extract patient name if possible
                        var patientName = self.extractPatientName(userMessage);
                        if (patientName) {
                            // Trigger the office visits functionality
                            self.handleOfficeVisitsRequest(patientName, response);
                        }
                    }
                })
                .catch(function(error) {
                    console.error('Error calling chatbot API:', error);
                    
                    // If real API fails, try mock as fallback
                    if (self.useRealAPI) {
                        console.log('Real API failed, trying mock response...');
                        self.callChatbotAPIMock(userMessage)
                            .then(function(mockResponse) {
                                self.eventAggregator.publish('message-sent', { 
                                    message: mockResponse + '\n\n(Note: Using simulated response due to API connection issue)',
                                    type: 'assistant'
                                });
                            });
                    } else {
                        self.eventAggregator.publish('message-sent', { 
                            message: 'Sorry, I encountered an error processing your request.',
                            type: 'assistant'
                        });
                    }
                })
                .then(function() {
                    self.isLoading = false;
                });
        }
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
                        // Success callback
                        resolve(response);
                    },
                    config,
                    function(error) {
                        // Error callback
                        console.error('HTTP Error:', error);
                        reject(new Error('API call failed: ' + (error.responseText || error.statusText)));
                    }
                );

            } catch (error) {
                reject(error);
            }
        });
    }

    
    callChatbotAPIFallback(content) {
        return new Promise(function(resolve, reject) {
            try {
                var formData = new FormData();
                formData.append('Content', content);

                var xhr = new XMLHttpRequest();
                
                xhr.onload = function() {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error('HTTP error! status: ' + xhr.status));
                    }
                };

                xhr.onerror = function() {
                    reject(new Error('Network error occurred'));
                };

                xhr.open('POST', 'http://imenso-002-site5.atempurl.com/chatbot', true);
                xhr.send(formData);

            } catch (error) {
                reject(error);
            }
        });
    }

    // Mock API for testing/fallback
    callChatbotAPIMock(content) {
        return new Promise(function(resolve, reject) {
            // Simulate API delay
            setTimeout(function() {
                if (content.toLowerCase().includes('office visits')) {
                    var patientMatch = content.match(/office visits for (.+?)$/i);
                    var name = patientMatch ? patientMatch[1] : 'the patient';
                    
                    resolve('Here are the office visits for ' + name + ':\n\n' +
                           '• 01/15/2025 at 9:00 AM - Scheduled\n' +
                           '• 01/18/2025 at 2:30 PM - Completed\n' +
                           '• 01/22/2025 at 11:15 AM - Scheduled\n' +
                           '• 01/25/2025 at 3:45 PM - Pending\n\n' +
                           'Would you like me to help with any of these appointments?');
                } else if (content.toLowerCase().includes('hip bursitis')) {
                    resolve('Hip Bursitis Protocol has been added to the patient\'s treatment plan. The protocol includes:\n\n' +
                           '• Anti-inflammatory medication\n' +
                           '• Physical therapy exercises\n' +
                           '• Ice therapy instructions\n' +
                           '• Follow-up appointment scheduled');
                } else if (content.toLowerCase().includes('patient count')) {
                    resolve('Dr. Smith saw 127 patients last month. Here\'s the breakdown:\n\n' +
                           '• Week 1: 32 patients\n' +
                           '• Week 2: 35 patients\n' +
                           '• Week 3: 28 patients\n' +
                           '• Week 4: 32 patients');
                } else if (content.toLowerCase().includes('compliance') || content.toLowerCase().includes('mips')) {
                    resolve('Your current MIPS compliance score is 85/100. Areas for improvement:\n\n' +
                           '• Quality measures: 92/100\n' +
                           '• Cost measures: 78/100\n' +
                           '• Improvement activities: 85/100\n' +
                           '• Promoting interoperability: 84/100');
                } else {
                    resolve('I can help you with that request. What would you like me to do next?');
                }
            }, 1000);
        });
    }

    extractPatientName(message) {
        // Extract patient name from message like "Open office visits for Chuck Easttom"
        var match = message.match(/office visits for (.+?)$/i);
        return match ? match[1].trim() : null;
    }

    handleOfficeVisitsRequest(patientName, apiResponse) {
        // Publish an event to handle office visits
        this.eventAggregator.publish('office-visits-requested', {
            patientName: patientName,
            apiResponse: apiResponse
        });
    }

    handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
            return false;
        }
        return true;
    }

    detached() {
        this.stopWaveformAnimation();
    }
}