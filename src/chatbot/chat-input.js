import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';

@autoinject
export class ChatInput {
    static inject = [Element, EventAggregator];
    
    constructor(element, eventAggregator) {
        this.element = element;
        this.eventAggregator = eventAggregator;
        this.chatText = '';
        this.isRecording = false;
        this.waveformInterval = null;
        this.isLoading = false;
    }

    attached() {
        try {
            this.waveBars = this.element.querySelectorAll('.wave-bar');
        } catch (error) {
            // Ignore error
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
            this.waveformInterval = setInterval(() => {
                this.waveBars.forEach(bar => {
                    const height = Math.floor(Math.random() * 16) + 4;
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
            this.waveBars.forEach(bar => {
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

            var userMessage = this.chatText;
            
            this.chatText = '';

        
            var self = this;
            this.callChatbotAPI(userMessage)
                .then(function(response) {
        
                    self.eventAggregator.publish('message-sent', { 
                        message: response,
                        type: 'assistant'
                    });

    
                    if (userMessage.toLowerCase().includes('office visits')) {
    
                        var patientName = self.extractPatientName(userMessage);
                        if (patientName) {
                       
                            self.handleOfficeVisitsRequest(patientName, response);
                        }
                    }
                })
                .catch(function(error) {
                    console.error('Error calling chatbot API:', error);
                    self.eventAggregator.publish('message-sent', { 
                        message: 'Sorry, I encountered an error processing your request.',
                        type: 'assistant'
                    });
                })
                .then(function() {
                    self.isLoading = false;
                });
        }
    }

    callChatbotAPI(content) {
        return new Promise(function(resolve, reject) {
            try {
        
                var formData = new FormData();
                formData.append('Content', content);

        
                var xhr = new XMLHttpRequest();
                
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            resolve(xhr.responseText);
                        } else {
                            reject(new Error('HTTP error! status: ' + xhr.status));
                        }
                    }
                };

                xhr.onerror = function() {
                    reject(new Error('Network error occurred'));
                };

                xhr.onload = function() {
                    if (xhr.status === 200) {
                        resolve(xhr.responseText);
                    } else {
                        reject(new Error('HTTP error! status: ' + xhr.status));
                    }
                };

        
                xhr.withCredentials = false;
                xhr.open('POST', 'http://imenso-002-site5.atempurl.com/chatbot', true);
                
            
                try {
                    xhr.setRequestHeader('Content-Type', 'multipart/form-data');
                } catch (e) {
                
                }
                
                xhr.setRequestHeader('Accept', '*/*');
                xhr.send(formData);

            } catch (error) {
                reject(error);
            }
        });
    }

    extractPatientName(message) {
        var match = message.match(/office visits for (.+?)$/i);
        return match ? match[1].trim() : null;
    }

    handleOfficeVisitsRequest(patientName, apiResponse) {
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