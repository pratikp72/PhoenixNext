import {inject, observable} from 'aurelia-framework';
import {Router} from 'aurelia-router';
import {helper} from '../helpers/helper';
import {http} from '../helpers/http';
import {DialogService} from 'aurelia-dialog';
import {PatientSelector} from "./patient-selector";
import {ForeignPatientSelector} from "./foreign-patient-selector";

@inject(helper, http, Router, DialogService)
export class Selection {

  @observable showReconciled = false;
  @observable mode;
  // @observable mode = 'All CCDAs';

  constructor(helper, http, Router, DialogService){
    this.helper = helper;
    this.http = http;
    this.router = Router;
    this.rawCcdas = [];
    this.ccdas = [];
    this.dialogService = DialogService;
    this.locations = [];
    this.selectedLocation = null;
    this.locationsLoaded = false;
    this.loadingMessage = 'loading locations...';
    this.visitCode = null;
    this.visitCodeId = null;
    this.connectEhrPatientId = 0;
    this.visitCCDASelectionTitle = 'Visit CCDA Selection';
    this.allCCDATitle = 'All CCDAs';
    this.mode = this.visitCCDASelectionTitle;
    this.otherMode = this.allCCDATitle;
    this.totalCCDAs = 0;
    this.pageSize = 10;
    this.pageNumber = 1;
    this.pages = [];
    // this.otherMode = 'Visit CCDA Selection';
  }

  pageClicked(page) {
    let self = this;
    self.pageNumber = page;
    self.refreshCcdas();
  }

  showReconciledChanged(newValue, oldValue) {
    console.log(`SHOW RECONCILED CHANGED, new: ${newValue}, old: ${oldValue}`, this.showReconciled);
    this.processDisplayCcdas(newValue);
  }

  modeChanged(newValue, oldValue) {
    console.log('MODE CHANGED', newValue);
  }

  modeClicked() {
    let self = this;
    let tempMode = self.otherMode;
    self.otherMode = self.mode;
    self.mode = tempMode;
    self.refreshCcdas();
  }

  formatDate(date) {
    let self = this;
    return self.helper.getISODateToFormat(date, "MM/DD/YYYY");
  }

  ccdaClicked(ccdaWithPatient){
    let self = this;

    let ccda = ccdaWithPatient.xmlDocument;
    let patients = ccdaWithPatient.phoenixPatients;

    //ccda.tblPatientDemographic.NameFirst
    //ccda.tblPatientDemographic.NameLast
    //ccda.tblPatientDemographic.DateOfBirth
    console.log('CCDA', ccda);

    if(!patients || patients.length < 1){
      alert('No matching patient found.');
      return;
    }

    if(!self.selectedLocation.LocationID){
      alert('You must select a location');
      return;
    } else {
      console.log('selected location', self.selectedLocation);
    }

    if(patients.length > 1){
      self.dialogService.open({viewModel: PatientSelector, model: {patients: patients}}).whenClosed(response => {
        console.log('PATIENT FROM RESPONSE:', response.output);
        self.navigateToReconcilation(response.output.PatientID, ccda.EntryID, self.selectedLocation.LocationID);
        //self.getFaxes();
      });
    } else {
      self.navigateToReconcilation(patients[0].PatientID, ccda.EntryID, self.selectedLocation.LocationID);
    }
  }

  navigateToReconcilation(patientId, xmlDocumentId, locationId) {
    let self = this;
    self.router.navigateToRoute('reconciliation', { patientId: patientId, xmlDocumentId: xmlDocumentId, locationId: locationId, visitCodeId: self.visitCodeId });
  }

  attached(){
    let self = this;
  }

  setShowReconciled() {
    this.showReconciled = !this.showReconciled;
    console.log('SET SHOW RECONCILED', this.showReconciled);
  }

  processDisplayCcdas(show) {
    let self = this;
    self.ccdas = [];
    if(!show){
      for(let i = 0; i < self.rawCcdas.length; i++){
        let current = self.rawCcdas[i];
        if(!current.reconciled){
          self.ccdas.push(current);
        }
      }
    } else {
      self.ccdas = self.rawCcdas;
    }
  }

  processPages(total) {
    let self = this;
    self.totalCCDAs = total;

    let pageCount = Math.ceil(self.totalCCDAs / self.pageSize);

    let minPage = Math.ceil(self.pageNumber - 4);
    if(minPage < 1) {
      minPage = 1;
    }

    let maxPage = Math.ceil(minPage + 9);
    if(maxPage > pageCount) {
      maxPage = pageCount;
    }

    if(pageCount >= 10 && (maxPage - minPage) < 10) {
      minPage = maxPage - 9;
    }

    self.pages = [];

    self.pages.push({
      pageNumber: 1,
      type: 'link'
    });

    if(pageCount <= 1) {
      return;
    }

    if(minPage > 2) {
      self.pages.push({
        type: 'ellipses'
      });
    }

    if(minPage === 1){
      minPage = 2;
    }

    for(let i = minPage; i < maxPage + 1; i++){
      self.pages.push({
        pageNumber: i,
        type: 'link'
      });
    }

    if(pageCount > maxPage) {
      if(pageCount > maxPage + 1) {
        self.pages.push({
          type: 'ellipses'
        });
      }
    }
    if(maxPage < pageCount) {
      self.pages.push({
        pageNumber: pageCount,
        type: 'link'
      });
    }
  }

  refreshCcdas(){
    console.log('REFRESHING CCDAS');
    let self = this;
    self.rawCcdas = [];
    self.ccdas = [];
    let url = '';
    if(self.mode === self.visitCCDASelectionTitle) {
      url = self.helper.getApiUrl(`connectehr/xmldocuments/forpatient?connectEhrPatientId=${self.connectEhrPatientId}&phoenixPatientId=${self.visitCode.PatientID}`);
    }
    if(self.mode === self.allCCDATitle){
      url = self.helper.getApiUrl(`connectehr/xmldocuments?pageSize=${self.pageSize}&pageNumber=${self.pageNumber}`);
    }
    self.http.get(url, (data) => {
      console.log('CCDAS', data);
      self.rawCcdas = data.documents;
      self.processDisplayCcdas(self.showReconciled);
      if(self.mode === self.allCCDATitle){
        self.processPages(data.totalResults);
      }
    });
  }

  activate(params, arg2){
    let self = this;
    if (params.hasOwnProperty('jwt')){
      self.helper.processToken(params.jwt);
    }
    console.log('PARAMS', params);
    if (params.hasOwnProperty('VisitCodeId')){
      self.visitCodeId = params.VisitCodeId;
    }
    // self.refreshCcdas();
    self.http.get(self.helper.getApiUrl(`visitcode/${self.visitCodeId}`), (data) => {
      if(data ){
        console.log('visitcode', data);
        self.visitCode = data;
        self.http.get(self.helper.getApiUrl(`insecure/locations`), (locationData) => {
          if(locationData && locationData.length > 0){
            console.log('locations', locationData);
            self.locations = locationData;
            self.locationsLoaded = true;

            console.log('VISIT LOCATIONID', data);

            for(let i = 0; i < self.locations.length; i++){
              let currentLocation = self.locations[i];
              if(currentLocation.LocationID === self.visitCode.LocationID){
                self.selectedLocation = currentLocation;
                break;
              }
            }

          } else {
            self.loadingMessage = 'No locations';
          }
        });

        self.http.get(self.helper.getApiUrl(`connectehr/patientdemographics/bylocal?localPatientId=${self.visitCode.PatientID}`), (data) => {
          console.log('connectehr patients', data);
          self.dialogService.open({viewModel: ForeignPatientSelector, model: {patients: data}}).whenClosed(response => {
            console.log('PATIENT FROM RESPONSE:', response.output);
            let connectEhrPatient = response.output;
            self.connectEhrPatientId = connectEhrPatient.PatientIdInternal;
            self.refreshCcdas();
          });
        });

      }
    });
  }
}
