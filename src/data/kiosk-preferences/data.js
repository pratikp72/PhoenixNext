
export class KioskPreferencesData {

    constructor(){
        this.data = {

            pageInstructions: 'This tool allows you to create \'layouts\' for the Kiosk. A \'layout\' is a collection of the pages and PDFs a patient will see, as well as the order of those pages and PDFs, when they login to the Kiosk.',
            providerDropdownInstructions: 'The \'All Providers\' layout will apply to all providers, while selecting a specific provider will allow you to create and save a layout for patients of that provider, instead of those patients seeing the \'All Providers\' layout.',
            typeDropdownInstructions: 'The \'History Required\' layout will be shown to patients whose latest history on file is older than the amount entered in \'Days Patient History Valid.\' The \'History Current\' layout will be shown if the patient\'s latest history on file is not older than the amount in \'Days Patient History Valid.\' The Type also respects providers, so a selected provider can have both a \'History Required\' as well as a \'History Current\' layout.',
            patientHistoryValidInstructions: 'If the patient\'s latest history is older than the entered amount, or if they have no history on file, they will be shown the \'History Required\' layout. Otherwise, they will see the \'History Current\' layout.',
            layoutInstructions: 'Click and drag the items in the list below to determine the order of the pages and PDFs the patient will see in this layout. Note: PDFs still respect the rules defined in the PDF Administration screen of Phoenix Ortho. Also, a history page will not be shown to the patient if that page has already been completed for the current visit'

        };
    }

}
