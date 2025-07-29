import {inject, computedFrom} from 'aurelia-framework';
import {http} from '../helpers/http';
import {helper} from '../helpers/helper';
import * as _ from 'lodash';
import {Data} from '../data/go/data';
import {DialogController} from 'aurelia-dialog';


class ListObject{
  constructor(description, data){
    this.description=description;
    this.data = data;
  }
}

@inject(http, helper, Data, DialogController)
export class PatientDetails {

  home;

  scrollHeight;
  // displayDemographicsTitle=true;
  // addPadding=false;
  displayInPopup = false;
  create=false;


  selectedGenderID;
  selectedSexualPref;
  selectedEthnicity;
  selectedRace;
  selectedLanguage;
  referringProvider;
  primaryCareProvider;

  disableDemographics;

  muDemographics;

  patient=null;
  sexList=['M','F','UNK'];
  marriedList=['Married','Single','Divorced','Separated','Widowed'];
  stateList=['AK', 'AL', 'AR', 'AS', 'AZ', 'CA', 'CO', 'CT', 'DC', 'DE', 'FL', 'GA', 'GU', 'HI', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'LA', 'MA', 'MD', 'ME', 'MI', 'MN', 'MO', 'MP', 'MS', 'MT', 'NC', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NV', 'NY', 'OH', 'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UM', 'UT', 'VA', 'VI', 'VT', 'WA', 'WI', 'WV', 'WY'];
  providerList=[];
  languages=[];
  races=[];
  ethnicities=[];
  sexPrefs=[];
  genderIds=[];

  @computedFrom('patient.data.NameLast', 'patient.data.NameFirst')
  get canSave(){
    if(this.patient.data.NameLast != null && this.patient.data.NameLast.length > 0 &&
      this.patient.data.NameFirst != null && this.patient.data.NameFirst.length > 0){
        return true;
      }else{
        return false;
      }
  }


  constructor(http, helper, Data, DialogController){
    this.http = http;
    this.helper = helper;
    this.data = Data;
    this.dialogController = DialogController;
  }

  detached(){
    this.saveDemographics();
  }

  close(){
    this.dialogController.close();
  }

  activate(params){
    let self = this;

    self.home = params.home;
    self.scrollHeight = params.scrollHeight;
    self.disableDemographics = params.disableDemographics;

    if(params.patient && params.patient.data){

      //change DOB format...
      var dateSplit = params.patient.data.DOB.split('/');
      var dateYYYYMMDD = dateSplit[2] + "-" + dateSplit[0] + "-" + dateSplit[1]
      params.patient.data.DOB = dateYYYYMMDD;

      self.patient = params.patient;
    }else{
      //for creating new patients...
      self.patient = { "data": params.patient };
      self.create = true;
    }


    self.displayInPopup = params.displayInPopup;

    if(self.patient.data && self.patient.data.Json){
      let json = JSON.parse(self.patient.data.Json);
      if(json.hasOwnProperty('MuDemographics')){
        self.muDemographics = json.MuDemographics;
      }
    }

    self.loadProviderListAndSelectProviders();

    this.loadSexualPrefGenderIdentityLanguagesRaceEthnicity();

    //self.sendPatientToDrFirst(self.patient.data.PatientID);

  }

  // sendPatientToDrFirst(patientId){
  //   let self = this;
  //   if(self.home.erxEnabled){
  //     self.data.getWithUrl(`drfirst/patient?patientId=${patientId}`, function(res){
  //       var pat = res;
  //     });
  //   }
  // }

  loadProviderListAndSelectProviders(){
    let self = this;
    let refUrl = 'referring/all';
    self.data.getWithUrl(refUrl, function(res){
      self.providerList = res;
      //select referring / pcp...

      self.referringProvider = _.find(self.providerList, function(p){return p.ReferringID == self.patient.data.RefPhysID});
      self.primaryCareProvider = _.find(self.providerList, function(p){return p.ReferringID == self.patient.data.PCPID});
    });
  }

  loadSexualPrefGenderIdentityLanguagesRaceEthnicity(){
    let self = this;

    self.data.getLists(['SexPref', 'GenderID'], function(res){

      let sexes = _.filter(res, function(s){return s.ListType == 'SexPref'});
      let genders = _.filter(res, function(s){return s.ListType == 'GenderID'});
      for(let i = 0; i< sexes.length; i++){
        let r = new ListObject(sexes[i].Description1, sexes[i]);
        self.sexPrefs.push(r);
        if(self.muDemographics){
          if(self.muDemographics.hasOwnProperty('SexualPreference')){
            if(sexes[i].Description1 == self.muDemographics.SexualPreference){
              self.selectedSexualPref = r;
            }
          }
        }
      }

      for(let i = 0; i< genders.length; i++){
        let r = new ListObject(genders[i].Description1, genders[i]);
        self.genderIds.push(r);
        if(self.muDemographics){
          if(self.muDemographics.hasOwnProperty('GenderIdentity')){
            //get first from list...
            if(self.muDemographics.GenderIdentity.length > 0){
              if(genders[i].Description1 == self.muDemographics.GenderIdentity[0]){
                self.selectedGenderID = r;
              }
            }
          }
        }
      }

    });


    self.data.getWithUrl('race', function(res){
      //self.races = res;

      res = _.uniqBy(res,'RollUpName');

      //res = _.orderBy(res, 'RaceName');

      for(let i = 0; i< res.length; i++){
        // let r = new ListObject(res[i].RaceName, res[i]);
        // self.races.push(r);
        // if(res[i].RaceID == self.patient.data.RaceID){
        //   self.selectedRace = r;
        // }

        let r = new ListObject(res[i].RollUpName, res[i]);
        self.races.push(r);
        if(res[i].RollUpID == self.patient.data.RaceRollUpID){
          self.selectedRace = r;
        }
      }
    });
    self.data.getWithUrl('ethnicity', function(res){

      res = _.filter(res, function(r){return r.Category == null})
      res = _.orderBy(res, 'Description');

      for(let i = 0; i< res.length; i++){
        let r = new ListObject(res[i].Description, res[i]);
        self.ethnicities.push(r);
        if(res[i].Code == self.patient.data.EthnicityRollUpID){
          self.selectedEthnicity = r;
        }
      }
    });

    if(self.home && self.home.currentProvider != null){
      self.data.getListWithProviderId('Language',self.home.currentProvider.ProviderID, function(res){
        for(let i = 0; i< res.length; i++){
          let lang = new ListObject(res[i].Description1, res[i]);
          self.languages.push(lang);
          //check patient language...
          if(res[i].Description2 == self.patient.data.Language){
            self.selectedLanguage = lang;
          }
        }
      });
    }
  }


  saveDemographics(){

    if(this.selectedLanguage)
      this.patient.data.Language=this.selectedLanguage.data.Description2;
    if(this.selectedRace){
      this.patient.data.Race = this.selectedRace.data.RaceName;
      this.patient.data.RaceID=this.selectedRace.data.RaceID;
      this.patient.data.RaceRollUpID=this.selectedRace.data.RollUpID;
    }
    if(this.selectedEthnicity){
      this.patient.data.Ethnicity = this.selectedEthnicity.data.Description;
      this.patient.data.EthnicityID=this.selectedEthnicity.data.Category;
      this.patient.data.EthnicityRollUpID=this.selectedEthnicity.data.Code;
    }
    if(this.selectedGenderID){
      this.muDemographics['GenderIdentity']=[this.selectedGenderID.description];
    }
    if(this.selectedSexualPref){
      this.muDemographics['SexualPreference']=this.selectedSexualPref.description;
    }
    this.patient.data.Json=JSON.stringify(this.muDemographics);

    //referring provider
    if(this.referringProvider){
      this.patient.data.RefPhysID = this.referringProvider.ReferringID;
    }

    //pcp provider...
    if(this.primaryCareProvider){
      this.patient.data.PCPID = this.primaryCareProvider.ReferringID;
    }

    // let saveDescription = `Deleting ${self.selectedList.name}...`;
    // let saveDialog = self.helper.createNoty(saveDescription, 3000);
    // saveDialog.show();

    //change DOB format...
    var dateSplit = this.patient.data.DOB.split('-');
    var dateMMDDYYYY =  dateSplit[1] + "/" + dateSplit[2] + "/" + dateSplit[0];
    this.patient.data.DOB = dateMMDDYYYY;

    let self = this;

    if(!this.create){
      let saveDialog = self.helper.createNoty("Saving patient", 3000);
      saveDialog.show();
      this.data.updatePatient(this.patient.data, function(res){
        self.helper.updateNoty(saveDialog, "Patient updated!", "success", 1000);
      });
    }else{
      let saveDialog = self.helper.createNoty("Creating patient", 3000);
      saveDialog.show();
      this.data.createPatient(this.patient.data, function(res){
        self.patient.data = res;
        self.create = false;
        self.helper.updateNoty(saveDialog, "Patient created!", "success", 1000);
        self.dialogController.close(true, self.patient.data);
      });
    }
  }

}
