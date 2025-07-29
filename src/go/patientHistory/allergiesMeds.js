import {helper} from '../../helpers/helper';
import {http} from '../../helpers/http';
import {inject, bindable, observable} from 'aurelia-framework';
import {Home} from '../home';
import {Data} from '../../data/go/data';
import * as _ from 'lodash';
import moment from "moment";
import {EventAggregator} from 'aurelia-event-aggregator';

class drug {
  constructor(name, data){
    this.name = name;
    this.data = data;
    this.visible = true;
  }

  @observable selectedReaction;

  selectedReactionChanged(newVal, oldVal){
    this.data.Reaction = newVal;
  }
}

@inject(helper,http, Data, Home,EventAggregator )
export class AllergiesMeds {


  allergySearch="";
  medSearch="";
  history;
  allergies=[];
  meds=[];
  parent=null;
  allergySearchResult=[];
  medSearchResult=[];

  allergyReactionList=["unknown",
  "anaphylaxis",
  "coughing",
  "diarrhea",
  "difficulty breathing",
  "headache",
  "hives",
  "itching nose, mouth, throat",
  "red eyes",
  "runny nose",
  "tearing, burning or itching eyes",
  "skin rashes",
  "stomach cramps",
  "swollen eyes",
  "vomiting",
  "wheezing"];

  searchVisible=false;

  saveAlgMed = false;

  constructor(helper, http, Data, Home, EventAggregator) {
    this.helper = helper;
    this.http = http;
    this.data = Data;
    this.home = Home;
    this.event = EventAggregator;
  }

  activate(model) {
    let self = this;
    self.history = model.history;
    self.parent = model;
    self.saveAlgMed = model.saveHx;
  }


  load(){
    let self = this;

    self.data.getPatientAllergiesMeds(self.parent.demographics.patient.data.PatientID, function (res) {

      let allergies = res.Allergies;
      let meds = res.Medications;

      //let nkda = self.checkForNoKnowDrugAllergies(allergies);
      //self.noKnownDrugAllergiesCheckbox = self.parent.getNewHistoryButton("No Known Drug Allergies", nkda);

      for(let i = 0; i < allergies.length; i++){
        let aDrug = allergies[i];
        var nkda = self.checkForNoKnowDrugAllergies(aDrug);
        if(nkda){
          self.parent.history.allergies.noKnownDrugAllergies.selected = true;
          self.parent.history.allergies.noKnownDrugAllergies.visible = true;
        }else{
          let newDrug = new drug(aDrug.Substance, aDrug);
          newDrug.selectedReaction = aDrug.Reaction;
          self.allergies.push(newDrug);
        }
      }

      for(let i = 0; i < meds.length; i++){
        let aMed = meds[i];
        self.meds.push(new drug(aMed.RX_Sig, aMed));
      }
    });
  }

  attached(){
    let self = this;

    self.event.subscribe('savePatientHistory', function(){
      self.save();
    });

    self.load();

    $("#demotop").on('click', function(e){
        if(self.searchVisible &&
          (e.target.parentElement.id != 'algpicker' &&
            e.target.parentElement.id != 'medpicker')){
          self.hideSearchResult();
        }
    });
  }

  detached(){
    if(this.saveAlgMed == true){// && !this.parent.hasSaved){
      this.save();
    }
  }

  noKnowDrugAllergiesChecked(checked){
    //this.noKnownDrugAllergiesCheckbox.selected = checked ? false : true;
    //var chk = checked;
    for(var i = 0; i < this.allergies.length; i++){
      this.deleteAllergy(this.allergies[i]);
    }

    if(checked){
      //update DrFirst NKDA...
      var patId = this.parent.demographics.patient.data.PatientID;
      var url = `drfirst/patient/allergies/nkda?patientId=${patId}`;
      this.data.getWithUrl(url, function(res){

      });
    }
  }

  noCurrentMedsChecked(checked){
    var chk = checked;
  }

  checkForNoKnowDrugAllergies(allergy){
    if((allergy.Substance.toUpperCase() == 'NKDA' || 
        allergy.Substance.toUpperCase() == 'NO KNOWN DRUG ALLERGIES') &&
        (allergy.Status.toUpperCase() == 'A' || 
        allergy.Status.toUpperCase() == 'ACTIVE')){
          return true;
        }else{
          return false;
        }
  }

  getNewRx(patientId, ndc, sig){
    return {
      'RXPatientID':0,
      'RX_Description':ndc,
      'RX_Sig':sig,
      'RX_Status':'E',
      'RX_Date':moment().format("MM-DD-YYYY"),
      'PatientID':patientId,
      'ProviderID':null,
      'UserID':"",
      'OD_RX_Drugs':{
        'NDC': ndc
      }
    }
  }

  getNewAllergy(patientId, substance, ndc){
    return {
      'AllergyID':0,
      'Substance':substance,
      'Reaction':"",
      'Description':ndc ? ndc : 'none',
      'Status':'A',
      'PatientID':patientId,
      'ExamDateTime':moment().format("MM-DD-YYYY")
    }
  }

  save(){
    let self = this;

    //ALLERGIES....
    let algsToSave={
      Allergies:[]
    }
    let algsToUpdate={
      Allergies:[]
    }
    //put objects into lists for saving OR updating for deletes...
    for(let i = 0; i < self.allergies.length; i++){
      let alg = self.allergies[i];
      if(alg.data.AllergyID == 0){
        algsToSave.Allergies.push(alg.data);
      }else{// if(alg.data.Status == 'D'){
        algsToUpdate.Allergies.push(alg.data);
      }
    }

    if(algsToSave.Allergies.length > 0){
      self.data.savePatientAllergies(algsToSave, function(res){

        //update ids...
        for(let r = 0; r < res.length; r++){
          var algToMatch = res[r];
          for(let m = 0; m < self.allergies.length; m++){
            //find allergy to match...
            var alg = self.allergies[m];
            if(alg.data.Substance == algToMatch.Substance &&
              alg.data.Description == algToMatch.Description){
              //found it! update AllergyID so we dont re-create it...
              alg.data.AllergyID = algToMatch.AllergyID;
              break;
            }
          }
        }

        //send to drfirst...
        var algData = JSON.stringify(res);
        self.data.postWithUrlAndData('drfirst/patient/allergies', algData, function(res){
          var r = res;
        });


      });
    }
    if(algsToUpdate.Allergies.length > 0){
      self.data.updatePatientAllergies(algsToUpdate, function(res){

        //send to drfirst...
        var algData = JSON.stringify(res);
        self.data.postWithUrlAndData('drfirst/patient/allergies', algData, function(res){
          var r = res;
        });

      });
    }


    //MEDICATIONS...
    let medsToSave={
      Rxs:[]
    }
    let medsToUpdate={
      Rxs:[]
    }
    //put objects into lists for saving OR updating for deletes...
    for(let i = 0; i < self.meds.length; i++){
      let m = self.meds[i];
      if(m.data.RXPatientID == 0){
        m.data.OD_RX_Drugs={};
        medsToSave.Rxs.push(m.data);
      }else{// if(m.data.RX_Status == 'D'){
        m.data.OD_RX_Drugs= { NDC: m.data.RX_Description};
        medsToUpdate.Rxs.push(m.data);
      }
    }

    if(medsToSave.Rxs.length > 0){
      self.data.savePatientMeds(medsToSave, function(res){
        //update ids...
        for(let r = 0; r < res.length; r++){
          var rxToMatch = res[r];
          for(let m = 0; m < self.meds.length; m++){
            //find med to match...
            var medToMatch = self.meds[m];
            if(medToMatch.data.RX_Description == rxToMatch.RX_Description &&
              medToMatch.data.RX_Sig == rxToMatch.RX_Sig){
              //found it! update RxPatientID so we dont re-create it...
              medToMatch.data.RXPatientID = rxToMatch.RXPatientID;
              break;
            }
          }
        }

      });
    }
    if(medsToUpdate.Rxs.length > 0){
      self.data.updatePatientMeds(medsToUpdate, function(res){

      });
    }

  }

  hideSearchResult(){
    this.medSearchResult=[];
    this.allergySearchResult=[];
    this.searchVisible = false;
  }

  deleteAllergy(a){
    let self = this;
    for(let i = 0; i < self.allergies.length; i++){
      if(self.allergies[i].name == a.name){
        self.allergies[i].data.Status = 'D';
        self.allergies[i].visible = false;
      }
    }
  }

  allergyResultClick(a){
    let self = this;
    self.allergySearchResult=[];
    self.allergySearch=null;
    self.searchVisible = false;

    let newAlg = self.getNewAllergy(self.parent.demographics.patient.data.PatientID, a.BN, a.NDC);

    self.allergies.push(new drug(a.BN, newAlg));
  }

  searchAllergies(){
    let self = this;
    self.data.searchDrugs(self.allergySearch, function (res) {
      self.allergySearchResult =  _.uniqBy(res, 'BN');
      self.searchVisible = true;
    });
  }



  deleteMed(a){
    let self = this;
    for(let i = 0; i < self.meds.length; i++){
      if(self.meds[i].name == a.name){
        self.meds[i].data.RX_Status = 'D';
        self.meds[i].visible = false;
      }
    }
  }

  medResultClick(a){
    let self = this;
    self.medSearchResult=[];
    self.medSearch=null;
    self.searchVisible = false;

    let newMed = self.getNewRx(self.parent.demographics.patient.data.PatientID, a.NDC, a.LN);
    //try getting providerId
    if(self.parent.home.currentBoard.visitInfo){
      newMed.ProviderID = self.parent.home.currentBoard.visitInfo.providerId;
    }else if(self.parent.home.currentProvider){
      newMed.ProviderID = self.parent.home.currentProvider.ProviderID;
    }
    newMed.UserID=self.parent.helper._user.UserID;

    self.meds.push(new drug(a.LN, newMed));
  }

  searchMeds() {
    let self = this;
    self.data.searchDrugs(self.medSearch, function (res) {
      self.medSearchResult = res;
      self.searchVisible = true;
    });
  }


}
