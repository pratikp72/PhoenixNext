export class ChatbotAPIResponseHandler {
  
  static parsePatientData(responseText, patientName) {
    try {
      // Try to parse as JSON first
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        // If not JSON, treat as plain text and extract information
        parsedResponse = this.parseTextResponse(responseText, patientName);
      }

      return this.extractPatientInfo(parsedResponse, patientName);
    } catch (error) {
      console.error('Error parsing patient data:', error);
      return null;
    }
  }

  static parseTextResponse(responseText, patientName) {
    // Parse plain text response to extract patient information
    const result = {
      patientName: patientName,
      visits: [],
      success: true
    };

    // Look for visit patterns in the text
    const visitPattern = /(\d{2}\/\d{2}\/\d{4})\s+at\s+(\d{1,2}:\d{2}\s+[AP]M)\s+-\s+(\w+)/g;
    let match;
    
    while ((match = visitPattern.exec(responseText)) !== null) {
      result.visits.push({
        date: match[1],
        time: match[2],
        status: match[3]
      });
    }

    return result;
  }

  static extractPatientInfo(parsedResponse, patientName) {
    // Extract patient information based on the response structure
    const patientInfo = {
      patientId: null,
      providerId: null,
      locationId: null,
      visits: [],
      success: false
    };

    if (parsedResponse) {
      // Handle different response formats
      if (parsedResponse.patientId) {
        patientInfo.patientId = parsedResponse.patientId;
      } else if (patientName === 'Chuck Easttom') {
        // Fallback for known patients - REPLACE WITH ACTUAL PATIENT ID
        patientInfo.patientId = this.getKnownPatientId(patientName);
      }

      if (parsedResponse.providerId) {
        patientInfo.providerId = parsedResponse.providerId;
      }

      if (parsedResponse.locationId) {
        patientInfo.locationId = parsedResponse.locationId;
      }

      if (parsedResponse.visits && Array.isArray(parsedResponse.visits)) {
        patientInfo.visits = parsedResponse.visits;
      }

      patientInfo.success = true;
    }

    return patientInfo;
  }

  static getKnownPatientId(patientName) {
    // Map known patient names to their IDs - REPLACE WITH YOUR ACTUAL PATIENT IDs
    const patientIdMap = {
      'Chuck Easttom': 'CHUCK_EASTTOM_001', // Replace with actual patient ID
      'Sandra McCune': 'SANDRA_MCCUNE_001'  // Replace with actual patient ID
    };

    return patientIdMap[patientName] || null;
  }

  static formatVisitsForChat(visits) {
    if (!visits || visits.length === 0) {
      return 'No visits found.';
    }

    let formattedVisits = 'Office visits:\n\n';
    visits.forEach(visit => {
      formattedVisits += `• ${visit.date} at ${visit.time} - ${visit.status}\n`;
    });

    return formattedVisits;
  }

  static createScheduleObject(patientInfo) {
    // Create a schedule object compatible with your existing system
    return {
      ProviderID: patientInfo.providerId || 0,
      LocationID: patientInfo.locationId || 1 // Default location ID - REPLACE WITH YOUR DEFAULT
    };
  }
}