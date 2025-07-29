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
        this.audioFile = null; // To store the selected or recorded audio file
        
        // API Configuration
        this.apiUrl = 'http://imenso-002-site5.atempurl.com/chatbot';
        this.useRealAPI = true;
        this.maxRetries = 2;
    }

    attached() {
        try {
            this.waveBars = this.element.querySelectorAll('.wave-bar');
        } catch (error) {
            console.warn('Wave bars not found:', error);
        }
    }

    toggleRecording() {
        this.isRecording = !this.isRecording;

        if (this.isRecording) {
            this.startWaveformAnimation();
            // Simulate recording and set audio file (replace with actual recording logic)
            this.audioFile = new File(['dummy audio content'], 'WhatsAppAudio_20_03.35.70e8f613.opus', { type: 'audio/opus' });
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
        console.log('Transcribe clicked - feature to be implemented');
        // TODO: Implement transcription functionality
    }

    sendMessage() {
        if (!this.chatText && !this.audioFile) {
            return;
        }

        if (this.isLoading) {
            console.log('Already processing a message...');
            return;
        }

        console.log('Sending message:', this.chatText);
        
        this.isLoading = true;
        
        // Publish user message immediately
        this.eventAggregator.publish('message-sent', { 
            message: this.chatText || 'Voice message',
            type: 'user'
        });

        // Store the message for API call
        var userMessage = this.chatText || '';

        // Clear the input immediately for better UX
        this.chatText = '';

        // Prepare API options
        var apiOptions = {
            audioFile: this.audioFile,
            providerId: 1, // Example provider ID, replace with dynamic value if needed
            patientId: 1000000013 // Example patient ID, replace with dynamic value if needed
        };
        this.audioFile = null; // Reset audio file after sending

        // Call the chatbot API with retry logic
        this.callChatbotAPIWithRetry(userMessage, 0, apiOptions)
            .then((response) => {
                this.handleSuccessfulResponse(response, userMessage);
            })
            .catch((error) => {
                this.handleAPIError(error, userMessage);
            })
            .finally(() => {
                this.isLoading = false;
            });
    }

    callChatbotAPIWithRetry(content, retryCount, options = {}) {
        var self = this;
        return new Promise(function(resolve, reject) {
            self.callChatbotAPI(content, options)
                .then(resolve)
                .catch(function(error) {
                    console.error(`API call failed (attempt ${retryCount + 1}):`, error);
                    
                    if (retryCount < self.maxRetries) {
                        console.log(`Retrying... (${retryCount + 1}/${self.maxRetries})`);
                        setTimeout(function() {
                            self.callChatbotAPIWithRetry(content, retryCount + 1, options)
                                .then(resolve)
                                .catch(reject);
                        }, 1000 * (retryCount + 1)); // Exponential backoff
                    } else {
                        reject(error);
                    }
                });
        });
    }

    callChatbotAPI(content, options = {}) {
        var self = this;
        return new Promise(function(resolve, reject) {
            try {
                console.log('Making API call to:', self.apiUrl);
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
                console.log('FormData contents:');
                for (let pair of formData.entries()) {
                    console.log(`${pair[0]}: ${pair[1]}`);
                }

                var config = {
                    processData: false,  
                    contentType: false,
                    timeout: 30000, // 30 second timeout
                    headers: {
                        // Don't set Content-Type header - let browser set it with boundary
                        'Accept': 'application/json, text/plain, */*'
                    }
                };

                self.http.postNoAuth(
                    self.apiUrl,
                    formData,
                    function(response) {
                        console.log('API Response received:', response);
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
                            console.log('Response is not JSON, returning as-is');
                            resolve(response);
                        }
                    },
                    config,
                    function(error) {
                        console.error('HTTP Error details:', {
                            status: error.status,
                            statusText: error.statusText,
                            responseText: error.responseText,
                            readyState: error.readyState
                        });
                        reject(new Error(`API call failed: ${error.status} - ${error.statusText || 'Network Error'}`));
                    }
                );

            } catch (error) {
                console.error('Exception in API call:', error);
                reject(error);
            }
        });
    }

    handleSuccessfulResponse(response, userMessage) {
        console.log('Processing successful API response');
        
        // Publish the assistant response
        this.eventAggregator.publish('message-sent', { 
            message: response,
            type: 'assistant'
        });

        // Handle specific response types
        this.handleSpecialResponses(userMessage, response);
    }

    handleAPIError(error, userMessage) {
        console.error('Final API error after retries:', error);
        
        // Try mock response as fallback
        if (this.useRealAPI) {
            console.log('API failed, using mock response as fallback...');
            this.callChatbotAPIMock(userMessage)
                .then((mockResponse) => {
                    this.eventAggregator.publish('message-sent', { 
                        message: mockResponse + '\n\n(Note: Using simulated response due to API connection issue)',
                        type: 'assistant'
                    });
                    this.handleSpecialResponses(userMessage, mockResponse);
                })
                .catch((mockError) => {
                    console.error('Mock API also failed:', mockError);
                    this.publishErrorMessage();
                });
        } else {
            this.publishErrorMessage();
        }
    }

    publishErrorMessage() {
        this.eventAggregator.publish('message-sent', { 
            message: 'Sorry, I encountered an error processing your request. Please try again.',
            type: 'assistant'
        });
    }

    handleSpecialResponses(userMessage, response) {
        // Check if this is an office visits request
        if (userMessage.toLowerCase().includes('office visits')) {
            var contextInfo = this.extractContextFromMessage(userMessage);
            if (contextInfo.patientName) {
                this.handleOfficeVisitsRequest(contextInfo.patientName, response);
            }
        }
        
        // Handle other special response types
        if (userMessage.toLowerCase().includes('hip bursitis')) {
            this.eventAggregator.publish('protocol-added', {
                protocol: 'Hip Bursitis',
                response: response
            });
        }
    }

    // Enhanced mock API with more realistic responses
    callChatbotAPIMock(content) {
        return new Promise(function(resolve, reject) {
            // Simulate network delay
            setTimeout(function() {
                try {
                    var response = '';
                    var lowerContent = content.toLowerCase();
                    
                    if (lowerContent.includes('office visits')) {
                        var patientMatch = content.match(/office visits for (.+?)$/i);
                        var name = patientMatch ? patientMatch[1].trim() : 'the patient';
                        
                        response = `Here are the office visits for ${name}:\n\n` +
                                 '• 01/15/2025 at 9:00 AM - Scheduled\n' +
                                 '• 01/18/2025 at 2:30 PM - Completed\n' +
                                 '• 01/22/2025 at 11:15 AM - Scheduled\n' +
                                 '• 01/25/2025 at 3:45 PM - Pending\n\n' +
                                 'Would you like me to help with any of these appointments?';
                                 
                    } else if (lowerContent.includes('hip bursitis')) {
                        response = 'Hip Bursitis Protocol has been added to the patient\'s treatment plan. The protocol includes:\n\n' +
                                 '• Anti-inflammatory medication (Ibuprofen 600mg TID)\n' +
                                 '• Physical therapy exercises (3x weekly)\n' +
                                 '• Ice therapy instructions (15-20 min, 3-4x daily)\n' +
                                 '• Follow-up appointment scheduled in 2 weeks\n\n' +
                                 'The protocol has been saved to the patient\'s chart.';
                                 
                    } else if (lowerContent.includes('patient count') || lowerContent.includes('dr. smith')) {
                        response = 'Dr. Smith saw 127 patients last month. Here\'s the breakdown:\n\n' +
                                 '• Week 1: 32 patients\n' +
                                 '• Week 2: 35 patients\n' +
                                 '• Week 3: 28 patients\n' +
                                 '• Week 4: 32 patients\n\n' +
                                 'This represents a 12% increase from the previous month.';
                                 
                    } else if (lowerContent.includes('compliance') || lowerContent.includes('mips')) {
                        response = 'Your current MIPS compliance score is 85/100. Areas breakdown:\n\n' +
                                 '• Quality measures: 92/100 ✅\n' +
                                 '• Cost measures: 78/100 ⚠️\n' +
                                 '• Improvement activities: 85/100\n' +
                                 '• Promoting interoperability: 84/100\n\n' +
                                 'Recommendation: Focus on cost optimization measures to improve overall score.';
                                 
                    } else if (lowerContent.includes('close note')) {
                        response = 'Office note has been successfully closed and saved to the patient\'s electronic health record. The note is now available for review and billing purposes.';
                        
                    } else if (lowerContent.includes('generate note')) {
                        response = 'New office note has been generated based on the current patient encounter. The note includes:\n\n' +
                                 '• Chief complaint and history\n' +
                                 '• Physical examination findings\n' +
                                 '• Assessment and plan\n' +
                                 '• Recommended follow-up\n\n' +
                                 'Please review and sign the note to complete the documentation.';
                    } else {
                        response = 'I understand your request. How can I assist you further with this matter?';
                    }
                    
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            }, Math.random() * 1000 + 500); // Random delay between 500-1500ms
        });
    }

    // Helper method to extract context information from user messages
    extractContextFromMessage(message) {
        var context = {};
        
        // Extract patient information
        var patientMatch = message.match(/(?:for|patient)\s+(.+?)(?:\s|$)/i);
        if (patientMatch) {
            var patientName = patientMatch[1].trim();
            // Map patient names to IDs (you should implement this based on your data)
            context.patientId = this.getPatientIdByName(patientName);
            context.patientName = patientName;
        }
        
        // You can add more context extraction logic here
        return context;
    }

    // Helper method to get patient ID by name (implement based on your data source)
    getPatientIdByName(patientName) {
        // This should be replaced with actual patient lookup logic
        var patientMap = {
            'Chuck Easttom': 1000000013,
            'Sandra McCune': 1000000014,
            // Add more patient mappings as needed
        };
        
        return patientMap[patientName] || null;
    }

    // Helper methods to get current application context (implement based on your app)
    getCurrentProviderId() {
        // This should return the current provider ID from your application state
        // For now, returning null - implement based on your app's provider management
        return null;
    }

    getCurrentPatientId() {
        // This should return the current patient ID from your application state
        // For now, returning null - implement based on your app's patient management
        return null;
    }

    handleOfficeVisitsRequest(patientName, apiResponse) {
        // Publish an event to handle office visits
        this.eventAggregator.publish('office-visits-requested', {
            patientName: patientName,
            apiResponse: apiResponse,
            timestamp: new Date()
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
        this.isLoading = false;
    }
}