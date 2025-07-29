import {inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';

@inject(Router, helper, http)
export class Reconciliation {
    @observable selectedItem;
    @observable addedItems;

    constructor(Router, helper, http){
        console.log('WELCOME TO RECONCILIATION');
        this.router = Router;
        this.message = "CCDA Reconciliation";
        this.helper = helper;
        this.http = http;
        this.patientId = null;
        this.xmlDocumentId = null;
        this.reconciledCCDA = null;
        this.locationId = null;
        this.visitCodeId = null;
        this.ConnectEhrPatient = {};
        this.PhoenixPatient = {};
        this.hasChanges = false;
        this.selectedItem = null;
        this.addedItems = [];
        this.savingMessage = "";
        this.savingInterval = null;
        this.ellipses = "";
        this.saving = false;
        this.counter = 0;
        this.addedItemSelected = false;
        this.incomingItemSelected = false;
    }

    formatDate(date){
        return this.helper.getISODateToFormat(date, 'MM/DD/YYYY');
    }

    backClicked(){
        let self = this;
        self.router.navigateToRoute('selection', {VisitCodeId: self.visitCodeId,jwt: self.helper.jwt()});
    }

    saveFinished(){
        let self = this;
        self.counter = 0;
        clearInterval(self.savingInterval);
        self.saving = false;
        self.savingMessage = "";
        console.log('SAVE FINISHED!');
    }

    startLoadingAnimation(tempMessage){
        let self = this;
        self.savingInterval = setInterval(() => {
            if(self.ellipses.length >= 3){
                self.ellipses = "";
            } else {
                self.ellipses = `${self.ellipses}.`;
            }
            self.savingMessage = `${tempMessage}${self.ellipses}`;
            self.counter++;
            if(self.counter > 10){
                this.saveFinished();
            }
        }, 200);
    }


  saveClicked(){
    let self = this;
        self.saving = true;
        self.startLoadingAnimation("Saving");

        let addedMeds = self.getAddedItemsFromArray(self.PhoenixPatient.Meds);
        let addedAllergies = self.getAddedItemsFromArray(self.PhoenixPatient.Allergies);
        let addedProblems = self.getAddedItemsFromArray(self.PhoenixPatient.Problems);

        self.saveAddedItems(addedMeds, 'rxs/list', () => {
            console.log('FINISHED SAVING MEDS!');
            self.saveAddedItems(addedAllergies, 'patientallergies/list', () => {
                console.log('FINISHED SAVING ALLERGIES!');
                self.saveAddedItems(addedProblems, 'patientdiagnosis/list', () => {
                    console.log('FINISHED SAVING PROBLEMS!');
                    self.saveFinished();
                    self.getInitialData();
                });
            });
        });
    }

    saveAddedItems(addedItems, url, callback){
        console.log('SAVEADDEDITEMS', addedItems);
        if(!addedItems || addedItems.length === 0){
            callback();
            return;
        }
        let self = this;
        let finalUrl = self.helper.getApiUrl(url);
        let formattedData = JSON.stringify(addedItems);
        // let formattedData = addedItems;
        self.http.post(finalUrl, formattedData, (results) => {
            console.log('SAVED SUCCESSFULLY!', results);
            self.updateCCDA(url);
            if(callback){
                callback();
            }
        }, {contentType: 'application/json'});
    }

  receiveClicked() {
    let self = this;
    let url = 'connectehrreconciledccda';
    let finalUrl = self.helper.getApiUrl(url);
    let updatedReconciledCCDA = self.reconciledCCDA;
    updatedReconciledCCDA.VisitCodeID = self.visitCodeId;
    let formattedData = JSON.stringify(updatedReconciledCCDA);
    // let formattedData = addedItems;
    self.http.post(finalUrl, formattedData, (result) => {
      console.log('SAVED SUCCESSFULLY!', result);
      self.reconciledCCDA = result;
    }, {contentType: 'application/json'});
  }

  updateCCDA(addedItemsUrl){
        let self = this;
        console.log('UPDATECCDA', addedItemsUrl);
        console.log('UPDATECCDA', self.reconciledCCDA);
        let finalUrl = self.helper.getApiUrl('connectehrreconciledccda');

        switch (addedItemsUrl) {
            case 'patientdiagnosis/list':
                self.reconciledCCDA.ProblemsReconciled = true;
                break;
            case 'rxs/list':
                self.reconciledCCDA.MedsReconciled = true;
                break;
            case 'patientallergies/list':
                self.reconciledCCDA.AllergiesReconciled = true;
                break;
        }

        let formattedData = JSON.stringify(self.reconciledCCDA);
        self.http.post(finalUrl, formattedData, (data) => {
            console.log('SAVED CCDA SUCCESSFULLY!', data);
            self.reconciledCCDA = data;
        }, {contentType: 'application/json'});
    }

    getAddedItemsFromArray(currentArray){
        if(!currentArray) return null;
        let results = [];
        for(var i = 0; i < currentArray.length; i++){
            let currentItem = currentArray[i];
            if(currentItem.state && currentItem.state === 'added'){
                console.log('GETTING ADDED ITEM', currentItem);
                results.push(currentItem);
            }
        }
        return results;
    }

    isSelected(type, data){
        let self = this;
        let result = 'list-group-item';
        if(self.selectedItem != null && self.selectedItem.type == type && self.selectedItem.id == data.IngID){
            return result;
        }
        return 'selected-item ' + result;
    }

    finalItemClicked(type, data){
        let self = this;
        if(data.state && data.state === 'added'){
            self.incomingItemClicked(type, data);
        }
    }

    incomingItemClicked(type, data){
        let self = this;
        if(self.selectedItem
            && self.selectedItem.type === type
            && self.selectedItem.id === data.lngID){
            console.log('ITEM IS THE SAME AS SELECTED ITEM');
            self.selectedItem = null;
            self.incomingItemSelected = false;
            self.addedItemSelected = false;
            return;
        }
        self.selectedItem = {};
        self.selectedItem.type = type;
        self.selectedItem.data = data;
        self.selectedItem.id = data.lngID;
        if(data.state && data.state === 'added') {
            self.addedItemSelected = true;
            self.incomingItemSelected = false;
        } else {
            self.incomingItemSelected = true;
            self.addedItemSelected = false;
        }
    }

    removeClicked(){
        let self = this;
        let foundSelectedItem = null;
        for(var i = 0; i < self.addedItems.length; i++){
            let currentItem = self.addedItems[i];
            if(currentItem.type === self.selectedItem.type && currentItem.id === self.selectedItem.id){
                console.log('found added item', currentItem);
                foundSelectedItem = currentItem;
                self.addedItems.splice(i, 1);
                break;
            }
        }
        let relevantArray = null;
        switch (self.selectedItem.type) {
            case 'med':
                relevantArray = self.PhoenixPatient.Meds;
                break;
            case 'allergy':
                relevantArray = self.PhoenixPatient.Allergies;
                break;
            case 'problem':
                relevantArray = self.PhoenixPatient.Problems;
                break;
        }
        for(var i = 0; i < relevantArray.length; i++){
            let currentItem = relevantArray[i];
            if(currentItem && currentItem.lngID === self.selectedItem.id){
                relevantArray.splice(i, 1);
                break;
            }
        }
        self.incomingItemClicked(self.selectedItem.type, self.selectedItem.data);
    }

    addClicked(){
        let self = this;
        let containsItem = false;
        for(var i = 0; i < self.addedItems.length; i++){
            let currentItem = self.addedItems[i];
            if(currentItem.type === self.selectedItem.type && currentItem.id === self.selectedItem.id){
                containsItem = true;
                break;
            }
        }
        if(!containsItem){
            let addedItem = {
                type: self.selectedItem.type,
                //id is there for checking if it already exists in the array
                id: self.selectedItem.id
            };
            let data = self.selectedItem.data;
            switch (self.selectedItem.type) {
                case 'med':
                    let med = {
                        RXPatientID: null,
                        DispenseAs: 0,
                        LastRefill: data.LastModified,
                        PatientID: self.PhoenixPatient.Patient.PatientID,
                        // ProviderID: AppData.patientSchedule.Schedule.ProviderID,
                        RX_Status: 'E',
                        Refills: 0,
                        RX_Date: data.LastModified,
                        RX_Description: 'None',
                        RxNormCode: data.Code,
                        RX_Dosage: data.Dose,
                        RX_QTY: 0,
                        RX_Sig: data.MedicationName,
                        RX_Type: '',
                        RX_Name: data.MedicationName,
                        RX_Route: data.Route,
                        RX_Notes: data.AuthorInfo,
                        UserID: 0,
                        Reconciled: new Date(),
                        Show: false,
                        state: 'added',
                        lngID: addedItem.id
                    };
                    self.PhoenixPatient.Meds.push(med);
                    addedItem.data = med;
                    break;
                case 'allergy':
                    let severity = null;
                    switch(data.Severity) {
                        case "Mild":
                            severity = "255604002";
                            break;
                        case "Moderate":
                        case "Mild to moderate":
                            severity = "6736007";
                            break;
                        case "Severe":
                            severity = "24484000";
                            break;
                        default:
                            break;
                    }
                    let allergy = {
                        PatientID: self.PhoenixPatient.Patient.PatientID,
                        Substance: data.AllergySubstance,
                        RxNormCode: data.AllergyCode,
                        Reaction: data.Reaction,
                        Status: 'A',
                        Severity: severity,
                        Show: false,
                        DateCreated: data.LastModified,
                        Reconciled: new Date(),
                        // ProviderID: AppData.patientSchedule.Schedule.ProviderID,
                        // ExamDateTime: AppData.patientSchedule.Schedule.Date
                        state: 'added',
                        lngID: addedItem.id
                    };
                    console.log('ALLERGY', allergy);
                    self.PhoenixPatient.Allergies.push(allergy);
                    addedItem.data = allergy;
                    break;
                case 'problem':
                    let problem = {
                        PatientID: self.PhoenixPatient.Patient.PatientID,
                        // PatientDxDescription: data.ProblemDescription,
                        // PatientDxCode: data.Code,
                        ExamDateTime: data.LastModified,
                        DateModified: data.LastModified,
                        DateCreated: data.LastModified,
                        Status: 'A',
                        Reconciled: new Date(),
                        OD_Patient_Dx_Sno: {
                            SnoConcept: data.Code,
                            ConceptDescription: data.ProblemDescription
                        },
                        state: 'added',
                        lngID: addedItem.id
                    };
                    self.PhoenixPatient.Problems.push(problem);
                    addedItem.data = problem;
                    break;
            }
            self.addedItems.push(addedItem);
            self.hasChanges = true;
            self.incomingItemClicked(self.selectedItem.type, self.selectedItem.data);
            self.selectedItem = null;
        }
    }

    attached(){
        console.log('RECONCILIATION WAS ATTACHED!!!');
        //this.saveClicked();
        let self = this;
    }

    getInitialData(){
        let self = this;
        self.startLoadingAnimation("Loading");
        let url = self.helper.getApiUrl(`connectehr/patientdemographics?patientId=${self.patientId}&xmlDocumentId=${self.xmlDocumentId}&locationId=${self.locationId}`);
        self.http.get(url, (data) => {
            console.log('PATIENT', data);
            self.ConnectEhrPatient = data.ConnectEhrPatient;
            self.PhoenixPatient = data.PhoenixPatient;
            self.reconciledCCDA = data.CCDA;
            self.saveFinished();
        });
    }

    activate(params, arg2){
        let self = this;
        if (params.hasOwnProperty('jwt')){
            self.helper.processToken(params.jwt);
        }
        if (params.hasOwnProperty('patientId')){
            self.patientId = params.patientId;
        }
        if (params.hasOwnProperty('xmlDocumentId')){
            self.xmlDocumentId = params.xmlDocumentId;
        }
        if (params.hasOwnProperty('locationId')){
            self.locationId = params.locationId;
        }
        if (params.hasOwnProperty('visitCodeId')){
            self.visitCodeId = params.visitCodeId;
        }
        self.getInitialData();
    }

}
